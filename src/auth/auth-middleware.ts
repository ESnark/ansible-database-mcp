import { Request, Response, NextFunction } from 'express';
import { AuthFactory } from './auth-factory.js';
import { loadAuthConfig } from './auth-config.js';
import { AuthStrategy } from './strategies/auth-strategy.interface.js';
import { AuthenticatedRequest } from './types.js';
import { OAuthStrategy } from './strategies/oauth-strategy.js';

// Singleton auth strategy instance
let authStrategy: AuthStrategy | null = null;

/**
 * Initialize authentication strategy
 * Should be called once during server startup
 */
export async function initializeAuth(): Promise<AuthStrategy> {
  const config = loadAuthConfig();
  authStrategy = await AuthFactory.create(config);
  
  // Validate configuration
  authStrategy.validateConfig();
  
  console.log(`Authentication initialized: ${authStrategy.getName()}`);

  return authStrategy
}

/**
 * Authentication middleware
 * Authenticates requests based on configured strategy
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!authStrategy) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Authentication not initialized'
      },
      id: null
    });
    return;
  }

  try {
    const result = await authStrategy.authenticate(req);

    if (!result.authenticated) {
      // Add WWW-Authenticate header for OAuth
      if (authStrategy.getName() === 'oauth') {
        const resourceMetadataUrl = `${req.protocol}://${req.get('host')}/.well-known/oauth-protected-resource`;
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${resourceMetadataUrl}"`);
      }
      
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: result.error || 'Unauthorized'
        },
        id: null
      });
      return;
    }

    // Attach auth info to request
    (req as AuthenticatedRequest).auth = {
      user: result.user
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Authentication error'
      },
      id: null
    });
  }
}

/**
 * Get current authentication strategy name
 */
export function getAuthStrategyName(): string {
  return authStrategy?.getName() || 'none';
}

export function isOAuthStrategy(strategy: AuthStrategy): strategy is OAuthStrategy {
  return strategy.getName() === 'oauth'
}