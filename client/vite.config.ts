import { defineConfig } from 'vite';

// Preserve the browser-facing Host so the API can compare it with Origin.
// Vite's string shorthand implicitly enables changeOrigin and breaks that check.
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
      '/health': { target: 'http://127.0.0.1:3000', changeOrigin: false }
    }
  }
});
