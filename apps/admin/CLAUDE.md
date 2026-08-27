# Admin (`@statowrel/admin`)

La console de modération des questions. React 18 + Vite (SPA), Firebase client SDK. Elle couvre
docs/prd.md §4.7 : le pot entier dans un tableau, une modale pour écrire une question ou en reformuler
une, et l'approbation à portée de clic.

Depuis la suppression de FireCMS, c'est **le seul backoffice du repo**. Elle en fait délibérément
moins : là où FireCMS exposait chaque collection, celle-ci ne connaît que `v1_questions`. Tout ce qui
n'est pas la modération des questions passe par la console Firebase ou par un script.

## Accès

**Il n'y a pas d'inscription.** Les comptes existent déjà (créés par l'app mobile ou par la console
Firebase) et l'accès s'ouvre compte par compte, en posant le claim `admin` :

```bash
npm run set-admin -- <email>   # apps/functions/scripts/set-admin.mjs
```

`src/auth/AuthContext.tsx` porte cette porte, avec un `getIdTokenResult(true)` : le rafraîchissement
forcé du jeton est ce qui fait qu'un compte promu pendant sa session n'attend pas l'expiration pour
entrer. C'est le claim que teste `isAdmin()` dans `firestore.rules`, donc l'interface et les règles
s'accordent sur qui est admin. Sans lui, la session existe mais l'écran affiché est
`AccessDeniedScreen`.

Le contexte lit **aussi le pseudo du modérateur**, sur son propre `v1_users` — une question écrite
ici est créditée à qui l'écrit, et la question porte le pseudo (`author_username`) plutôt que de le
faire résoudre à l'affichage. Une lecture par session, à côté du claim et pas après lui : les deux
sont indépendantes, donc la porte ne paie aucune latence qu'elle ne payait déjà pour le
rafraîchissement du jeton, et les régler toutes les deux avant d'ouvrir la console est ce qui évite
que la première question d'une session parte sans crédit. Un modérateur n'a aucune raison d'avoir un
compte dans l'app : profil manquant ou illisible est un état normal, `username` vaut `null`, la
question s'écrit sans crédit — jamais un refus d'entrer.

## Structure

- `src/lib/firebase.ts` — `initializeApp` + `getAuth` + `getFirestore`, branchés sur les émulateurs quand les `VITE_FIREBASE_*_EMULATOR_*` sont posés — en `dev` seulement, `import.meta.env.DEV` gardant le déploiement à l'abri d'un `.env.local` oublié. Pas de `initializeAuth` : la persistance `indexedDB` du build navigateur suffit, contrairement à `apps/app`.
- `src/lib/firestore.ts` — `getDocumentRef` / `getCollectionRef`, qui câblent les converters `@statowrel/models`. Jumeau de `apps/app/src/lib/firestore.ts`.
- `src/auth/` — `AuthContext` (session, claim `admin`, et le pseudo du modérateur — voir plus bas), `SignInScreen` (e-mail + mot de passe, Google), `AccessDeniedScreen`, `errors.ts` (jamais un code `auth/*` affiché), `schemas.ts`.
- `src/questions/` — `QuestionsTable` (le pot, une ligne par question), `columns.tsx` (les colonnes et le jeu de features TanStack), `QuestionModal` (**la même modale pour créer et pour éditer**), `RejectQuestionModal` (le refus et son motif), `schemas.ts` (zod), `data/saveQuestion.ts` (`createQuestion` / `updateQuestion` / `setQuestionStatus`), `data/useQuestions.ts`, `data/useQuestionAuthors.ts`.
- `src/components/` — `Button`, `TextField`, `TextAreaField`, `Select`, `Alert`, `DataTable`, `DropdownMenu`, `icons`, bâtis sur les classes de `src/index.css`.
- `src/index.css` — les tokens neobrutalisme en variables CSS, **portés depuis `apps/app/src/design/tokens.ts`**. L'app mobile reste la source de vérité : on change là-bas, puis ici.

Apple n'est pas proposé : son flux web demande un Services ID et une clé que le build mobile n'a pas,
et rien ici n'est iOS.

La modale est un `<dialog>` natif : le piège à focus, le fond inerte et la fermeture par Échap sont
ceux du navigateur, pas d'une librairie. Elle n'est montée que pendant qu'elle est ouverte et porte en
`key` ce qu'elle édite, donc le formulaire naît avec les bonnes valeurs au lieu d'être réinitialisé
après coup.

