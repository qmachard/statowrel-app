const { colors, radius } = require('./src/design/tokens');

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
      // Slightly rounded corners — see `src/design/tokens.js`.
      borderRadius: radius,
      borderWidth: {
        DEFAULT: '2px',
      },
      // Hard offset shadows — no blur — the neobrutalism signature look. The
      // offsets match the `translate-*` values a pressed surface uses to sink
      // into its own shadow: `shadow-md` (4px) pairs with `translate-x-1`.
      boxShadow: {
        xs: '1px 1px 0 0 #000',
        sm: '2px 2px 0 0 #000',
        DEFAULT: '3px 3px 0 0 #000',
        md: '4px 4px 0 0 #000',
        lg: '6px 6px 0 0 #000',
        xl: '10px 10px 0 1px #000',
        '2xl': '16px 16px 0 1px #000',
      },
    },
  },
  plugins: [],
};
