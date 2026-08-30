/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme
        'light-bg': '#ffffff',
        'light-surface': '#f8fafb',
        'light-card': '#ffffff',
        'light-border': '#e5e7eb',
        'light-text': '#1f2937',
        'light-text-secondary': '#6b7280',

        // Dark theme
        'dark-bg': '#0f1419',
        'dark-surface': '#1a1f2e',
        'dark-card': '#252d3d',
        'dark-border': '#3f4655',
        'dark-text': '#f3f4f6',
        'dark-text-secondary': '#d1d5db',

        // Brand colors
        'navy': '#001a4d',
        'ocean-blue': '#0066cc',
        'cyan': '#00d9ff',
        'alert-red': '#ef4444',
        'alert-orange': '#f97316',
        'alert-yellow': '#eab308',
        'alert-green': '#22c55e',
      },
      spacing: {
        'sidebar-width': '280px',
        'navbar-height': '70px',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideIn: {
          'from': { transform: 'translateX(-100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          'from': { transform: 'translateX(0)', opacity: '1' },
          'to': { transform: 'translateX(-100%)', opacity: '0' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        slideIn: 'slideIn 0.3s ease-out',
        slideOut: 'slideOut 0.3s ease-in',
        fadeIn: 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
