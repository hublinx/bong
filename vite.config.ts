import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' để build chạy được ở bất kỳ đâu (GitHub Pages, Netlify, mở file tĩnh…)
export default defineConfig({
  base: './',
  plugins: [react()],
});