## Écrire, éditer, approuver

`createQuestion` écrit `v1_questions/{ULID}` avec `status: 'pending'`, `author_id` = l'UID connecté,
`author_username` = son pseudo, et tout ce qu'une question tirée porte laissé à `null` —
`broadcast_at`, `broadcast_on`, `closes_at` — ce que `firestore.rules` exige d'une création. Les deux
moitiés de l'auteur arrivent ensemble, en `QuestionAuthor`, depuis `AuthContext` : les résoudre ici
coûterait une lecture de profil par question écrite. Une création dont l'`author_username` n'est pas
celui de l'`author_id` est refusée par les règles, qui le vérifient contre la réservation
`v1_usernames` — le joker `isAdmin()` passe devant, mais la règle existe pour le jour où l'app
proposera des questions.

**Un ULID d'option ne se régénère jamais.** Une réponse et `answer_counts` pointent dessus, donc
l'édition fait remonter l'id existant à travers le formulaire (champ caché) et n'en mint un que pour
une option tapée pour la première fois.

`updateQuestion` et `setQuestionStatus` passent par `updateDoc` sur les seuls champs concernés, jamais
par un `set()` de tout le document : celui-ci renverrait les `answer_counts` et les tampons de
diffusion lus une seconde plus tôt, écrasant ce que le backend a écrit entre-temps. Les deux posent
`updated_at` — la colonne « Dernière modification le » du tableau — avec un `Timestamp` et pas une
chaîne ISO : `updateDoc` ne passe pas par le converter (voir le `CLAUDE.md` racine).

`useQuestions` lit le pot entier, `orderBy('created_at', 'desc')`, sans filtre : l'interface est
admin-only et c'est le joker `isAdmin()` qui l'ouvre. Abonné plutôt que lu une fois, donc un verdict
rendu depuis FireCMS au même moment apparaît dans le tableau sans rechargement.

**Rejeter passe par sa propre modale** (`RejectQuestionModal`) : un refus porte son motif, renvoyé à
l'auteur, et c'est le seul champ que le modèle exige à côté du statut `rejected` — donc un formulaire
(`react-hook-form` + `zod`, comme partout) plutôt qu'un bouton sec. Rejeter une question déjà refusée
est ce qui réécrit son motif, alors le champ s'ouvre sur celui qu'elle porte déjà. Approuver, à
l'inverse, remet `rejection_reason` à `null` : les deux ne tiennent jamais ensemble.

Rien ne supprime une question depuis la console : une question diffusée est pointée par
`v1_daily_question_months` et porte les réponses de tout le monde, et une question du pot se sort du
pot en la refusant. Une suppression, si elle devient nécessaire, se pose à la main depuis la console
Firebase.

**La colonne auteur lit le pseudo sur la question** (`author_username`), pas sur un profil : le pot ne
décroît jamais, et le résoudre par auteur distinct à chaque chargement de la console était une
lecture par auteur, indéfiniment. `useQuestionAuthors` reste comme **repli temporaire**, sur les
seules questions écrites avant que le champ existe — un `getDoc` par auteur *distinct*, une fois,
jamais un abonnement : un pseudo ne bouge pas et le backoffice n'a pas à le regarder bouger. Il sort
du dépôt, avec le filtre qui l'alimente, quand `npm run backfill-question-authors` sera passé en
production. Un UID dont le profil manque est mis en cache à vide, donc la lecture ratée n'est pas
rejouée à chaque snapshot — et la cellule distingue les trois cas : pas d'UID (question semée) « — »,
UID sans réponse encore « … », UID revenu vide « Compte introuvable ».

## Le tableau

`QuestionsTable` est un **data-table à la shadcn** : la structure de shadcn/ui — `columns.tsx`,
un `<DataTable>` générique, un en-tête de colonne triable — sur le moteur qu'elle utilise,
`@tanstack/react-table` (v9). **Ni Tailwind ni Radix**, en revanche : le registre shadcn est écrit
en classes Tailwind, et les brancher ici demanderait une seconde source de vérité des tokens à côté
de `src/index.css`, alors que celui-ci est déjà une copie de `apps/app/src/design/tokens.ts`. Le
squelette est donc shadcn, la peau reste celle du repo.

