import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { queryClient } from './lib/queryClient'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles/main.scss'
import './styles/tailwind.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                fontFamily: "'Inter', 'Poppins', sans-serif",
                fontSize: '0.8125rem',
                borderRadius: '10px',
              },
              duration: 4000,
            }}
            richColors
            closeButton
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
