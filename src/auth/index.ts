export { authMiddleware, initializeAuth, getAuthStrategyName } from './auth-middleware.js';
export { loadAuthConfig } from './auth-config.js';
export { AuthFactory } from './auth-factory.js';
export type { AuthConfig, AuthResult, AuthenticatedRequest } from './types.js';
export type { AuthStrategy } from './strategies/auth-strategy.interface.js';