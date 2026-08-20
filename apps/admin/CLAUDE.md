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

## Structure

- `src/lib/firebase.ts` — `initializeApp` + `getAuth` + `getFirestore`, branchés sur les émulateurs quand les `VITE_FIREBASE_*_EMULATOR_*` sont posés. Pas de `initializeAuth` : la persistance `indexedDB` du build navigateur suffit, contrairement à `apps/app`.
- `src/lib/firestore.ts` — `getDocumentRef` / `getCollectionRef`, qui câblent les converters `@statowrel/models`. Jumeau de `apps/app/src/lib/firestore.ts`.
- `src/auth/` — `AuthContext` (session + claim `admin`), `SignInScreen` (e-mail + mot de passe, Google), `AccessDeniedScreen`, `errors.ts` (jamais un code `auth/*` affiché), `schemas.ts`.
- `src/questions/` — `QuestionsTable` (le pot, une ligne par question), `QuestionModal` (**la même modale pour créer et pour éditer**), `schemas.ts` (zod), `data/saveQuestion.ts` (`createQuestion` / `updateQuestion` / `setQuestionStatus`), `data/useQuestions.ts`.
- `src/components/` — `Button`, `TextField`, `Alert`, bâtis sur les classes de `src/index.css`.
- `src/index.css` — les tokens neobrutalisme en variables CSS, **portés depuis `apps/app/src/design/tokens.ts`**. L'app mobile reste la source de vérité : on change là-bas, puis ici.

Apple n'est pas proposé : son flux web demande un Services ID et une clé que le build mobile n'a pas,
et rien ici n'est iOS.

La modale est un `<dialog>` natif : le piège à focus, le fond inerte et la fermeture par Échap sont
ceux du navigateur, pas d'une librairie. Elle n'est montée que pendant qu'elle est ouverte et porte en
`key` ce qu'elle édite, donc le formulaire naît avec les bonnes valeurs au lieu d'être réinitialisé
après coup.

## Écrire, éditer, approuver

`createQuestion` écrit `v1_questions/{ULID}` avec `status: 'pending'`, `author_id` = l'UID connecté et
tout ce qu'une question tirée porte laissé à `null` — `broadcast_at`, `broadcast_on`, `closes_at` — ce
que `firestore.rules` exige d'une création.

**Un ULID d'option ne se régénère jamais.** Une réponse et `answer_counts` pointent dessus, donc
l'édition fait remonter l'id existant à travers le formulaire (champ caché) et n'en mint un que pour
une option tapée pour la première fois.

`updateQuestion` et `setQuestionStatus` passent par `updateDoc` sur les seuls champs concernés, jamais
par un `set()` de tout le document : celui-ci renverrait les `answer_counts` et les tampons de
diffusion lus une seconde plus tôt, écrasant ce que le backend a écrit entre-temps. Ces deux écritures
ne touchent aucun timestamp — si un jour l'une d'elles en écrit un, ce sera un `Timestamp` et pas une
chaîne ISO, `updateDoc` ne passant pas par le converter (voir le `CLAUDE.md` racine).

`useQuestions` lit le pot entier, `orderBy('created_at', 'desc')`, sans filtre : l'interface est
admin-only et c'est le joker `isAdmin()` qui l'ouvre. Abonné plutôt que lu une fois, donc un verdict
rendu depuis FireCMS au même moment apparaît dans le tableau sans rechargement.

Rejeter n'est pas encore là : un rejet demande sa raison, renvoyée à l'auteur, donc un champ de saisie
en plus du bouton. `setQuestionStatus` prend déjà le paramètre. Tant qu'il manque, un rejet se pose à
la main depuis la console Firebase.

## Développement local

```bash
cp apps/admin/.env.example apps/admin/.env.local   # config Firebase web
npm run dev:admin                                       # Vite sur :3003
```

Pointer les `VITE_FIREBASE_*_EMULATOR_HOST`/`_PORT` sur la suite d'émulateurs (`apps/functions`) pour
travailler sur des données locales — `localhost:8080` pour Firestore, `localhost:9099` pour Auth.
Sans `.env.local`, `getAuth` lève `auth/invalid-api-key` au chargement et la page reste blanche.

**Pas de déploiement.** `firebase.json` n'a plus de bloc `hosting` depuis le retrait de FireCMS : le
bundle se construit (`npm run build:admin`) mais rien ne le sert. Le rebrancher demande un site
Firebase Hosting et sa cible, ce qui est un changement à part.

## Validation

```bash
npm run typecheck
npm run lint
```
