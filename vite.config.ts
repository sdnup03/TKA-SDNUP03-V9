import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    return {
      server: {
        port: 3000,
        host: true, // Listen on all addresses including LAN and public
        hmr: {
          protocol: 'ws',
          host: 'localhost',
          port: 3000,
        },
        fs: {
          strict: false, // Allow serving files outside of root
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_GAS_API_URL': JSON.stringify(env.VITE_GAS_API_URL || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        dedupe: ['react', 'react-dom'], // Prevent multiple React instances
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'lucide-react'],
        exclude: [], // Can add problematic deps here if needed
        esbuildOptions: {
          target: 'es2020',
        },
      },
      build: {
        // Disable source maps for production to avoid warnings in browser console
        // Source maps are still available in development mode
        sourcemap: !isProduction,
        // Ensure proper base path for Vercel
        outDir: 'dist',
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-icons': ['lucide-react'],
            },
          },
        },
        chunkSizeWarningLimit: 1000,
      },
      publicDir: 'public',
      clearScreen: false, // Don't clear terminal on rebuild
    };
});
