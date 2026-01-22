/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        serif: ["ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
