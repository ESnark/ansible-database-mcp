import { Request } from 'express';
import jwt, { Algorithm } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthStrategy } from './auth-strategy.interface.js';
import { AuthResult, AuthConfig } from '../types.js';

/**
 * OAuth 2.1 JWT authentication strategy
 */
export class OAuthStrategy implements AuthStrategy {
  private issuer: string;
  private audience: string;
  private jwksUri: string;
  private algorithms: Algorithm[];
  private jwksClient: jwksClient.JwksClient;

  constructor(private config: AuthConfig) {
    if (!config.oauth?.issuer || !config.oauth?.audience) {
      throw new Error('OAuth issuer and audience are required');
    }

    this.issuer = config.oauth.issuer;
    this.audience = config.oauth.audience;
    this.jwksUri = config.oauth.jwksUri || `${this.issuer}/.well-known/jwks.json`;
    this.algorithms = (config.oauth.algorithms || ['RS256', 'RS384', 'RS512']) as Algorithm[];

    // Initialize JWKS client
    this.jwksClient = jwksClient({
      jwksUri: this.jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000 // 10 minutes
    });
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

    try {
      // Decode token to get kid (key id)
      const decodedToken = jwt.decode(token, { complete: true });
      if (!decodedToken || typeof decodedToken === 'string') {
        return {
          authenticated: false,
          error: 'Invalid token format'
        };
      }

      // Get signing key from JWKS
      const key = await this.getSigningKey(decodedToken.header.kid);

      // Verify token
      const payload = jwt.verify(token, key, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: this.algorithms
      }) as jwt.JwtPayload;

      // Extract scopes if available
      const scopes = this.extractScopes(payload);

      return {
        authenticated: true,
        user: {
          id: payload.sub || 'oauth-user',
          token: token,
          scopes: scopes
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
      return {
        authenticated: false,
        error: errorMessage
      };
    }
  }

  private async getSigningKey(kid?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
        } else if (key) {
          const signingKey = 'publicKey' in key ? key.publicKey : key.rsaPublicKey;
          resolve(signingKey);
        } else {
          reject(new Error('No signing key found'));
        }
      });
    });
  }

  private extractScopes(payload: jwt.JwtPayload): string[] {
    // Common locations for scopes in JWT
    const scopeValue = payload.scope || payload.scopes || payload.permissions || '';
    
    if (Array.isArray(scopeValue)) {
      return scopeValue;
    }
    
    if (typeof scopeValue === 'string' && scopeValue) {
      return scopeValue.split(' ');
    }
    
    return [];
  }

  validateConfig(): void {
    if (!this.config.oauth?.issuer) {
      throw new Error('OAUTH_ISSUER environment variable is required when AUTH_TYPE=oauth');
    }

    if (!this.config.oauth?.audience) {
      throw new Error('OAUTH_AUDIENCE environment variable is required when AUTH_TYPE=oauth');
    }

    // Validate issuer URL format
    try {
      new URL(this.issuer);
    } catch {
      throw new Error('OAUTH_ISSUER must be a valid URL');
    }
  }

  getName(): string {
    return 'oauth';
  }
}