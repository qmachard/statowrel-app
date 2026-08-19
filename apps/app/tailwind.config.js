/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#fff7e8',
        foreground: '#000000',
        card: '#ffffff',
        'card-foreground': '#000000',
        primary: '#ffdc58',
        'primary-hover': '#ffd12e',
        'primary-foreground': '#000000',
        secondary: '#000000',
        'secondary-foreground': '#ffffff',
        muted: '#efe7d6',
        'muted-foreground': '#6b6355',
        accent: '#ffe7a3',
        'accent-foreground': '#000000',
        destructive: '#e63946',
        'destructive-foreground': '#ffffff',
        border: '#000000',
        input: '#ffffff',
        ring: '#000000',
      },
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
