# Design — StatOwrel

Source de vérité des principes visuels de `apps/app`. Les tokens qui les
implémentent vivent dans `apps/app/src/design/tokens.js` et
`apps/app/tailwind.config.js`. Aucun écran ne définit sa propre palette.

## 1. Le style : neobrutalisme / sticker

- **Aplats de couleur francs.** Pas de dégradé, pas de transparence
  décorative, pas de texture.
- **Bordures noires épaisses.** Tout ce qui est un objet — bouton, panel,
  champ, case de calendrier, avatar — est cerné de noir. `border-2` par
  défaut, `border-4` pour appuyer.
- **Ombres portées dures et décalées.** Jamais de flou : le rayon de flou reste
  à `0` sur toute l'échelle `shadow-*`. Une ombre est un deuxième aplat noir
  décalé, comme le contour d'un sticker.
- **Typographie.** `font-head` (Archivo Black) pour les titres, en capitales.
  `font-sans` (Space Grotesk) pour tout le reste.
- **Rayons.** Deux valeurs, pas trois : les **boutons et pastilles** sont en
  `rounded-full`, les **panels** (cartes, champs, cases, bottom sheet) en
  `rounded-panel` (10 pt). `rounded-none` reste disponible pour un bord qui
  doit mordre l'écran.

## 2. Quatre encres, pas une de plus

| Encre | Hex | Rôle |
|---|---|---|
| Noir | `#000000` | **Tous** les contours, les ombres, le texte, les aplats forts |
| Crème | `#FEECDD` | Le fond, et la surface des panels |
| Jaune doré | `#FFC802` | L'accent par défaut : action principale, jour répondu, aplat de mise en avant |
| Rose bubblegum | `#FE91E7` | L'exception (voir ci-dessous) |

**Le rose n'est pas décoratif.** Il marque ce qui n'est pas un jour comme les
autres : le streak, le record, la case d'aujourd'hui, l'invitation. Un écran
qui pose du rose sur autre chose lui fait perdre son sens.

Conséquences directes :

- **Un panel ne se distingue pas du fond par sa couleur** (crème sur crème),
  mais par sa bordure noire et son ombre dure décalée.
- **Il n'y a pas de gris.** Estomper, c'est baisser l'opacité du noir —
  `text-foreground/60`, `bg-foreground/10` — jamais introduire une cinquième
  encre. Les tokens `muted` / `muted-foreground` n'existent pas.
- **Il n'y a pas de rouge d'erreur.** Un message d'erreur s'annonce en noir
  plein (`ErrorNotice`), un champ en erreur épaissit son trait et perd son
  ombre. Le token `destructive` n'existe pas.

## 3. Une seule source de vérité

Les quatre hex sont écrits **une fois**, dans
`apps/app/src/design/tokens.js`. Ce fichier est en CommonJS parce qu'il a deux
lecteurs qui ne partagent pas de runtime :

- `apps/app/tailwind.config.js` le `require()` au build des styles (pas de
  loader TypeScript là-bas) et en dérive l'échelle `colors` ;
- le code de l'app l'importe pour les couleurs qui se passent en **valeur** et
  non en `className` : le thème React Navigation, la tab bar, le `contentStyle`
  du stack, une icône Lucide, un `placeholderTextColor`.

Il exporte `ink` (les quatre encres), `colors` (les rôles qui en découlent) et
`withAlpha`.

```ts
import { Flame } from 'lucide-react-native';

import { ink } from '@/design/tokens';

<Flame size={24} color={ink.pink} />;                 // ✅ une prop, une encre
<Flame size={24} className="text-accent" />;          // ❌ une icône ne prend pas de classe
<Flame size={24} color="#FE91E7" />;                  // ❌ hex dupliqué
```

`withAlpha(ink.black, 0.45)` couvre les props qui n'acceptent qu'une couleur
résolue (`placeholderTextColor`, `ActivityIndicator`, la tab bar).

Les échelles `colors`, `opacity`, `borderRadius`, `borderWidth` et `boxShadow`
sont définies **en remplacement** des échelles Tailwind par défaut, pas en
`extend` : `bg-red-500`, `rounded-lg` et `shadow-inner` n'existent tout
simplement pas. La contrainte est tenue par l'outillage, pas par la discipline.

## 4. Les rôles disponibles

| Token | Encre | Usage |
|---|---|---|
| `background` | crème | Le fond d'écran |
| `foreground` | noir | Le texte |
| `border` / `ring` | noir | Tous les contours |
| `card` / `card-foreground` | crème / noir | Les panels |
| `input` | crème | Les champs |
| `primary` / `primary-foreground` | jaune / noir | L'action principale, la mise en avant |
| `secondary` / `secondary-foreground` | noir / crème | L'aplat noir plein |
| `accent` / `accent-foreground` | rose / noir | L'exception (streak, record, aujourd'hui, invitation) |

Les encres restent adressables directement (`bg-gold`, `text-pink`,
`bg-cream`, `bg-black`) quand le rôle sémantique n'apporte rien — un liseré,
un aplat purement graphique.

## 5. Icônes

- **Lucide en priorité** (`lucide-react-native`), rendu via `react-native-svg`.
- Une icône prend `color` et `size` en props, jamais une classe.
- `strokeWidth` ≥ `2.5` pour tenir le trait épais du reste de l'interface.
- Des **illustrations SVG sur mesure** viennent compléter Lucide quand aucune
  icône ne convient.
- **Jamais d'emoji**, nulle part — ni dans l'UI, ni dans les données affichées
  comme UI.

## 6. Contraintes d'implémentation

- Nativewind (`className`), pas de `StyleSheet.create` sauf impossibilité
  réelle (une valeur qui ne s'exprime pas en Tailwind) — auquel cas la colocaliser
  avec le composant.
- Alias `@/*` pour les imports intra-app.
- Les primitives réutilisables vivent dans `apps/app/src/components/`
  (`Button`, `TextField`, `ErrorNotice`) et sont construites contre ces tokens.
  Le registry `shadcn` de neobrutalism.com est web-only (Radix / Base UI ont
  besoin d'un DOM) : il ne s'applique pas à cette app.
- Après toute modification : `npm run typecheck` et `npm run lint`. Aucune CI
  ne garde les PR.
