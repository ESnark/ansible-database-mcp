/**
 * Database timeout management module
 * Various database operation timeout settings and monitoring
 */
import { EventEmitter } from 'events';

// Simple log function implementation
function logInfo(message: string): void {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}



// Basic error classes
export class ConnectionTimeoutError extends Error {
  public readonly timeout: number;
  public readonly details: any;

  constructor(message: string, timeout: number, details?: any) {
    super(message);
    this.name = 'ConnectionTimeoutError';
    this.timeout = timeout;
    this.details = details;
  }
}

export class DatabaseTimeoutError extends Error {
  public readonly timeout: number;
  public readonly details: any;

  constructor(message: string, timeout: number, details?: any) {
    super(message);
    this.name = 'DatabaseTimeoutError';
    this.timeout = timeout;
    this.details = details;
  }
}

type TimeoutType = 'queryExecution' | 'connectionAcquisition' | 'idleConnection' | 'poolCreation' | 'transaction' | 'healthCheck';

interface TimeoutOptions {
  timeoutType?: TimeoutType;
  dbKey?: string | null;
  operationId?: string;
  customTimeout?: number | null;
}

/**
 * Default timeout values (milliseconds)
 */
const DEFAULT_TIMEOUTS: Record<TimeoutType, number> = {
  queryExecution: 30000,
  connectionAcquisition: 5000,
  idleConnection: 60000,
  poolCreation: 10000,
  transaction: 60000,
  healthCheck: 3000
};

/**
 * Database timeout management class
 */
class TimeoutManager extends EventEmitter {
  private timeouts: Record<TimeoutType, number>;
  private activeTimeouts: Map<string, NodeJS.Timeout>;

  constructor() {
    super();
    this.timeouts = { ...DEFAULT_TIMEOUTS };
    this.activeTimeouts = new Map();
  }

  setTimeout(timeoutType: TimeoutType, durationMs: number): void {
    const oldValue = this.timeouts[timeoutType];
    this.timeouts[timeoutType] = durationMs;
    logInfo(`Timeout setting changed: ${timeoutType}, ${oldValue}ms → ${durationMs}ms`);
  }

  getTimeout(timeoutType: TimeoutType): number {
    return this.timeouts[timeoutType] || DEFAULT_TIMEOUTS[timeoutType] || 30000;
  }

  async withTimeout<T>(executionFn: () => Promise<T>, options: TimeoutOptions = {}): Promise<T> {
    const { 
      timeoutType = 'queryExecution', 
      operationId = Date.now().toString(),
      customTimeout = null 
    } = options;
    
    const timeoutMs = customTimeout || this.getTimeout(timeoutType);
    
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(operationId);
        const error = timeoutType === 'connectionAcquisition' 
          ? new ConnectionTimeoutError('Connection acquisition timeout', timeoutMs)
          : new DatabaseTimeoutError(`Operation timeout: ${timeoutType}`, timeoutMs);
        reject(error);
      }, timeoutMs);

      this.activeTimeouts.set(operationId, timeoutId);

      executionFn()
        .then(result => {
          clearTimeout(timeoutId);
          this.activeTimeouts.delete(operationId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          this.activeTimeouts.delete(operationId);
          reject(error);
        });
    });
  }

  destroy(): void {
    for (const timeoutId of this.activeTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
const timeoutManager = new TimeoutManager();

export default timeoutManager; 