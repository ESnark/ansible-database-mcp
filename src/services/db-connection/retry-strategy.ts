/**
 * Database connection retry strategy module
 * Implements retry logic for connection errors
 */


// Simple logging functions
function logWarning(message: string): void {
  console.warn(`[WARNING] ${new Date().toISOString()} - ${message}`);
}

function logInfo(message: string): void {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}

function logError(message: string): void {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
}

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: ((error: any, retryCount: number, delay: number) => Promise<void>) | null;
  shouldRetry?: (error: any) => boolean;
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitorInterval?: number;
  halfOpenSuccessThreshold?: number;
  enableMonitoring?: boolean;
}

interface BreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

/**
 * Execute database operation with retry
 * Retry logic using exponential backoff algorithm and jitter
 */
// export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
//   const {
//     maxRetries = 3,
//     baseDelay = 500,
//     maxDelay = 30000,
//     onRetry = null,
//     shouldRetry = errorHelpers.isRetryableError || (() => true)
//   } = options;

//   let retryCount = 0;
//   let lastError: any = null;

//   // Retry loop
//   while (retryCount <= maxRetries) {
//     try {
//       // Execute operation
//       return await operation();
//     } catch (error) {
//       lastError = error;

//       // Propagate error if failed after last retry
//       if (retryCount >= maxRetries) {
//         break;
//       }

//       // Stop immediately if error is not retryable
//       if (!shouldRetry(error)) {
//         const errorMessage = error instanceof Error ? error.message : String(error);
//         logWarning(`Non-retryable database error detected: ${errorMessage}`);
//         break;
//       }

//       // Calculate retry delay
//       const delay = errorHelpers.calculateRetryDelay
//         ? errorHelpers.calculateRetryDelay(retryCount, baseDelay, maxDelay)
//         : Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);

//       // Log retry attempt
//       const errorMessage = error instanceof Error ? error.message : String(error);
//       logInfo(`Retrying database operation (${retryCount + 1}/${maxRetries}), waiting ${delay}ms: ${errorMessage}`);

//       // Execute retry callback
//       if (onRetry && typeof onRetry === 'function') {
//         try {
//           await onRetry(error, retryCount, delay);
//         } catch (callbackError) {
//           const callbackErrorMessage = callbackError instanceof Error ? callbackError.message : String(callbackError);
//           logError(`Error executing retry callback: ${callbackErrorMessage}`);
//         }
//       }

//       // Retry after delay
//       await new Promise(resolve => setTimeout(resolve, delay));

//       retryCount++;
//     }
//   }

//   // Propagate last error if all retries failed
//   throw lastError;
// }

/**
 * Circuit Breaker pattern implementation
 * Temporarily blocks all requests after consecutive errors
 */
export class CircuitBreaker {
  private failureThreshold: number;
  private resetTimeout: number;
  private monitorInterval: number;
  private halfOpenSuccessThreshold: number;
  private resetTimer: NodeJS.Timeout | null;
  private dbBreakers: Map<string, BreakerState>;
  private monitoringTimer: NodeJS.Timeout | null;

  constructor(options: CircuitBreakerOptions = {}) {
    // Configuration
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.monitorInterval = options.monitorInterval || 5000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2;

    // State
    this.resetTimer = null;
    this.monitoringTimer = null;

    // Store state per database
    this.dbBreakers = new Map();

    // Start monitoring
    if (options.enableMonitoring !== false) {
      this.startMonitoring();
    }
  }

  /**
   * Get breaker state for database key
   */
  getBreaker(dbKey: string): BreakerState {
    if (!this.dbBreakers.has(dbKey)) {
      this.dbBreakers.set(dbKey, {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastStateChange: Date.now()
      });
    }

    return this.dbBreakers.get(dbKey)!;
  }

  /**
   * Determine whether operation can be executed
   */
  isAllowed(dbKey: string): boolean {
    const breaker = this.getBreaker(dbKey);

    if (breaker.state === 'OPEN') {
      const now = Date.now();
      const timeInOpen = now - breaker.lastStateChange;

      // Transition to half-open state when block time has elapsed
      if (timeInOpen >= this.resetTimeout) {
        this.halfOpen(dbKey);
        return true;
      }

      return false;
    }

    return true;
  }

