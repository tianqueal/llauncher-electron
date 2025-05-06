import { defineConfig } from 'vite';
// eslint-disable-next-line import/no-unresolved
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [tailwindcss()],
});
