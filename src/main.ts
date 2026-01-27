import express from 'express';
import cors from 'cors';
import { mcpMiddleware } from './middleware.js';
import { Request, Response } from 'express';
import environment from './config/environment.js';
import { initializeAuth, authMiddleware, getAuthStrategyName } from './auth/index.js';
import { isOAuthStrategy } from './auth/auth-middleware.js';
import { offHoursMiddleware, logOffHoursConfig } from './middleware/index.js';

// Initialize environment configuration
await environment.load();

// Initialize authentication
const authStrategy = await initializeAuth();

const app = express();
const PORT = process.env.PORT || 3000;

// JSON parsing middleware with error handling
app.use(express.json({ limit: '10mb' }));

// JSON parsing error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32700, // Parse error in JSON-RPC
        message: 'Invalid JSON syntax: ' + err.message
      },
      id: null
    });
    return;
  }
  next(err);
});

// CORS middleware
app.use(cors({
  origin: "*",
  credentials: false,
}))

// Off-hours middleware - blocks all requests during configured off-hours
app.use(offHoursMiddleware);

// MCP endpoint at /mcp
app.post('/mcp', authMiddleware, mcpMiddleware);

// Primary endpoint at / for backward compatibility
app.post('/', authMiddleware, mcpMiddleware);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'ansible-database',
    version: '1.0.0',
    auth: getAuthStrategyName(),
    endpoints: {
      primary: '/',
      mcp: '/mcp'
    }
  });
});


// HEAD request handling for MCP endpoint
if (authStrategy.getName() === 'none') {
  app.head('/mcp', (_req, res) => {
    res.sendStatus(200);
  });
  // Legacy support
  app.head('/', (_req, res) => {
    res.sendStatus(200);
  });
}
// OAuth endpoints for resource server
if (isOAuthStrategy(authStrategy)) {
  const oauthIssuer = process.env.OAUTH_ISSUER!;
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  
  app.head('/mcp', (_req, res) => {
    res.status(401)
        .set('WWW-Authenticate', `Bearer realm="Ansible Database MCP", error="invalid_token", resource_metadata="${publicUrl}/.well-known/oauth-protected-resource"`)
        .end();
  });
  
  // Legacy support
  app.head('/', (_req, res) => {
    res.status(401)
        .set('WWW-Authenticate', `Bearer realm="Ansible Database MCP", error="invalid_token", resource_metadata="${publicUrl}/.well-known/oauth-protected-resource"`)
        .end();
  });

  // Resource server metadata endpoint (RFC 8414)
  app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    res.json({
      resource: publicUrl,
      authorization_servers: [oauthIssuer],
      scopes_supported: ['read', 'write'],
      bearer_methods_supported: ['header'],
      resource_documentation: 'https://github.com/ansible/ansible-database-mcp',
    });
  });
}

// Handle GET requests to MCP endpoint - delegate to SDK for SSE support
app.get('/mcp', authMiddleware, mcpMiddleware);

// Primary GET endpoint at / for backward compatibility
app.get('/', authMiddleware, mcpMiddleware);

// Handle DELETE requests to MCP endpoint
app.delete('/mcp', async (_req: Request, res: Response) => {
  console.log('Received DELETE /mcp request');
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  });
});

// Legacy DELETE endpoint
app.delete('/', async (_req: Request, res: Response) => {
  console.log('Received DELETE / request');
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  });
});

// Start server
const server = app.listen(PORT, () => {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  console.log(`\n🚀 MCP server started!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔐 Authentication: ${getAuthStrategyName()}`);
  logOffHoursConfig();
  console.log(`🔗 MCP endpoint: ${publicUrl}/mcp`);
  console.log(`🔗 Primary endpoint: ${publicUrl}/`);
  console.log(`💚 Health check: ${publicUrl}/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('\n📴 SIGTERM signal received, shutting down server...');

  server.close(() => {
    console.log('✅ Server shut down successfully.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 SIGINT signal received, shutting down server...');

  server.close(() => {
    console.log('✅ Server shut down successfully.');
    process.exit(0);
  });
});