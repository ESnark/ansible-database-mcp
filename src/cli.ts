#!/usr/bin/env node
/**
 * CLI entry point for npx execution
 * Parses command line arguments and sets environment variables
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CliOptions {
  config?: string;
  context?: string;
  guide?: string;
  port?: string;
  help?: boolean;
  version?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      
      case '-v':
      case '--version':
        options.version = true;
        break;
      
      case '-c':
      case '--config':
        if (i + 1 < args.length) {
          options.config = args[++i];
        }
        break;
      
      case '--context':
        if (i + 1 < args.length) {
          options.context = args[++i];
        }
        break;
      
      case '--guide':
        if (i + 1 < args.length) {
          options.guide = args[++i];
        }
        break;
      
      case '-p':
      case '--port':
        if (i + 1 < args.length) {
          options.port = args[++i];
        }
        break;
      
      default:
        if (arg && arg.startsWith('--config=')) {
          options.config = arg.split('=')[1];
        } else if (arg && arg.startsWith('--context=')) {
          options.context = arg.split('=')[1];
        } else if (arg && arg.startsWith('--guide=')) {
          options.guide = arg.split('=')[1];
        } else if (arg && arg.startsWith('--port=')) {
          options.port = arg.split('=')[1];
        }
    }
  }
  
  return options;
}

function showHelp(): void {
  console.log(`
Ansible Database MCP Server
Safe & Fast human language queries with write permission protection

Usage: npx ansible-database-mcp [options]

Options:
  -h, --help              Show this help message
  -v, --version           Show version information
  -c, --config <file>     Path to env.yml configuration file
  --context <file>        Path to context.md file for database context
  --guide <file>          Path to guide.md file for query guidance
  -p, --port <port>       Port to run the server on (default: 3000)

Examples:
  # Run with default configuration
  npx ansible-database-mcp

  # Run with custom config file
  npx ansible-database-mcp --config ./my-env.yml

  # Run with custom config and context
  npx ansible-database-mcp --config ./my-env.yml --context ./my-context.md

  # Run on different port
  npx ansible-database-mcp --port 3001

Environment Variables:
  CONFIG_FILE             Path to configuration file (same as --config)
  CONTEXT_FILE            Path to context file (same as --context)
  GUIDE_FILE              Path to guide file (same as --guide)
  PORT                    Server port (same as --port)
`);
}

function showVersion(): void {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    console.log(`ansible-database-mcp v${packageJson.version}`);
  } catch {
    console.log('ansible-database-mcp');
  }
}

function main(): void {
  const options = parseArgs(process.argv);
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (options.version) {
    showVersion();
    process.exit(0);
  }
  
  // Set environment variables from CLI options
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(([_, value]) => value !== undefined)
  ) as Record<string, string>;
  
  if (options.config) {
    env.CONFIG_FILE = options.config;
  }
  
  if (options.context) {
    env.CONTEXT_FILE = options.context;
  }
  
  if (options.guide) {
    env.GUIDE_FILE = options.guide;
  }
  
  if (options.port) {
    env.PORT = options.port;
  }
  
  // Determine the main.js path
  const mainPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, 'main.ts')
    : path.join(__dirname, 'main.js');
  
  console.log('Starting Ansible Database MCP Server...');
  
  // Spawn the main process with environment variables
  const command = process.env.NODE_ENV === 'development' ? 'tsx' : 'node';
  const child = spawn(command, [mainPath], {
    env,
    stdio: 'inherit'
  });
  
  child.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

main();