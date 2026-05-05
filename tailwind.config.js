/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1b524b',
        'primary-light': '#2a6b62',
        'primary-dark': '#143d38',
        background: '#131a22',
        'sidebar-bg': '#1a2129',
        'card-bg': '#1e2630',
        'card-hover': '#282f3a',
        'border-dark': '#2d3748',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}