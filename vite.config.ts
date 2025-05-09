import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'odata-query',
      fileName:'index.js',
      formats: ['es'],
    },
    outDir: 'dist',
  }
});
