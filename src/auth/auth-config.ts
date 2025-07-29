import { AuthConfig } from './types.js';

/**
 * Load authentication configuration from environment variables
 */
export function loadAuthConfig(): AuthConfig {
  const authType = process.env.AUTH_TYPE?.toLowerCase();

  if (authType === 'bearer') {
    return {
      type: 'bearer',
      bearer: {
        token: process.env.BEARER_TOKEN || ''
      }
    };
  }

  if (authType === 'oauth') {
    return {
      type: 'oauth',
      oauth: {
        issuer: process.env.OAUTH_ISSUER || '',
        issuerPrivate: process.env.OAUTH_ISSUER_PRIVATE,
        audience: process.env.OAUTH_AUDIENCE || '',
        jwksUri: process.env.OAUTH_JWKS_URI,
        algorithms: process.env.OAUTH_ALGORITHMS?.split(',')
      }
    };
  }

  // Default to no authentication
  return { type: 'none' };
}