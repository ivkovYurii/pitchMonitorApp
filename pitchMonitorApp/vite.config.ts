// vite.config.ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/pitchMonitorApp/', 
  plugins: [
    tailwindcss(),
  ],
  worker: {
    format: 'es'
  }
});