import { Request } from 'express';
import { AuthStrategy } from './auth-strategy.interface.js';
import { AuthResult, AuthConfig } from '../types.js';

/**
 * Bearer token authentication strategy
 */
export class BearerTokenStrategy implements AuthStrategy {
  private token: string;

  constructor(private config: AuthConfig) {
    if (!config.bearer?.token) {
      throw new Error('Bearer token is required for bearer authentication');
    }
    this.token = config.bearer.token;
  }

  async authenticate(req: Request): Promise<AuthResult> {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return {
        authenticated: false,
        error: 'No authorization header provided'
      };
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer') {
      return {
        authenticated: false,
        error: 'Invalid authorization scheme. Expected Bearer'
      };
    }

    if (!token) {
      return {
        authenticated: false,
        error: 'No token provided'
      };
    }

    if (token !== this.token) {
      return {
        authenticated: false,
        error: 'Invalid token'
      };
    }

    return {
      authenticated: true,
      user: {
        id: 'bearer-user',
        token: token
      }
    };
  }

  validateConfig(): void {
    if (!this.config.bearer?.token) {
      throw new Error('BEARER_TOKEN environment variable is required when AUTH_TYPE=bearer');
    }

    if (this.config.bearer.token.length < 16) {
      throw new Error('Bearer token must be at least 16 characters long for security');
    }
  }

  getName(): string {
    return 'bearer';
  }
}