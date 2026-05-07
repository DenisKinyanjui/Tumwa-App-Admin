/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6F3C',
          50:  '#FFF4EF',
          100: '#FFE8DE',
          200: '#FFCFBD',
          300: '#FFB09B',
          400: '#FF9170',
          500: '#FF6F3C',
          600: '#E05520',
          700: '#BB3D0E',
          800: '#932F0B',
          900: '#6B2108',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
