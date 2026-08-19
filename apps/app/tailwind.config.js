const { colors, radius, shadows } = require('./src/design/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      fontFamily: {
        head: ['ArchivoBlack_400Regular'],
        sans: ['SpaceGrotesk_400Regular'],
      },
      // Slightly rounded corners and hard offset shadows — see
      // `src/design/tokens.js`. Components reach for the shadows through
      // `src/design/shadows.ts` rather than the `shadow-*` classNames these
      // generate; that file explains why.
      borderRadius: radius,
      boxShadow: shadows,
      borderWidth: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
};