Six colonnes — question + réponses, auteur, statut, date de création, dernière modification,
actions —, un filtre par statut au-dessus du cadre et un tri sur l'auteur ou sur l'une des deux
dates. **Le tri par défaut est la création, décroissante** : c'est l'ordre dans lequel le pot arrive
(`useQuestions` le lit déjà en `orderBy('created_at', 'desc')`), donc le premier rendu ne rebat pas
les lignes.

**Le crayon et le « ⋮ » sont sur toutes les lignes**, calés à droite de la colonne ; ce que le statut
change, ce sont les boutons posés devant eux et le contenu du menu :

| Statut | Sur la ligne | Dans le « ⋮ » |
|---|---|---|
| En attente | `Approuver` · `Rejeter` · ✎ · ⋮ | Approuver / Rejeter / Éditer |
| Validée | ✎ · ⋮ | Rejeter / Éditer |
| Rejetée | ✎ · ⋮ | Approuver / Éditer |
| Diffusée, Démo | ✎ · ⋮ | Éditer |

Le menu porte **tout ce que le statut permet**, et les boutons à côté sont des raccourcis vers ceux
qui valent un clic à eux seuls. Une question qui attend son verdict porte donc les deux en clair :
c'est le travail même de l'écran, et en enterrer un ferait ouvrir le menu à chaque ligne du pot. Une
fois le verdict rendu, l'autre n'est plus qu'un retour en arrière — atteignable, pas posé sur la
ligne. « Diffusée » et « Démo » n'ont rien à renverser : une question tirée a quitté le pot pour de
bon, l'échantillon d'onboarding n'y est jamais entré.

La colonne étant aussi large que sa ligne la plus chargée, les actions sont **alignées à droite** :
sans quoi le « ⋮ » de toutes les autres lignes flotterait au milieu de la cellule.

**Le tri et le filtre sont côté client** : `useQuestions` diffuse déjà le pot entier, donc un `where` / `orderBy`
coûterait un index composite et un aller-retour par frappe pour une liste qui tient dans un snapshot
— et un `orderBy('updated_at')` laisserait de côté toutes les questions écrites avant que le champ
existe, Firestore ignorant les documents auxquels manque le champ trié. `questionLastModifiedAt`
(dans `@statowrel/models`) est ce qui les rattrape en retombant sur `created_at`.

La v9 de TanStack n'est pas la v8 que documente shadcn : `useTable` remplace `useReactTable`, et une
feature qui n'est pas enregistrée dans `tableFeatures({ … })` n'existe tout simplement pas — ni son
état ni ses méthodes. `columns.tsx` n'enregistre donc que le tri et le filtre par colonne. C'est
aussi pourquoi `DataTableColumnHeader` prend une colonne *structurellement* (trois méthodes) au lieu
d'un `Column<TFeatures, …>` : générique sur `TableFeatures`, le conditionnel de la librairie ne se
résout pas et les méthodes de tri restent invisibles.

Le « … » est le `DropdownMenu` de `src/components/` — la **Popover API** de la plateforme plutôt que
Radix. `popover="auto"` achète les deux comportements qu'un panneau fait main doit réécrire : la
fermeture au clic dehors ou par Échap, et surtout le **top layer** — le panneau pend dans
`.table-wrap`, dont l'`overflow-x: auto` rognerait tout ce qui n'est que positionné. L'attribut est
posé depuis une ref, les typages React 18 étant antérieurs à l'API, et le placement est calculé à
l'ouverture plutôt qu'en CSS anchor positioning, que tous les navigateurs n'ont pas encore. Pas de
`role="menu"` : ce motif doit à l'utilisateur les flèches et la saisie au vol, là où un disclosure de
deux boutons lui doit Tab, Échap et un nom — ce qu'il est.

Le filtre est un **select natif à la shadcn** (`components/Select.tsx`) : un vrai `<select>`, donc le
clavier, la saisie au vol et le sélecteur mobile restent ceux de la plateforme. `appearance: none`
est ce qui lui fait porter la même peau que `.field__input` — et ce qui lui retire la flèche du
navigateur, d'où le chevron dessiné à côté, en `currentColor` et hors du flux du pointeur.

`tsconfig.json` épingle `react` sur les typages de cette app : `apps/app` tire `@types/react` 19, que
npm hisse à la racine, et une `.d.ts` de librairie lue depuis là renverrait un `ReactNode` que React
18 refuse.

## Développement local

```bash
cp apps/admin/.env.example apps/admin/.env.local   # config Firebase web
npm run dev:admin                                       # Vite sur :3003
```

