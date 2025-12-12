import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/magic-leaderboard/' : '/',
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  plugins: [react(), svgr()],
  server: {
    port: 3000,
  },
});
