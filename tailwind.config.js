/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1b524b',
          light: '#2a6b62',
          dark: '#143d38',
          foreground: '#ffffff',
        },
        background: '#09090b',
        foreground: '#fafafa',
        card: {
          DEFAULT: '#18181b',
          foreground: '#fafafa',
        },
        popover: {
          DEFAULT: '#18181b',
          foreground: '#fafafa',
        },
        muted: {
          DEFAULT: '#27272a',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        destructive: {
          DEFAULT: '#7f1d1d',
          foreground: '#fafafa',
        },
        border: '#27272a',
        input: '#27272a',
        ring: '#1b524b',
        sidebar: {
          DEFAULT: '#09090b',
          foreground: '#a1a1aa',
          accent: '#27272a',
        },
        'border-dark': '#27272a',
        'card-bg': '#18181b',
        'sidebar-bg': '#09090b',
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
    },
  },
  plugins: [],
}