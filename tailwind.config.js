/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#2d3748',
          850: '#1a202c',
          950: '#171923',
        },
        neon: {
          green: '#00ff9d',
          red: '#ff0055',
          blue: '#00f3ff'
        }
      },
    },
  },
  plugins: [],
}