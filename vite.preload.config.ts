import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(({ mode }) => {
  return {
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  };
});
