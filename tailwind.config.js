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
        background: "#09090b", // Zinc 950 - darker, flatter
        surface: "#18181b",    // Zinc 900
        surfaceHighlight: "#27272a", // Zinc 800
        primary: "#ec4899",    // Keep pink, but use sparingly
        secondary: "#8b5cf6",  // Violet
        subtle: "#71717a",     // Zinc 500
      },
      fontFamily: {
        // Assume you might add Inter or Geist later, standard sans for now
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass': 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};