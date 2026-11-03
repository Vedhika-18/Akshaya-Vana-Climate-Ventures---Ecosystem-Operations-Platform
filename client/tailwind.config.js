/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#0a1a0a',
        surface: '#0f1d10',
        primary: '#5fe07c',
        gold: '#c9b458',
      },
    },
  },
  plugins: [],
};
