import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(({ mode }) => {
  return {
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    define: {
      'process.env.ASSET_BASE_URL': JSON.stringify(process.env.ASSET_BASE_URL),
      'process.env.MANIFEST_URL': JSON.stringify(process.env.MANIFEST_URL),
      'process.env.PATCH_NOTES_BASE_URL': JSON.stringify(
        process.env.PATCH_NOTES_BASE_URL,
      ),
      'process.env.PATCH_NOTES_URL': JSON.stringify(
        process.env.PATCH_NOTES_URL,
      ),
      'process.env.VITE_PATCH_NOTES_BASE_URL': JSON.stringify(
        process.env.VITE_PATCH_NOTES_BASE_URL,
      ),
    },
  };
});
