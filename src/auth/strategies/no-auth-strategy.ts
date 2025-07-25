import { Request } from 'express';
import { AuthStrategy } from './auth-strategy.interface.js';
import { AuthResult } from '../types.js';

/**
 * No authentication strategy - allows all requests
 */
export class NoAuthStrategy implements AuthStrategy {
  async authenticate(_req: Request): Promise<AuthResult> {
    return {
      authenticated: true,
      user: {
        id: 'anonymous'
      }
    };
  }

  validateConfig(): void {
    // No configuration needed for no-auth
  }

  getName(): string {
    return 'none';
  }
}