const colors = require('./src/theme/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Single-theme app (docs/prd.md §5) — no `dark:` variant is ever used.
  // 'media' would let the browser's own colour-scheme preference reach
  // NativeWind's observer, which then throws rather than ignoring it.
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      fontFamily: {
        head: ['ArchivoBlack_400Regular'],
        sans: ['SpaceGrotesk_400Regular'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '9999px',
      },
      borderWidth: {
        DEFAULT: '2px',
      },
      // Hard offset shadows — no blur — the neobrutalism signature look.
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
