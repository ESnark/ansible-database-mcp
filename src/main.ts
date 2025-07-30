import express from 'express';
import cors from 'cors';
import { mcpMiddleware } from './middleware.js';
import { Request, Response } from 'express';
import environment from '@/config/environment.js';
import { initializeAuth, authMiddleware, getAuthStrategyName } from './auth/index.js';
import { isOAuthStrategy } from './auth/auth-middleware.js';

// Initialize environment configuration
await environment.load();

// Initialize authentication
const authStrategy = await initializeAuth();

const app = express();
const PORT = process.env.PORT || 3000;

// JSON parsing middleware
app.use(express.json());

// CORS middleware
app.use(cors({
  origin: "*",
  credentials: false,
}))



// Apply auth middleware to MCP endpoint
app.post('/', authMiddleware, mcpMiddleware);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'ansible-database',
    version: '1.0.0',
    auth: getAuthStrategyName()
  });
});


if (authStrategy.getName() === 'none') {
  app.head('/', (_req, res) => {
    res.sendStatus(200);
  });
}
// OAuth endpoints for resource server
if (isOAuthStrategy(authStrategy)) {
  const oauthIssuer = process.env.OAUTH_ISSUER!;
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  
  app.head('/', (_req, res) => {
    
    res.writeHead(401, {
      'WWW-Authenticate': `Bearer realm="Ansible Database MCP",\n
error="invalid_token", resource_metadata="${publicUrl}/.well-known/oauth-protected-resource"`
    })
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

app.get('/', async (_req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/', async (_req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

// Start server
const server = app.listen(PORT, () => {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  console.log(`\n🚀 MCP server started!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔐 Authentication: ${getAuthStrategyName()}`);
  console.log(`🔗 MCP endpoint: ${publicUrl}`);
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