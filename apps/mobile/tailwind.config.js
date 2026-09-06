/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#dc2626',
          dark: '#b91c1c',
          light: '#fee2e2',
        },
        coach: {
          DEFAULT: '#1d4ed8',
          dark: '#1e40af',
          light: '#dbeafe',
        },
      },
    },
  },
  plugins: [],
};
