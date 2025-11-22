/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",      // ✅ required so brand colors load
    "./pages/**/*.{js,ts,jsx,tsx}",    // (optional but recommended)
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#ff4da3",      // neon pink
          purple: "#b366ff",    // neon purple
          blue: "#4da3ff",      // neon blue
          glow: "#c07dff",      // glow color
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(192, 125, 255, 0.7)",
      },
      dropShadow: {
        glow: "0 0 6px rgba(255, 77, 163, 0.7)",
      },
    },
  },
  plugins: [],
};
