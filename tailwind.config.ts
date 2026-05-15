import type { Config } from 'tailwindcss'

/**
 * Tailwind is configured to co-exist with the existing SCSS design system:
 *  - preflight is DISABLED so Bootstrap / existing CSS resets are untouched
 *  - darkMode uses 'class' — ThemeContext already adds .dark to <html>
 *  - All color / radius / shadow tokens map back to the --erp-* CSS variables
 *    so Tailwind utilities automatically respect the current theme
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        erp: {
          primary:     'var(--erp-primary)',
          'primary-h': 'var(--erp-primary-hover)',
          bg:          'var(--erp-bg)',
          surface:     'var(--erp-surface)',
          'surface-2': 'var(--erp-surface-2)',
          'surface-3': 'var(--erp-surface-3)',
          border:      'var(--erp-border)',
          success:     'var(--erp-success)',
          warning:     'var(--erp-warning)',
          danger:      'var(--erp-danger)',
          info:        'var(--erp-info)',
          'text':      'var(--erp-text-primary)',
          'text-sec':  'var(--erp-text-secondary)',
          'text-muted':'var(--erp-text-muted)',
        },
      },
      borderRadius: {
        erp:    'var(--erp-radius)',
        'erp-sm': 'var(--erp-radius-sm)',
        'erp-lg': 'var(--erp-radius-lg)',
        'erp-xl': 'var(--erp-radius-xl)',
      },
      boxShadow: {
        erp:    'var(--erp-shadow)',
        'erp-md': 'var(--erp-shadow-md)',
        'erp-lg': 'var(--erp-shadow-lg)',
        'erp-xl': 'var(--erp-shadow-xl)',
      },
      fontFamily: {
        erp: ['Inter', 'Poppins', 'sans-serif'],
      },
      transitionTimingFunction: {
        'erp-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      zIndex: {
        sidebar:  'var(--erp-z-sidebar)',
        header:   'var(--erp-z-header)',
        dropdown: 'var(--erp-z-dropdown)',
        modal:    'var(--erp-z-modal)',
        toast:    'var(--erp-z-toast)',
      },
    },
  },
  plugins: [],
} satisfies Config
