/**
 * Centralized path management module
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = __dirname.endsWith('/dist') 
  ? path.resolve(__dirname, '..')  // dist/main.js -> project root
  : path.resolve(__dirname, '../..'); // src/config/paths.ts -> project root

export class Paths {
  static getConfigPath(): string {
    if (process.env.CONFIG_FILE) {
      return path.resolve(process.env.CONFIG_FILE);
    }
    return path.join(PROJECT_ROOT, 'env.yml');
  }

  static getAssetsPath(): string {
    if (process.env.ASSETS_FILE) {
      return path.resolve(process.env.ASSETS_FILE);
    }
    
    const defaultPath = process.env.NODE_ENV === 'development'
      ? path.join(PROJECT_ROOT, 'src', 'assets')
      : path.join(PROJECT_ROOT, 'dist', 'assets');

    return existsSync(defaultPath) ? defaultPath : path.join(PROJECT_ROOT, 'src', 'assets');
  }

  static getAssetsTextFile(fileName: string): string {
    const defaultPath = path.join(this.getAssetsPath(), fileName);
    if (existsSync(defaultPath)) {
      return readFileSync(defaultPath, 'utf-8');
    }
    return '';
  }

  static getContextPath(): string {
    if (process.env.CONTEXT_FILE) {
      return path.resolve(process.env.CONTEXT_FILE);
    }

    const defaultPath = path.join(this.getAssetsPath(), 'context.md');
    return existsSync(defaultPath) ? defaultPath : path.join(PROJECT_ROOT, 'src', 'assets', 'context.md');
  }

  static getGuidePath(): string {
    if (process.env.GUIDE_FILE) {
      return path.resolve(process.env.GUIDE_FILE);
    }
    
    const defaultPath = path.join(this.getAssetsPath(), 'guide.md');
    return existsSync(defaultPath) ? defaultPath : path.join(PROJECT_ROOT, 'src', 'assets', 'guide.md');
  }

  static getProjectRoot(): string {
    return PROJECT_ROOT;
  }
}