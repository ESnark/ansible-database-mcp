/**
 * Centralized path management module
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export class Paths {
  static getConfigPath(): string {
    if (process.env.CONFIG_FILE) {
      return path.resolve(process.env.CONFIG_FILE);
    }
    return path.join(PROJECT_ROOT, 'env.yml');
  }

  static getContextPath(): string {
    if (process.env.CONTEXT_FILE) {
      return path.resolve(process.env.CONTEXT_FILE);
    }
    
    const defaultPath = process.env.NODE_ENV === 'development'
      ? path.join(PROJECT_ROOT, 'src', 'assets', 'context.md')
      : path.join(PROJECT_ROOT, 'dist', 'assets', 'context.md');
    
    return existsSync(defaultPath) ? defaultPath : path.join(PROJECT_ROOT, 'src', 'assets', 'context.md');
  }

  static getGuidePath(): string {
    if (process.env.GUIDE_FILE) {
      return path.resolve(process.env.GUIDE_FILE);
    }
    
    const defaultPath = process.env.NODE_ENV === 'development'
      ? path.join(PROJECT_ROOT, 'src', 'assets', 'guide.md')
      : path.join(PROJECT_ROOT, 'dist', 'assets', 'guide.md');
    
    return existsSync(defaultPath) ? defaultPath : path.join(PROJECT_ROOT, 'src', 'assets', 'guide.md');
  }

  static getProjectRoot(): string {
    return PROJECT_ROOT;
  }
}