import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'odata-query',
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
    rollupOptions: {
      output: [
        {format: 'es', entryFileNames: 'index.js.mjs'},
        {format: 'cjs', entryFileNames: 'index.cjs.js'}
	  ]
	}
  }
});
