import { AuthStrategy } from './strategies/auth-strategy.interface.js';
import { NoAuthStrategy } from './strategies/no-auth-strategy.js';
import { BearerTokenStrategy } from './strategies/bearer-strategy.js';
import { OAuthStrategy } from './strategies/oauth-strategy.js';
import { AuthConfig } from './types.js';

/**
 * Factory for creating authentication strategies
 */
export class AuthFactory {
  /**
   * Create an authentication strategy based on configuration
   * @param config Authentication configuration
   * @returns Authentication strategy instance
   */
  static create(config: AuthConfig): AuthStrategy {
    switch (config.type) {
      case 'none':
        return new NoAuthStrategy();
      
      case 'bearer':
        return new BearerTokenStrategy(config);
      
      case 'oauth':
        return new OAuthStrategy(config);
      
      default:
        throw new Error(`Unknown authentication type: ${(config as any).type}`);
    }
  }
}