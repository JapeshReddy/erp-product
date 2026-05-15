import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },

  build: {
    // Raise the advisory limit to avoid noise from expected large chunks
    chunkSizeWarningLimit: 700,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — loaded first, cached longest
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation / notification — shared across pages
          'vendor-ui':    ['framer-motion', 'sonner'],
          // Charts — only Dashboard
          'vendor-charts': ['recharts'],
          // Data layer — TanStack Query + Table
          'vendor-query':  ['@tanstack/react-query'],
          'vendor-table':  ['@tanstack/react-table'],
          // Supabase client — backend comms
          'vendor-supabase': ['@supabase/supabase-js'],
          // Form layer
          'vendor-forms':  ['react-hook-form', '@hookform/resolvers', 'zod'],
          // State + utilities
          'vendor-state':  ['zustand'],
        },
      },
    },
  },
})
