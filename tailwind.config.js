/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#004F71',
          navyLight: '#006890',
          gold: '#C49A6C',
          goldLight: '#D4B08C',
          goldDark: '#A8824F',
        }
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
