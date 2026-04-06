import colors from 'tailwindcss/colors'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: {
          DEFAULT: '#16a34a',
          dark: '#15803d',
        },
        slate: colors.zinc,
      },
    },
  },
  plugins: [],
}
