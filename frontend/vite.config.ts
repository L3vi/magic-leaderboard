import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  base: '/magic-leaderboard/', // Set to your repo name
  plugins: [react(), svgr()],
  server: {
    port: 3000,
  },
});
