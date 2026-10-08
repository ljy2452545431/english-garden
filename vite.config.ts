import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
export default defineConfig({
  base: '/english-garden/',
  plugins: [react(), UnoCSS()],
  build: { rollupOptions: { output: { manualChunks(id) { if(id.includes('/node_modules/gsap/')) return 'motion'; if(id.includes('/node_modules/')) return 'vendor'; if(id.includes('/src/data/')) return 'lessons'; } } } },
  test: { include: ['src/**/*.test.ts'], coverage: { provider: 'v8', include: ['src/utils/**/*.ts'], thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 } } },
});