Pointer les `VITE_FIREBASE_*_EMULATOR_HOST`/`_PORT` sur la suite d'émulateurs (`apps/functions`) pour
travailler sur des données locales — `localhost:8080` pour Firestore, `localhost:9099` pour Auth.
Sans `.env.local`, `getAuth` lève `auth/invalid-api-key` au chargement et la page reste blanche.

## Déploiement

Firebase Hosting, sur le site par défaut du projet :

```bash
npm run deploy:admin              # projet default
npm run deploy:admin:production   # projet production
```

Rien à bâtir avant : le bloc `hosting` de `firebase.json` sert `apps/admin/dist` et le construit
lui-même, son `predeploy` lançant `npm run build:admin`. **La console est servie sous `/admin/`** :
les réécritures `/admin` et `/admin/**` → `/admin/index.html` sont ce qui fait tenir une SPA derrière
un rechargement de page, et l'attrape-tout `**` → `/index.html` sert la **page de présentation** de
la racine — `apps/admin/index.html`, une page statique sans bundle qui porte sa propre copie des
tokens, comme celles de `public/legal/`. Vite bâtit les deux : `build.rollupOptions.input` déclare
`index.html` (l'accueil) et `admin/index.html` (la console), d'où `dist/index.html` et
`dist/admin/index.html` autour d'un même `dist/assets/`. Les assets portent leur hash dans leur nom,
donc `/assets/**` part `immutable` pour un an, tandis que `**/*.html` reste `no-cache` — sans quoi
un déploiement resterait invisible le temps du cache par défaut de Hosting sur le document d'entrée.

**`public/legal/` n'appartient pas à la console.** Ce sont les CGU, les mentions légales, la
politique de confidentialité, la page d'assistance et les normes de sécurité des enfants de l'app
mobile (docs/prd.md §5.3), cinq pages HTML écrites à la main que Vite recopie telles quelles dans
`dist/legal/` : elles ne passent jamais par le bundler, donc elles portent leur propre copie des
tokens (`legal.css`) au lieu d'importer `src/index.css`. Elles survivent à la réécriture SPA parce
que Hosting sert un fichier *avant* de réécrire, et `cleanUrls` est ce qui en fait `/legal/cgu`,
`/legal/mentions-legales`, `/legal/confidentialite`, `/legal/assistance` et
`/legal/protection-des-enfants` — la forme que l'app pointe et que les stores reçoivent (l'URL de
confidentialité, celle d'assistance et celle des normes de sécurité des enfants sont des champs
obligatoires des fiches), donc elle ne change pas. **Six réécritures explicites doublent ces
chemins** avant le `**` attrape-tout — cinq pages, plus l'alias anglais `/legal/child-safety` que
la Play Console peut recevoir —, alors que `cleanUrls` suffirait : sans l'un ni l'autre, `/legal/cgu`
répond 200 *avec la page d'accueil*, pas 404 — la panne ne ressemble donc jamais à une panne de routage vue
du dehors. Et la config Hosting n'est en ligne qu'à hauteur du dernier `npm run deploy:admin` :
changer `firebase.json` ne suffit pas, il faut redéployer. L'identité de l'éditeur — Quentin Machard
SAS, RCS Laval 891 303 893, et l'adresse de contact — est écrite en dur dans les cinq pages : elle
est publique, elle ne dépend d'aucun projet Firebase, et `docs/privacy-policy.md` reste la source à
partir de laquelle la politique de confidentialité a été rédigée. Les deux doivent rester d'accord.
La page des normes de sécurité des enfants, elle, doit **nommer l'app et le développeur tels qu'ils
s'affichent sur la fiche Play** : c'est ce que Google vérifie, et une page qui ne les cite pas fait
refuser la fiche (docs/production-checklist.md §2.8).

**Le build inline la config Firebase**, donc le déploiement demande son propre fichier :
`apps/admin/.env.production.local`, que Vite lit avant `.env.local` (et que `*.local` ignore déjà).
Sans lui, le bundle part avec des variables vides et la page reste blanche sur
`auth/invalid-api-key`. Les hôtes d'émulateur ne peuvent plus fuiter dans un déploiement :
`src/lib/firebase.ts` ne les branche que sous `import.meta.env.DEV`, que `vite build` compile à
`false`.

Un domaine personnalisé s'ajoute à la main aux domaines autorisés de Firebase Auth ; le site Hosting
du projet, lui, y est d'office.

## Validation

```bash
npm run typecheck
npm run lint
```
