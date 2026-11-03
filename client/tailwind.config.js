/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#0a1a0a',
        surface: '#0f1d10',
        'surface-2': '#142416',
        border: '#1e3d22',
        primary: '#5fe07c',
        'primary-deep': '#4a9a4f',
        gold: '#c9b458',
        muted: '#a8b0a8',
        faint: '#7d887e',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 28px rgba(95, 224, 124, 0.22)',
      },
    },
  },
  plugins: [],
};
