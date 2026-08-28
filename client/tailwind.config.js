/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        'sap-primary': '#0070f2',
        'sap-dark': '#1b2a3c',
        'sap-light': '#f5f6f7',
      }
    },
  },
  plugins: [],
}
