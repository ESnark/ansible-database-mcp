import { defineConfig } from 'tsup';
import { cpSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  shims: false,
  external: [
    // Node.js built-ins will be automatically externalized
  ],
  esbuildOptions(options) {
    // Ensure ES modules
    options.platform = 'node';
    options.format = 'esm';
  },
  onSuccess: async () => {
    // Copy assets folder to dist
    console.log('Copying assets...');
    cpSync(
      join('src', 'assets'),
      join('dist', 'assets'),
      { recursive: true }
    );
    console.log('Assets copied successfully!');
  }
});