import { Request } from 'express';

/**
 * Authentication result returned by strategies
 */
export interface AuthResult {
  authenticated: boolean;
  user?: {
    id?: string;
    token?: string;
    scopes?: string[];
  };
  error?: string;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  type: 'none' | 'bearer' | 'oauth';
  bearer?: {
    token: string;
  };
  oauth?: {
    issuer: string;
    audience: string;
    jwksUri?: string;
    algorithms?: string[];
  };
}

/**
 * Extended Request with auth information
 */
export interface AuthenticatedRequest extends Request {
  auth?: {
    user?: AuthResult['user'];
  };
}