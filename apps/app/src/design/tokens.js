/**
 * Neobrutalisme / sticker — la source de vérité des couleurs.
 *
 * **Quatre encres, pas une de plus** : crème (fond), jaune doré, rose
 * bubblegum, noir (tous les contours). Le rose n'est pas décoratif : il marque
 * ce qui n'est pas un jour comme les autres — le streak, le record, la case
 * d'aujourd'hui, l'invitation.
 *
 * Écrit en CommonJS parce que ce fichier a deux lecteurs qui ne partagent pas
 * de runtime :
 * - `tailwind.config.js` le `require()` au build des styles (pas de loader
 *   TypeScript là-bas) et en dérive l'échelle `colors` ;
 * - le code de l'app l'importe pour les couleurs qui se passent en **valeur**
 *   et non en `className` : le thème React Navigation, la tab bar, le
 *   `contentStyle` du stack, une icône Lucide, un `placeholderTextColor`.
 *
 * Un hex ne s'écrit nulle part ailleurs. Un composant prend `ink.pink`, jamais
 * `'#FE91E7'`, et le thème Tailwind ne redéfinit aucune couleur en dur.
 */
const ink = {
  black: '#000000',
  gold: '#FFC802',
  pink: '#FE91E7',
  cream: '#FEECDD',
};

/**
 * Les rôles. C'est ce que les écrans utilisent au quotidien, en `className`
 * (`bg-primary`, `text-foreground`) comme en valeur (`colors.background`).
 *
 * Il n'y a délibérément ni `muted` ni `destructive` : estomper, c'est baisser
 * l'opacité du noir (`text-foreground/60`, `bg-foreground/10`), et une erreur
 * s'annonce en noir plein. Une cinquième encre n'existe pas.
 */
const colors = {
  background: ink.cream,
  foreground: ink.black,
  // Tous les contours sont noirs, sans exception.
  border: ink.black,
  ring: ink.black,

  // Un panel ne se distingue pas du fond par sa couleur mais par sa bordure
  // noire et son ombre dure décalée.
  card: ink.cream,
  'card-foreground': ink.black,
  input: ink.cream,

  primary: ink.gold,
  'primary-foreground': ink.black,

  secondary: ink.black,
  'secondary-foreground': ink.cream,

  // L'exception, et rien d'autre.
  accent: ink.pink,
  'accent-foreground': ink.black,
};

/**
 * Estomper, c'est baisser l'opacité d'une encre existante. En `className` on
 * écrit `text-foreground/60` ; ce helper est l'équivalent pour les props qui
 * n'acceptent qu'une couleur résolue (`placeholderTextColor`, la tab bar).
 *
 * @param {string} color encre au format `#rrggbb`
 * @param {number} alpha opacité entre 0 et 1
 * @returns {string}
 */
const withAlpha = (color, alpha) => {
  const channels = color.replace('#', '');
  const r = parseInt(channels.slice(0, 2), 16);
  const g = parseInt(channels.slice(2, 4), 16);
  const b = parseInt(channels.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

module.exports = { colors, ink, withAlpha };
