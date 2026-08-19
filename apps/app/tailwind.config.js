const { colors, ink } = require('./src/design/tokens');

/**
 * Neobrutalisme / sticker.
 *
 * Toutes les couleurs viennent de `src/design/tokens.js` — le même fichier que
 * celui lu par le runtime (thème React Navigation, tab bar, icônes Lucide),
 * donc aucun hex n'est écrit ici.
 *
 * Les échelles `colors`, `opacity`, `borderRadius`, `borderWidth` et
 * `boxShadow` sont définies **en remplacement** des échelles Tailwind par
 * défaut, pas en `extend` : `bg-red-500`, `rounded-lg` ou `shadow-inner`
 * n'existent tout simplement pas. Un écran ne peut pas définir sa propre
 * palette.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      // Les quatre encres, adressables telles quelles quand le rôle sémantique
      // n'apporte rien (un liseré, un aplat purement graphique).
      black: ink.black,
      gold: ink.gold,
      pink: ink.pink,
      cream: ink.cream,

      // Les rôles. C'est ce que les écrans utilisent au quotidien.
      ...colors,
    },
    // Pas de gris : estomper, c'est baisser l'opacité du noir
    // (`text-foreground/60`, `bg-foreground/10`), jamais ajouter une encre.
    opacity: {
      0: '0',
      10: '0.1',
      20: '0.2',
      40: '0.4',
      50: '0.5',
      60: '0.6',
      80: '0.8',
      100: '1',
    },
    borderRadius: {
      none: '0px',
      // Les panels — cartes, champs, cases de calendrier, bottom sheet.
      DEFAULT: '10px',
      panel: '10px',
      // Les boutons et les pastilles.
      full: '9999px',
    },
    borderWidth: {
      0: '0px',
      DEFAULT: '2px',
      2: '2px',
      3: '3px',
      4: '4px',
    },
    // Ombres portées dures et décalées — jamais de flou : le rayon de flou
    // reste à 0 sur toute l'échelle. C'est la signature sticker.
    boxShadow: {
      none: 'none',
      xs: `1px 1px 0 0 ${ink.black}`,
      sm: `2px 2px 0 0 ${ink.black}`,
      DEFAULT: `3px 3px 0 0 ${ink.black}`,
      md: `4px 4px 0 0 ${ink.black}`,
      lg: `6px 6px 0 0 ${ink.black}`,
      xl: `10px 10px 0 1px ${ink.black}`,
      '2xl': `16px 16px 0 1px ${ink.black}`,
    },
    extend: {
      fontFamily: {
        head: ['ArchivoBlack_400Regular'],
        sans: ['SpaceGrotesk_400Regular'],
      },
    },
  },
  plugins: [],
};
