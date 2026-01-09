import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable minification with terser for smaller bundles
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log in production
        drop_debugger: true,
        passes: 2,           // Multiple compression passes
      },
      mangle: true,
      format: {
        comments: false,     // Remove all comments
      }
    },
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunking strategy for better caching
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation library (heavy)
          'vendor-motion': ['framer-motion'],
          // Database
          'vendor-supabase': ['@supabase/supabase-js'],
          // Emoji picker (very heavy - 300KB!)
          'vendor-emoji': ['emoji-picker-react'],
          // Utility libraries
          'vendor-utils': ['lucide-react', 'date-fns'],
        },
        // Better chunk naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Enable source maps for debugging (optional, remove for smaller build)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion'],
    exclude: ['emoji-picker-react'] // Lazy load this
  }
})
