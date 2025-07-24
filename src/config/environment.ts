/**
 * Centralized environment configuration module
 * Provides globally accessible configuration object by reading env.yml file
 */
import fs from 'node:fs/promises';
import yaml from 'yaml';
import z from 'zod';
import { Paths } from './paths.js';

// Database configuration schema
const DatabaseConfigSchema = z.object({
  client: z.enum(['mysql2', 'pg', 'sqlite3']),
  connection: z.object({
    host: z.string(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
    port: z.number(),
  }),
  pool: z.object({
    min: z.number().min(1).default(1),
    max: z.number().min(1).default(5),
    idleTimeoutMillis: z.number().min(1000).default(10000),
  }).default({
    min: 1,
    max: 5,
    idleTimeoutMillis: 10000,
  }),
  description: z.optional(z.string()),
});

// Complete environment configuration schema
const EnvironmentConfigSchema = z.record(z.string(), DatabaseConfigSchema);

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

/**
 * Environment configuration management class
 */
class Environment {
  private config: EnvironmentConfig | null = null;
  private configFilePath: string;
  private isLoaded = false;

  constructor() {
    // Use centralized path management
    this.configFilePath = Paths.getConfigPath();
  }

  /**
   * Load environment configuration file
   */
  async load(): Promise<void> {
    if (this.isLoaded) {
      console.log('[Environment] Environment configuration already loaded.');
      return;
    }

    try {
      console.log(`[Environment] Loading environment configuration file: ${this.configFilePath}`);
      
      // Check if file exists
      try {
        await fs.access(this.configFilePath);
      } catch {
        throw new Error(
          `Environment configuration file not found: ${this.configFilePath}\n` +
          `\nSolution:\n` +
          `1. Copy env.example.yml file to env.yml:\n` +
          `   cp env.example.yml env.yml\n` +
          `\n2. Or specify a different file with CONFIG_FILE environment variable:\n` +
          `   CONFIG_FILE=your-config.yml pnpm start`
        );
      }
      
      // Read file
      const rawYaml = await fs.readFile(this.configFilePath, 'utf8');
      
      if (!rawYaml || rawYaml.trim() === '') {
        throw new Error(
          `Environment configuration file is empty: ${this.configFilePath}\n` +
          `\nSolution:\n` +
          `1. Add database configuration to env.yml file\n` +
          `2. Refer to env.example.yml file for configuration\n` +
          `\nExample:\n` +
          `test_db:\n` +
          `  client: mysql2\n` +
          `  connection:\n` +
          `    host: localhost\n` +
          `    port: 3306\n` +
          `    user: readonly_user\n` +
          `    password: your_password\n` +
          `    database: your_database`
        );
      }

      // Parse YAML
      const parsedConfig = yaml.parse(rawYaml);
      
      if (!parsedConfig || typeof parsedConfig !== 'object') {
        throw new Error('Invalid YAML format');
      }

      // Schema validation
      const validatedConfig = EnvironmentConfigSchema.parse(parsedConfig);
      
      this.config = validatedConfig;
      this.isLoaded = true;
      
      console.log(`[Environment] Environment configuration loaded: ${Object.keys(validatedConfig).length} database configurations`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = `Environment configuration validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
        console.error(`[Environment] ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      console.error('[Environment] Environment configuration file load failed:', error);
      throw error;
    }
  }

  /**
   * Get all environment configurations
   */
  getConfig(): EnvironmentConfig {
    if (!this.config) {
      throw new Error('Environment configuration not loaded yet. Please call Environment.load() first.');
    }
    return this.config;
  }

  /**
   * Get specific database configuration
   */
  getDatabaseConfig(dbKey: string): DatabaseConfig {
    const config = this.getConfig();
    const dbConfig = config[dbKey];
    
    if (!dbConfig) {
      throw new Error(`Database configuration not found: ${dbKey}`);
    }
    
    return dbConfig;
  }

  /**
   * Get database list
   */
  getDatabaseKeys(): string[] {
    const config = this.getConfig();
    return Object.keys(config);
  }
}

// Singleton instance
const environment = new Environment();

export default environment;