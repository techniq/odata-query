import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'odata-query',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
  }
});
