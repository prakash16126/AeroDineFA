import { cp, rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { bundleOptions, prepareOutput } from './build-config.js';

await rm('dist', { recursive: true, force: true });
await cp('public', 'dist', { recursive: true });
await prepareOutput();
await build(bundleOptions);
console.log('Production build created in dist/.');
