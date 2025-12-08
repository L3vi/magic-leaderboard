import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  base: '/', // Use '/' for development, '/magic-leaderboard/' for production
  plugins: [react(), svgr()],
  server: {
    port: 3000,
  },
});
