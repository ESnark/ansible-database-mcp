import { Request } from 'express';
import jwt, { Algorithm } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthStrategy } from './auth-strategy.interface.js';
import { AuthResult, AuthConfig, OpenIdConfig } from '../types.js';
// Removed ProxyOAuthServerProvider and mcpAuthRouter imports - resource server doesn't need them

/**
 * OAuth 2.1 JWT authentication strategy
 */
export class OAuthStrategy implements AuthStrategy {
  private static readonly CONFIG_URL = '/.well-known/openid-configuration';
  private issuer: string;
  private audience: string;
  readonly jwksUri: string;
  private algorithms: Algorithm[];
  private jwksClient: jwksClient.JwksClient;
  private metadata: OpenIdConfig;

  static async create(config: AuthConfig): Promise<OAuthStrategy> {
    if (!config.oauth?.issuer || !config.oauth?.audience) {
      throw new Error('OAuth issuer and audience are required');
    }

    let metadata: OpenIdConfig;

    const configUrl = config.oauth.issuerPrivate
      ? `${config.oauth.issuerPrivate}${OAuthStrategy.CONFIG_URL}`
      : `${config.oauth.issuer}${OAuthStrategy.CONFIG_URL}`;

    const r = await fetch(configUrl).then(res => res.json());

    if (typeof r === 'object' && r !== null &&
      'authorization_endpoint' in r && typeof r.authorization_endpoint === 'string' &&
      'token_endpoint' in r && typeof r.token_endpoint === 'string' &&
      'userinfo_endpoint' in r && typeof r.userinfo_endpoint === 'string' &&
      'jwks_uri' in r && typeof r.jwks_uri === 'string' &&
      'introspection_endpoint' in r && typeof r.introspection_endpoint === 'string' &&
      'registration_endpoint' in r && typeof r.registration_endpoint === 'string' &&
      'revocation_endpoint' in r && typeof r.revocation_endpoint === 'string' &&
      'response_types_supported' in r && Array.isArray(r.response_types_supported) && r.response_types_supported.every(v => typeof v === 'string') &&
      'code_challenge_methods_supported' in r && Array.isArray(r.code_challenge_methods_supported) && r.code_challenge_methods_supported.every(v => typeof v === 'string') &&
      'token_endpoint_auth_methods_supported' in r && Array.isArray(r.token_endpoint_auth_methods_supported) && r.token_endpoint_auth_methods_supported.every(v => typeof v === 'string') &&
      'grant_types_supported' in r && Array.isArray(r.grant_types_supported) && r.grant_types_supported.every(v => typeof v === 'string') &&
      'id_token_signing_alg_values_supported' in r && Array.isArray(r.id_token_signing_alg_values_supported) && r.id_token_signing_alg_values_supported.every(v => typeof v === 'string')
    ) {
      metadata = {
        issuer: config.oauth.issuer,
        authorization_endpoint: r.authorization_endpoint,
        token_endpoint: r.token_endpoint,
        userinfo_endpoint: r.userinfo_endpoint,
        jwks_uri: r.jwks_uri,
        introspection_endpoint: r.introspection_endpoint,
        registration_endpoint: r.registration_endpoint,
        revocation_endpoint: r.revocation_endpoint,
        response_types_supported: r.response_types_supported,
        code_challenge_methods_supported: r.code_challenge_methods_supported,
        token_endpoint_auth_methods_supported: r.token_endpoint_auth_methods_supported,
        grant_types_supported: r.grant_types_supported,
        id_token_signing_alg_values_supported: r.id_token_signing_alg_values_supported
      }
    } else {
      throw new Error('Invalid OAuth configuration: ' + JSON.stringify(r))
    }

    return new OAuthStrategy({
      bearer: config.bearer,
      type: config.type,
      oauth: {
        ...config.oauth,
        jwksUri: metadata.jwks_uri as string,
      }
    }, metadata);
  }

  private constructor(private config: AuthConfig, private oauthMetadata: OpenIdConfig) {
    if (!config.oauth?.issuer || !config.oauth?.audience || !config.oauth.jwksUri) {
      throw new Error('OAuth issuer and audience are required');
    }

    this.issuer = config.oauth.issuer;
    this.audience = config.oauth.audience;
    this.jwksUri = config.oauth.jwksUri;
    this.algorithms = (config.oauth.algorithms || ['RS256', 'RS384', 'RS512']) as Algorithm[];
    this.metadata = oauthMetadata;


    this.jwksClient = jwksClient({
      jwksUri: config.oauth.jwksUri,
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