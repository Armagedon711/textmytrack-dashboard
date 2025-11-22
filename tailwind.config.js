/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#ff2d8f",
          purple: "#7b3ff2",
          blue: "#3f88ff",
          glow: "#9d4bff",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(157, 75, 255, 0.6)",
      },
    },
  },
  plugins: [],
};
