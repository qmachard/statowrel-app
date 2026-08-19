/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Design tokens (palette, shadows, etc.) are intentionally left
      // default for now — the visual design pass (neobrutalism) happens
      // later, as a separate install/config step.
    },
  },
  plugins: [],
};
