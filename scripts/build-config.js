import { mkdir } from 'node:fs/promises';

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export async function prepareOutput() {
  await mkdir('dist/assets', { recursive: true });
}

export const bundleOptions = {
  entryPoints: ['src/main.jsx'],
  outfile: 'dist/assets/main.js',
  bundle: true,
  minify: true,
  target: ['es2020'],
  external: ['/images/*'],
  define: {
    'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || ''),
    'process.env.REACT_APP_RESERVATION_API_URL': JSON.stringify(process.env.REACT_APP_RESERVATION_API_URL || ''),
    'process.env.REACT_APP_ORDER_API_URL': JSON.stringify(process.env.REACT_APP_ORDER_API_URL || ''),
  },
};
