import express from 'express';
import cors from 'cors';
import { mcpMiddleware } from './middleware.js';
import { Request, Response } from 'express';
import environment from '@/config/environment.js';

// Initialize environment configuration
await environment.load();

const app = express();
const PORT = process.env.PORT || 3000;

// JSON parsing middleware
app.use(express.json());

// CORS middleware
app.use(cors({
  origin: "*",
  credentials: false,
}))



app.post('/mcp', mcpMiddleware);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'ansible-database',
    version: '1.0.0',
  });
});

app.get('/mcp', async (_req: Request, res: Response) => {
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

app.delete('/mcp', async (_req: Request, res: Response) => {
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
  console.log(`\n🚀 MCP server started!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
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