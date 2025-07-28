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

export interface OpenIdConfig {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  introspection_endpoint: string;
  registration_endpoint: string;
  revocation_endpoint: string;
  response_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  grant_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
}