  /**
   * Handle operation success
   */
  recordSuccess(dbKey: string): void {
    const breaker = this.getBreaker(dbKey);

    if (breaker.state === 'HALF_OPEN') {
      breaker.successCount++;

      // Return to normal state when success threshold is reached
      if (breaker.successCount >= this.halfOpenSuccessThreshold) {
        this.close(dbKey);
      }
    } else if (breaker.state === 'CLOSED') {
      // Reset failure count in normal state
      breaker.failureCount = 0;
    }
  }

  /**
   * Handle operation failure
   */
  recordFailure(dbKey: string): void {
    const breaker = this.getBreaker(dbKey);
    breaker.lastFailureTime = Date.now();

    if (breaker.state === 'HALF_OPEN') {
      // Block again if failed in half-open state
      this.open(dbKey);
    } else if (breaker.state === 'CLOSED') {
      breaker.failureCount++;

      // Block when failure threshold is exceeded
      if (breaker.failureCount >= this.failureThreshold) {
        this.open(dbKey);
      }
    }
  }

  /**
   * Transition to open (blocked) state
   */
  open(dbKey: string): void {
    const breaker = this.getBreaker(dbKey);

    if (breaker.state !== 'OPEN') {
      logWarning(`Circuit breaker opened (blocking enabled): ${dbKey}`);
      breaker.state = 'OPEN';
      breaker.lastStateChange = Date.now();
      breaker.successCount = 0;
    }
  }

  /**
   * Transition to half-open state
   */
  halfOpen(dbKey: string): void {
    const breaker = this.getBreaker(dbKey);

    if (breaker.state !== 'HALF_OPEN') {
      logInfo(`Circuit breaker entering half-open state: ${dbKey}`);
      breaker.state = 'HALF_OPEN';
      breaker.lastStateChange = Date.now();
      breaker.successCount = 0;
    }
  }

  /**
   * Transition to closed (normal) state
   */
  close(dbKey: string): void {
    const breaker = this.getBreaker(dbKey);

    if (breaker.state !== 'CLOSED') {
      logInfo(`Circuit breaker returning to normal state: ${dbKey}`);
      breaker.state = 'CLOSED';
      breaker.lastStateChange = Date.now();
      breaker.failureCount = 0;
      breaker.successCount = 0;
    }
  }

  /**
   * Reset state
   */
  reset(dbKey?: string): void {
    if (dbKey) {
      this.close(dbKey);
    } else {
      this.dbBreakers.clear();
    }
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.monitoringTimer) return;

    this.monitoringTimer = setInterval(() => {
      const now = Date.now();

      for (const [dbKey, breaker] of this.dbBreakers.entries()) {
        if (breaker.state === 'OPEN') {
          const timeInOpen = now - breaker.lastStateChange;
          if (timeInOpen >= this.resetTimeout) {
            this.halfOpen(dbKey);
          }
        }
      }
    }, this.monitorInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopMonitoring();

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    this.dbBreakers.clear();
  }
}

/**
 * Execute operation with circuit breaker
 */
export async function withCircuitBreaker<T>(
  dbKey: string,
  operation: () => Promise<T>,
  circuitBreaker: CircuitBreaker
): Promise<T> {
  // Check if circuit breaker is in blocked state
  if (!circuitBreaker.isAllowed(dbKey)) {
    throw new Error(`Circuit breaker is in open state (blocked): ${dbKey}`);
  }

  try {
    const result = await operation();

    // Record success on successful operation
    circuitBreaker.recordSuccess(dbKey);

    return result;
  } catch (error) {
    // Record failure on operation failure
    circuitBreaker.recordFailure(dbKey);

    throw error;
  }
}

// Global circuit breaker instance
export const globalCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  monitorInterval: 5000,
  halfOpenSuccessThreshold: 2,
  enableMonitoring: true
});