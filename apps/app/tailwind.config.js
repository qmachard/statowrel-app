const palette = require('./src/theme/palette.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // The palette is closed, not extended: four inks and nothing else, so no
    // screen can quietly introduce a fifth. `src/theme/palette.json` is the
    // single source of truth — `src/theme/colors.ts` reads the same file for
    // the runtime, since an icon takes a colour as a prop, not as a class.
    colors: {
      transparent: 'transparent',
      black: palette.black,
      yellow: palette.yellow,
      pink: palette.pink,
      cream: palette.cream,
    },
    extend: {
      fontFamily: {
        head: ['ArchivoBlack_400Regular'],
        sans: ['SpaceGrotesk_400Regular'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        panel: '10px',
        full: '9999px',
      },
      borderWidth: {
        DEFAULT: '2px',
      },
      // Hard offset shadows — no blur — the neobrutalism signature look.
      boxShadow: {
        xs: `1px 1px 0 0 ${palette.black}`,
        sm: `2px 2px 0 0 ${palette.black}`,
        DEFAULT: `3px 3px 0 0 ${palette.black}`,
        md: `4px 4px 0 0 ${palette.black}`,
        lg: `6px 6px 0 0 ${palette.black}`,
        xl: `10px 10px 0 1px ${palette.black}`,
        '2xl': `16px 16px 0 1px ${palette.black}`,
      },
    },
  },
  plugins: [],
};
