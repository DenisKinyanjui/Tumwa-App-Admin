/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#248249',
          50:  '#EAF6EE',
          100: '#D2ECDA',
          200: '#A6D9B8',
          300: '#79C595',
          400: '#4DA872',
          500: '#248249',
          600: '#1D6B3B',
          700: '#17552F',
          800: '#113F23',
          900: '#0B2A17',
        },
        accent: {
          DEFAULT: '#F46525',
          50:  '#FFF1EA',
          100: '#FFDFCE',
          200: '#FFC1A0',
          300: '#FF9E6E',
          400: '#FA7F45',
          500: '#F46525',
          600: '#D14E14',
          700: '#A93B0F',
          800: '#832D0C',
          900: '#5E2009',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
