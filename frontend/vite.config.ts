import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
  ],
  resolve: {
    alias: {
      '$shared': path.resolve(__dirname, '../shared'),
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
});
