import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const { version } = JSON.parse(readFileSync('package.json', 'utf-8'));

await build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  minify: true,
  outfile: 'dist/cli.js',
  banner: { js: '#!/usr/bin/env node' },
  packages: 'external',
  define: { __VERSION__: JSON.stringify(version) },
});
