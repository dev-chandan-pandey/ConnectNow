import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
   ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'  // Correct polyfill for 'global'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: false, // avoid duplicate Buffer declarations in simple-peer
          process: true
        }),
        NodeModulesPolyfillPlugin()  // Required for `stream`, `crypto`, etc.
      ]
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
      process: 'process/browser',
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      events: 'events/'
    }
  },
  define: {
    global: "window" // Critical fix for `global is not defined`
  }
});
