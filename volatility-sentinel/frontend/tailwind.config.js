/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'crypto-dark': '#0a0a0f',
        'crypto-card': '#12121a',
        'crypto-accent': '#22c55e',
        'crypto-red': '#ef4444',
      }
    },
  },
  plugins: [],
}
