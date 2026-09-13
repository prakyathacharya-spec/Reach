/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1",
        ink: "#20241F",
        line: "#DAD8CE",
        signal: "#2F5D50",   // deep pine — primary action / brand
        amber: "#B8752B",    // scheduled state
        rose: "#A23B2E",     // failed state
        moss: "#3E6B4F",     // sent state
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
