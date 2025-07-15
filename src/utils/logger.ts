/**
 * Logging utility
 */
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';

// Log directory
const LOG_DIR = path.join(process.cwd(), 'logs');

// Create log directory
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file paths
const errorLogPath = path.join(LOG_DIR, 'error.log');
const queryLogPath = path.join(LOG_DIR, 'query.log');

/**
 * Write error log
 */
export function logError(message: string, error?: Error | any): void {
  const timestamp = new Date().toISOString();
  const errorStack = error && error.stack ? error.stack : '';
  const errorMessage = error && error.message ? error.message : '';
  const logMessage = `[${timestamp}] ERROR: ${message} - ${errorMessage}\n${errorStack}\n`;

  // Console output
  console.error(`[ERROR] ${message}`, error);

  // Write to file
  fs.appendFile(errorLogPath, logMessage, (err) => {
    if (err) {
      console.error('Log file write error:', err);
    }
  });
}

/**
 * Write query log
 */
export function logQuery(
  query: string,
  params: any,
  executionTime: number,
  success: boolean,
  error?: string
): void {
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILED';
  const errorMessage = error ? ` - Error: ${error}` : '';

  // Stringify query parameters
  const paramsString = params ? JSON.stringify(params) : '';

  const logMessage = `[${timestamp}] QUERY [${status}] (${executionTime}ms)${errorMessage}\nQuery: ${query}\nParams: ${paramsString}\n\n`;

  // Console output only in development environment
  if (config.nodeEnv === 'development') {
    if (success) {
      console.log(`[QUERY] ${query.substring(0, 100)}${query.length > 100 ? '...' : ''} - ${executionTime}ms`);
    } else {
      console.error(`[QUERY ERROR] ${query.substring(0, 100)}${query.length > 100 ? '...' : ''} - ${error}`);
    }
  }

  // Write to file
  fs.appendFile(queryLogPath, logMessage, (err) => {
    if (err) {
      console.error('Log file write error:', err);
    }
  });
}