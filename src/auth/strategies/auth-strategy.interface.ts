import { Request } from 'express';
import { AuthResult, AuthConfig } from '../types.js';

/**
 * Base interface for all authentication strategies
 */
export interface AuthStrategy {
  /**
   * Authenticate a request
   * @param req Express request object
   * @returns Authentication result
   */
  authenticate(req: Request): Promise<AuthResult>;

  /**
   * Validate configuration for the strategy
   * @throws Error if configuration is invalid
   */
  validateConfig(): void;

  /**
   * Get the strategy name
   */
  getName(): 'none' | 'bearer' | 'oauth';
}