# StatOwrel — Checklist de mise en production

Ce document est la liste de ce qui reste entre le dépôt d'aujourd'hui et une app installable
depuis l'App Store et le Play Store. Il est écrit à partir du code réellement présent, pas du
produit visé — quand une case dit « manquant », c'est qu'aucune ligne ne la couvre.

Les textes des deux fiches sont dans `docs/store-listing.md`, la politique de confidentialité à
publier dans `docs/privacy-policy.md`.

## Légende

| Niveau | Sens |
|---|---|
| 🔴 **Bloquant store** | La soumission est refusée, ou l'app est rejetée à l'examen |
| 🟠 **Bloquant produit** | Rien ne l'interdit, mais la boucle quotidienne ne fonctionne pas sans |
| 🟡 **À faire avant d'ouvrir les vannes** | Tenable pour un lancement fermé, pas pour un lancement public |
| ⚪ **Après le lancement** | Se traite en 1.1 |

---

## 0. Résumé — les cinq choses qui bloquent aujourd'hui

Dans l'ordre où elles coûtent du temps :

| # | Quoi | Niveau | Où |
|---|---|---|---|
| 1 | **Suppression de compte** — inexistante, exigée par les deux stores | 🔴 | §2.1 |
| 2 | **Politique de confidentialité publiée** — aucune URL n'existe | 🔴 | §2.2 |
| 3 | **Notification du matin** — la tâche existe, l'envoi est un `TODO` | 🟠 | §1.1 |
| 4 | **Signalement d'un utilisateur** — exigé par la guideline 1.2 d'Apple | 🔴 | §2.3 |
| 5 | **Stock de questions approuvées** — un jour sans question est un jour mort | 🟠 | §5.1 |

Les points 1, 2 et 4 sont du travail de développement, pas de la paperasse. Compter deux à trois
jours pour les trois, avant même de créer les fiches.

---

## 1. Fonctionnalités manquantes

### 1.1 🟠 Notification de publication (07:00) et rappel (21:00)

**État.** Le scheduler tire la question à 07:00 Paris et met une tâche en file
(`apps/functions/src/domains/daily-questions/schedules/scheduleDailyQuestion.ts`), mais la tâche
qui la reçoit ne fait rien : `notifyDailyQuestion.ts` journalise et sort, sur un `TODO`. Côté app,
il n'y a **aucune** brique de notification — ni `expo-notifications` dans les dépendances, ni
demande de permission, ni jeton enregistré nulle part.

**Pourquoi c'est un bloquant produit.** Sans push, un utilisateur n'a aucun moyen d'apprendre que
la question est tombée : il doit ouvrir l'app par hasard. La boucle décrite en `docs/prd.md` §3
part de la notification ; c'est elle qui fait le rendez-vous quotidien.

- [ ] Ajouter `expo-notifications` à `apps/app`, demander la permission **après** la première
      réponse et non au premier lancement (un utilisateur qui a joué une fois comprend ce qu'il
      accepte ; une demande à froid se refuse et ne se redemande pas)
- [ ] Stocker le jeton Expo Push sur le profil (`v1_users`), et le retirer à la déconnexion
- [ ] Implémenter l'envoi dans `notifyDailyQuestion` (Expo Push API ou FCM), par lots, en tolérant
      les jetons expirés
- [ ] Ouvrir l'app sur la question du jour quand la notification est touchée
      (`src/navigation/linking.ts` a déjà le point d'entrée)
- [ ] Rappel de 21h pour ceux qui n'ont pas répondu et dont la série est en cours
      (`docs/prd.md` §4.6) — un second scheduler
- [ ] Réglage « notifications » dans le menu, pour couper les deux
- [ ] iOS : créer la clé APNs et la charger dans le projet Firebase / Expo
- [ ] Android : vérifier que le canal de notification par défaut existe et porte l'icône de marque

> ⚠️ Tant que ce point n'est pas fait, **ne pas mentionner la notification dans les fiches**
> (`docs/store-listing.md` §7).

### 1.2 🟡 Clôture de minuit

**État.** Le scheduler de minuit décrit dans `docs/prd.md` §4.6 n'existe pas : rien ne remet
`streak_count` à zéro côté serveur.

**Ce que ça ne casse pas.** L'app corrige déjà l'affichage : `resolveStreakCount`
(`apps/app/src/stats/helpers/streak.ts`) ne montre la série que si la dernière réponse à l'heure
date d'aujourd'hui ou d'hier, et `nextStreakState` côté backend se recalcule depuis
`streak_last_answered_on` plutôt que de faire confiance au compteur. Un utilisateur ne verra donc
jamais une série morte affichée comme vivante.

**Ce que ça laisse.** La valeur stockée dans Firestore est fausse entre une journée manquée et la
réponse suivante. Ça ne se voit nulle part aujourd'hui, mais toute fonctionnalité qui lira
`streak_count` sans le corriger (la série d'un ami dans la liste, un classement, un export) lira
faux. À faire avant la première de ces fonctionnalités.

- [ ] Scheduler quotidien à minuit Paris qui remet `streak_count` à 0 pour les profils dont
      `streak_last_answered_on` est antérieur à la veille

### 1.3 ⚪ Partage du résultat

Le bouton « Partager » de `docs/prd.md` §4.4 et l'image générée n'existent pas. C'est le principal
levier d'acquisition du produit, mais son absence n'empêche ni la soumission ni l'usage.

- [ ] Génération de l'image du résultat (sans les réponses des amis)
- [ ] Bouton de partage sous la carte de récap

### 1.4 ⚪ Proposition de questions depuis l'app

`docs/prd.md` §4.7 n'existe que côté modération (`apps/admin`). L'app ne permet pas de proposer une
question, et l'écran « Mes questions » du menu n'est pas là.

Conséquence pour l'examen : c'est ce qui permet aujourd'hui de déclarer un contenu utilisateur
**entièrement pré-modéré**. Le jour où l'app ouvre la proposition, la §1.9 de
`docs/store-listing.md` est à revoir.

### 1.5 ⚪ Lien et code d'invitation

L'ajout d'ami par lien et par code à 6 caractères (`docs/prd.md` §4.1) n'existe pas ; seul l'ajout
par nom d'utilisateur exact est en place. Le champ `invite_code` n'est même pas modélisé.

Pour un lancement où les utilisateurs s'invitent entre eux, c'est le frottement le plus cher :
il faut connaître le pseudo exact d'un ami, donc l'avoir eu par un autre canal. À traiter tôt en
1.1, mais ce n'est pas un blocage.

---

## 2. Blocages réglementaires

### 2.1 🔴 Suppression de compte

**Exigence.** App Store guideline **5.1.1(v)** : toute app qui permet de créer un compte doit
permettre de le supprimer **depuis l'app**, pas seulement d'en désactiver l'accès. Play a la même
exigence depuis 2023, **plus** une URL web permettant de demander la suppression sans installer
l'app. C'est l'un des motifs de rejet les plus mécaniques qui soient.

**État.** Rien. Le menu (`apps/app/src/menu/screens/MenuScreen.tsx`) n'a que « Se déconnecter ».

- [ ] Callable `users-deleteAccount` dans `apps/functions`, qui dans une transaction :
  - [ ] supprime le profil `v1_users/{uid}`
  - [ ] libère la réservation `v1_usernames/{handle}` — sans quoi le pseudo reste pris à jamais
  - [ ] supprime **les deux moitiés** de chaque amitié (`v1_user_friends` chez soi et chez l'autre)
  - [ ] supprime les mois de calendrier `v1_users/{uid}/v1_user_calendar_months`
  - [ ] **anonymise** les réponses passées plutôt que de les supprimer (`docs/prd.md` §4.1) : les
        compteurs `answer_counts` sont des agrégats et ne peuvent pas être décrémentés sans fausser
        les statistiques de tout le monde. Vider `user_id` et retirer le document de son chemin
        nominatif, ou le réécrire sous un identifiant aléatoire
  - [ ] supprime le compte Firebase Auth en dernier
- [ ] Écran « Réglages » dans le menu, avec l'entrée « Supprimer mon compte », une confirmation
      explicite qui nomme ce qui sera perdu (série, calendrier, amis), et une seconde saisie du
      mot de passe ou une ré-authentification pour les comptes sociaux
- [ ] Page web de demande de suppression, exigée par Play (§2.2 pour l'hébergement)
- [ ] Vérifier que le chemin est atteignable en moins de trois taps depuis l'écran d'accueil —
      un examinateur qui ne le trouve pas rejette

### 2.2 🔴 Politique de confidentialité et pages légales publiées

**Exigence.** URL obligatoire dans les deux consoles, et **accessible publiquement, sans
connexion**, au moment de l'examen.

**État.** Les cinq pages sont écrites et servies par le Firebase Hosting qui porte déjà
`apps/admin` : `/legal/cgu`, `/legal/mentions-legales`, `/legal/confidentialite`,
`/legal/assistance` et `/legal/protection-des-enfants` (§2.8) — `apps/admin/public/legal/`. L'identité de l'éditeur y est renseignée —
Quentin Machard SAS, RCS Laval 891 303 893 — et l'adresse de contact est la même partout.
`docs/privacy-policy.md` reste la source à partir de laquelle la page a été écrite. Il reste à
choisir le domaine, à déployer, et à renseigner les URLs dans les deux consoles.

- [x] Politique de confidentialité écrite et servie sur `/legal/confidentialite`
      (`apps/admin/public/legal/confidentialite.html`)
- [x] Page d'assistance écrite et servie sur `/legal/assistance`
      (`apps/admin/public/legal/assistance.html`), adresse de contact renseignée
- [x] CGU et mentions légales complétées — éditeur, siège, RCS, TVA, contact
- [x] Normes de sécurité des enfants écrites et servies sur `/legal/protection-des-enfants`
      (`apps/admin/public/legal/protection-des-enfants.html`), doublées de l'alias
      `/legal/child-safety` — voir §2.8
- [x] Lier la politique de confidentialité **depuis l'app** — `LegalLinks` (Menu, connexion,
      inscription) porte les trois liens ; Apple le vérifie
- [ ] Choisir le domaine (voir `docs/store-listing.md` §4)
- [ ] Publier la page de demande de suppression de compte sur `/suppression-compte`, exigée par Play
- [ ] `npm run deploy:admin` — la config Hosting n'est en ligne qu'à hauteur du dernier déploiement
- [ ] Renseigner les URLs dans App Store Connect et dans la Play Console
- [ ] Vérifier que les URLs répondent en HTTPS sans redirection ni mur de connexion
- [ ] Faire relire les quatre pages par un juriste

> L'attrape-tout de `firebase.json` (`"source": "**"` → `/index.html`) sert la page de présentation
> sur **toutes** les routes qui ne sont ni un fichier ni `/admin/**`. Chacune des cinq pages porte
> donc sa propre réécriture explicite avant l'attrape-tout : sans elle, `/legal/confidentialite`
> répond 200 **avec la page d'accueil**, ce qui ne ressemble pas à une panne de routage vu du dehors.

### 2.3 🔴 Signalement d'un utilisateur

**Exigence.** App Store guideline **1.2** : une app avec du contenu généré par les utilisateurs
doit offrir un filtrage, un **mécanisme de signalement**, un blocage, et un traitement des
signalements sous 24 heures.

**État.** Trois des quatre exigences sont déjà satisfaites par la conception, et c'est ce qui rend
le quatrième point peu coûteux :

| Exigence | État |
|---|---|
| Filtrage du contenu répréhensible | ✅ Les questions sont approuvées une par une dans `apps/admin` ; les réponses sont des options pré-écrites |
| Blocage d'un utilisateur abusif | ✅ Retirer un ami supprime les deux moitiés de l'amitié (`src/friends/data/friendships.ts`) |
| Contact avec l'éditeur | ✅ `/legal/assistance`, dès que son adresse e-mail est renseignée |
| **Signalement** | ❌ **manquant** |

Le seul contenu qu'un utilisateur écrit et qu'un autre voit est son **nom d'utilisateur**. C'est
suffisant pour justifier un signalement : un pseudo injurieux est visible de tous ses amis.

- [ ] Action « Signaler ce pote » dans le menu de la ligne d'ami
      (`src/friends/components/FriendRow.tsx` a déjà le `DropdownMenu`, à côté de « Retirer ce pote »)
- [ ] Collection `v1_user_reports` : qui signale, qui est signalé, motif, date
- [ ] Le signalement retire aussi l'amitié — signaler quelqu'un et continuer à le voir n'a pas de sens
- [ ] Un endroit pour les lire (une seconde table dans `apps/admin`, ou une alerte e-mail au départ)
- [ ] Documenter le délai de traitement de 24h dans la politique de confidentialité

### 2.4 🔴 Compte de démonstration pour l'examen

L'app est **intégralement** derrière une connexion : sans identifiants, l'examinateur voit un écran
de login et rejette.

- [ ] Créer un compte e-mail + mot de passe sur le projet de production
- [ ] Lui faire répondre à cinq à dix journées passées, pour que le calendrier ne soit pas vide
- [ ] Lui donner **deux amis acceptés** ayant répondu, pour que la liste d'amis du résultat
      s'affiche
- [ ] Le protéger de la purge : ne jamais le supprimer entre deux soumissions
- [ ] Renseigner les identifiants dans App Store Connect **et** dans la Play Console (onglet
      « Accès à l'application »), avec les notes de `docs/store-listing.md` §1.10

### 2.5 🔴 Connexion avec Apple

**Exigence.** Guideline **4.8** : dès qu'un autre service tiers est proposé (ici Google), « Se
connecter avec Apple » doit l'être au même niveau.

**État.** ✅ Fait. `expo-apple-authentication` est branché, `usesAppleSignIn: true` est dans
`app.config.ts`.

- [ ] Vérifier que la capability « Sign in with Apple » est bien activée sur l'App ID de production
      `fr.quentinmachard.statowrel` dans le portail développeur
- [ ] Vérifier que le bouton Apple est visible **au même niveau visuel** que Google, pas relégué

### 2.6 🟡 Âge minimum et mentions légales

- [x] Âge minimum fixé à **16 ans** — l'app est classée 16+ sur les fiches, et les CGU, la
      politique de confidentialité et les normes de sécurité des enfants disent le même âge. Le
      public cible Play ne coche que **16-17 et 18 et plus** (§2.6 de `docs/store-listing.md`) ;
      toute modification doit être répercutée dans les quatre endroits à la fois
- [ ] Décider si une porte d'âge est nécessaire à l'inscription. Sans elle, la seule protection est
      la déclaration de la fiche ; avec, c'est un frottement de plus sur un parcours déjà long
- [ ] Conditions générales d'utilisation : l'EULA standard d'Apple suffit pour la 1.0 si aucun
      terme particulier n'est nécessaire ; Play n'en exige pas

### 2.7 🟡 Ce que le nom d'éditeur publie

Play impose depuis 2024 la vérification du développeur : un compte **personnel** voit son **nom et
son adresse postale** affichés publiquement sur la fiche.

- [ ] Trancher entre compte personnel et structure **avant** de créer le compte Play — le type de
      compte ne se change pas après coup

### 2.8 🔴 Normes de sécurité des enfants (Play)

**Exigence.** La [politique relative aux normes pour la sécurité des
enfants](https://support.google.com/googleplay/android-developer/answer/9878809) de Google Play
s'applique à **toute** application de réseau social ou de rencontre, sans seuil d'audience. Elle
demande trois choses, déclarées dans la Play Console (« Contenu de l'application » → « Normes pour
la sécurité des enfants ») :

1. un lien vers des **normes publiées, publiques et actives** interdisant explicitement les abus
   sexuels sur des enfants et l'exploitation sexuelle d'enfants (**CSAE**) ;
2. un **point de contact** valide pour les problèmes de sécurité des enfants ;
3. le respect des lois applicables en matière de CSAE.

Les normes publiées doivent charger sans erreur, sans mur de connexion, être accessibles depuis
n'importe quel pays, parler de CSAE ou de sécurité des enfants, et **nommer l'application ou le
développeur tels qu'ils s'affichent sur la fiche Play**. Un refus de la fiche a été prononcé sur ce
motif (« Normes publiées non valides »), et le motif se corrige puis se resoumet dans le même
formulaire.

**État.** La page est écrite : `apps/admin/public/legal/protection-des-enfants.html`, servie sur
`/legal/protection-des-enfants` et sur son alias anglais `/legal/child-safety`. Elle nomme
StatOwrel et Quentin Machard SAS, énumère les comportements interdits (CSAM y compris généré par
IA, sexualisation d'un mineur, grooming, sextorsion, traite, contenu intime non consenti), rappelle
l'âge minimum de 16 ans, décrit ce que la conception du service rend impossible (aucun envoi de
fichier, aucune messagerie privée, aucune découverte d'inconnus), donne le point de contact et le
délai de 24 heures, la marche à suivre en cas de danger immédiat (17, PHAROS, NCMEC) et ce qui est
fait d'un signalement. Le texte est repris en anglais sur la même page. Les CGU la déclarent partie
intégrante, et la politique de confidentialité comme la page d'assistance y renvoient.

- [x] Page écrite, réécritures ajoutées dans `firebase.json` avant l'attrape-tout SPA
- [x] Lien porté par l'app elle-même — `LegalLinks` (Menu, connexion, inscription)
- [ ] `npm run deploy:admin:production` — **la page n'existe pour Google qu'une fois déployée**
- [ ] Vérifier en navigation privée que `/legal/protection-des-enfants` répond 200 en HTTPS, sans
      redirection ni mur de connexion, et affiche bien la page et non la console
- [x] Public cible Play limité à 16-17 et 18 et plus, cohérent avec les CGU — sans effet sur
      l'exigence elle-même : la politique vise toute app sociale, 16-17 restant une tranche de
      mineurs
- [ ] Vérifier que le nom affiché sur la fiche Play (nom de l'app, nom du développeur) est bien
      l'un de ceux que la page cite mot pour mot ; le corriger dans la page si le compte Play
      publie un autre nom d'éditeur (§2.7)
- [ ] Renseigner l'URL et le point de contact dans la Play Console, puis **resoumettre** la
      déclaration
- [ ] Envisager une adresse dédiée (`securite-enfants@…`) plutôt que l'adresse personnelle, le jour
      où le domaine est acheté (§2.2)

---

## 3. Infrastructure Firebase

### 3.1 🔴 Séparer le projet de production

**Problème.** `.firebaserc` fait pointer les deux alias sur le même projet :

```json
{ "projects": { "default": "statowrel-app", "production": "statowrel-app" } }
```

Donc `npm run deploy:functions`, `npm run deploy:firestore` et `npm run set-admin` — tous les
scripts « sans `:production` », c'est-à-dire ceux qu'on tape sans réfléchir — écrivent **en
production**. Un déploiement de règles à moitié fini coupe l'app pour tout le monde, et la
distinction que `README.md` et `CLAUDE.md` décrivent n'existe pas dans les faits.

- [ ] Créer un second projet Firebase (`statowrel-app-dev` ou équivalent) et le mettre sur l'alias
      `default`
- [ ] Y recréer : Auth (Google + Apple + e-mail), les clients OAuth, Firestore, les index
- [ ] Faire pointer la variante `development` dessus : y enregistrer les deux applications
      `fr.quentinmachard.statowrel.dev` (iOS + Android) et déposer leurs fichiers de service
      dans `apps/app/firebase/` + les variables fichier EAS `GOOGLE_SERVICES_JSON` /
      `GOOGLE_SERVICES_PLIST` de l'environnement `development` (voir `apps/app/firebase/README.md`)
- [ ] Vérifier qu'un `npm run deploy:firestore` sans suffixe ne touche plus la production

### 3.2 🔴 Variables d'environnement des builds EAS

**Piège concret.** Depuis le passage à React Native Firebase, la configuration Firebase n'est plus
une poignée de variables `EXPO_PUBLIC_*` : ce sont deux **fichiers** — `google-services.json` et
`GoogleService-Info.plist` — que `app.config.ts` intègre au binaire au moment du build. Ils sont
gitignorés, et EAS exclut de l'upload tout ce qui est gitignoré : un build ne peut donc les lire que
par les variables fichier `GOOGLE_SERVICES_JSON` / `GOOGLE_SERVICES_PLIST`, et rien dans le dépôt ne
garantit qu'elles existent. Sans elles le build ne part même pas — le plugin
`@react-native-firebase/app` échoue faute de fichier —, ce qui est le bon échec : bruyant, et avant
le binaire. Mais **changer de projet Firebase demande désormais un build**, jamais une simple
variable d'environnement.

- [ ] `APP_VARIANT=production eas env:list --environment production` : vérifier `GOOGLE_SERVICES_JSON` et
      `GOOGLE_SERVICES_PLIST` (type `file`), et qu'elles pointent bien sur les fichiers du projet
      **de production**, pour le bundle `fr.quentinmachard.statowrel`
- [ ] Idem pour les environnements `preview` (mêmes fichiers que production, identifiant partagé)
      et `development` (les fichiers `.dev`)
- [ ] Supprimer les `EXPO_PUBLIC_FIREBASE_*` devenues mortes des trois environnements
      (`APP_VARIANT=production eas env:delete`) — plus rien ne les lit. Le préfixe `APP_VARIANT` est
      obligatoire sur **toute** commande `eas` hors build : `app.config.ts` lève sinon, et EAS ne
      rapporte que `cli config --json exited with non-zero code: 1`, qui ne nomme rien
- [ ] Vérifier qu'aucune variable `*_EMULATOR_HOST` / `*_EMULATOR_PORT` n'est définie en
      production — elles feraient pointer l'app sur un émulateur inexistant
- [ ] Vérifier que `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` du profil `production` correspond bien au
      client OAuth iOS du projet de production (le profil `preview` partage le même, à dessein —
      voir le commentaire de `app.config.ts`)
- [ ] Installer le build de production sur un appareil vierge et vérifier qu'il ouvre bien sur le
      splash puis l'écran de connexion — c'est le seul test qui prouve ce point

### 3.3 🟡 App Check

L'app écrit directement dans Firestore (réponses, amitiés, profil) sous le contrôle des règles.
Les règles sont sérieuses (301 lignes dans `packages/firestore-config/firestore.rules`), mais elles
autorisent par définition ce qu'un client légitime fait — et la clé d'API est publique dans le
bundle. Sans App Check, n'importe qui peut rejouer ces écritures depuis un script : créer des
milliers de comptes, ou fausser les `answer_counts` qui font tout l'intérêt du produit.

- [ ] Activer App Check (App Attest sur iOS, Play Integrity sur Android)
- [ ] Le passer d'abord en mode « monitoring », le temps de vérifier qu'aucun trafic légitime n'est
      rejeté, puis l'imposer sur Firestore et les Functions

### 3.4 🟡 Quotas, coûts et sauvegardes

- [ ] Plan Blaze activé (obligatoire pour les Cloud Functions v2 et Cloud Tasks)
- [ ] Alerte de budget sur le projet de production, avec un seuil qui déclenche un e-mail bien
      avant de coûter cher
- [ ] Sauvegardes Firestore programmées (`gcloud firestore backups schedules create`) — il n'y en a
      aucune aujourd'hui, et les réponses ne sont reconstructibles depuis rien
- [ ] Vérifier la **région** du Firestore de production : les Functions sont en `europe-west1`
      (`apps/functions/src/libs/firebase-admin.ts`), une base ailleurs ajouterait de la latence à
      chaque lecture et poserait une question de transfert de données hors UE dans la politique de
      confidentialité
- [ ] Vérifier que le déclencheur de réponse et le scheduler ont survécu au déploiement
      (`firebase functions:list`)

### 3.5 🟡 Règles et index déployés

- [ ] `npm run deploy:firestore:production` avant la première ouverture
- [ ] Vérifier que l'index composite du calendrier (`v1_daily_question_answers`,
      `user_id ASC, date ASC`, portée groupe de collections) est bien **Enabled** et non
      « Building » — une requête sur un index en construction échoue
- [ ] Les règles Storage refusent tout (`allow read, write: if false`), ce qui est correct
      aujourd'hui : rien n'écrit dans Storage. À revoir le jour où l'avatar devient téléversable

---

## 4. Build et publication

### 4.1 Comptes et identités

- [ ] Compte Apple Developer Program actif (99 $/an), et **vérifier la date d'expiration** : un
      compte expiré retire l'app du store sans préavis
- [ ] Compte Google Play Console (25 $, une fois) et vérification d'identité terminée — elle prend
      plusieurs jours et bloque tout
- [ ] Application créée dans App Store Connect avec le bundle `fr.quentinmachard.statowrel`
- [ ] Application créée dans la Play Console avec le package `fr.quentinmachard.statowrel`
- [ ] Accord de licence payante / fiscal : à compléter même pour une app gratuite, sinon la fiche
      reste bloquée en « En attente »

### 4.2 Configuration EAS

- [ ] Remplir le bloc `submit.production` d'`eas.json`, aujourd'hui vide :
  - [ ] iOS : `appleId`, `ascAppId`, `appleTeamId`
  - [ ] Android : chemin de la clé de compte de service, `track` (`internal` d'abord)
- [ ] Vérifier les identifiants de signature : `eas credentials` pour les deux plateformes
- [ ] Sauvegarder la clé de signature Android **hors d'EAS** — la perdre interdit toute mise à jour
      de l'app à vie (ou activer Play App Signing, qui règle le problème pour de bon)
- [ ] `version` reste `1.0.0` dans `app.config.ts` ; `autoIncrement` et
      `appVersionSource: "remote"` gèrent déjà le numéro de build

### 4.3 Recette avant soumission

À faire sur un build **`production`**, pas `preview` — même si les deux partagent l'identifiant,
seul le premier porte la configuration finale.

- [ ] `npm run typecheck` et `npm run lint` verts (il n'y a **aucune CI** sur ce dépôt : personne
      d'autre ne le fera)
- [ ] `npm run build:prod:ios` et `npm run build:prod:android`
- [ ] Installer sur un **appareil physique neuf**, pas un simulateur
- [ ] Parcours complet sur les deux plateformes :
  - [ ] Inscription e-mail, choix du pseudo, arrivée sur l'écran Stats
  - [ ] Connexion Google
  - [ ] Connexion Apple (iOS), **y compris avec « Masquer mon e-mail »** — le profil accepte un
        `email` nul, à vérifier de bout en bout
  - [ ] Double tap : premier tap, changement d'option, second tap, bascule sur le résultat
  - [ ] Invitation d'un pote par pseudo exact, puis acceptation depuis l'autre appareil
  - [ ] Rattrapage d'un jour passé depuis le calendrier
  - [ ] Réouverture d'un jour déjà répondu
  - [ ] Déconnexion, reconnexion, la session persiste au relancement
  - [ ] Suppression de compte (une fois la §2.1 faite)
- [ ] Mode avion : vérifier qu'aucun écran ne reste bloqué sur un chargement infini
- [ ] Vérifier l'écran de lancement (l'étoile sur le jaune) et l'icône sur les deux plateformes
- [ ] Vérifier l'apparence sur un petit écran (iPhone SE) et avec la police système agrandie

### 4.4 Distribution progressive

- [ ] TestFlight interne (jusqu'à 100 testeurs, sans examen) — au moins une semaine de vraie
      utilisation quotidienne, c'est le seul moyen de voir si le rendez-vous de 7h tient
- [ ] Piste de test interne Play, en parallèle
- [ ] Play : publier en **déploiement progressif** (20 %) plutôt qu'à 100 %, ce qui permet
      d'arrêter une version cassée. iOS a l'équivalent avec la « publication progressive »
- [ ] Prévoir que le **premier examen Play est long** (jusqu'à 7 jours pour un nouveau compte
      d'éditeur), et qu'il faut souvent 14 jours de test fermé avec 12 testeurs avant de pouvoir
      passer en production sur un compte personnel — à démarrer très tôt

---

## 5. Contenu et exploitation

### 5.1 🟠 Stock de questions

`drawApprovedQuestion` tire au hasard dans les questions `approved`. Le pot vide n'est pas une
erreur qui bloque : le scheduler journalise une erreur et **la journée n'a tout simplement pas de
question** — le calendrier la rend inerte, personne ne peut y répondre, et la série de tout le
monde se casse le lendemain. Un jour sans question est le pire incident possible pour ce produit.

- [ ] Approvisionner **au moins 90 questions** approuvées avant l'ouverture (trois mois de
      marge). `npm run seed-questions` remplit le pot depuis
      `apps/functions/scripts/questions.seed.json`, en `pending` — l'approbation se fait ensuite
      dans `apps/admin`
- [ ] Relire les questions du point de vue de l'examen : le ton assumé (`docs/prd.md` §1) est
      compatible avec un classement 12+, mais une question ouvertement sexuelle ferait basculer la
      classification. Vérifier qu'aucune ne dépasse
- [ ] Vérifier que chaque question a entre 2 et 6 options, et que chaque option porte bien son
      `stat_label` — c'est lui qui s'affiche dans le résultat, pas le libellé
- [ ] **Alerte quand le pot descend sous 30 questions.** Aujourd'hui, la seule trace est une ligne
      d'erreur dans les logs, le matin même, une fois qu'il est trop tard
- [ ] Décider quoi faire d'une journée sans question (`docs/prd.md` §9) : rediffuser, ou tenir une
      réserve de secours. En attendant, la réponse est « ne jamais laisser le pot se vider »

### 5.2 🟡 Modération

- [ ] Déployer la console : `npm run deploy:admin:production`
- [ ] Accorder le rôle admin : `npm run set-admin -- <email> --production`
- [ ] Vérifier que la console est bien fermée aux comptes sans le claim `admin`
- [ ] Vérifier que le premier jour est amorcé : `npm run seed-daily-questions` diffuse les cinq
      jours précédents, pour qu'un nouvel arrivant ne tombe pas sur un calendrier vide

### 5.3 🟡 Le premier matin

- [ ] Vérifier que `scheduleDailyQuestion` s'est bien déclenché à 07:00 Paris, en production, au
      moins une fois **avant** l'ouverture au public (`firebase functions:log`)
- [ ] Vérifier qu'une réponse incrémente bien `answer_counts` et projette bien le mois de
      calendrier de l'utilisateur
- [ ] Vérifier le passage à l'heure d'été : le scheduler est déclaré en `Europe/Paris`, donc géré,
      mais c'est le genre de chose qui se vérifie une fois

---

## 6. Observabilité

Il n'y a aujourd'hui **aucun** SDK de crash reporting ni d'analytics dans l'app. C'est un choix
défendable pour la 1.0 (rien à déclarer dans les formulaires de confidentialité, §1.11 de
`docs/store-listing.md`), mais cela veut dire qu'un plantage au démarrage sur un modèle d'appareil
donné ne se saura que par un avis 1 étoile.

- [ ] 🟡 Décider : lancer sans, et surveiller les « Organisateurs » d'App Store Connect et
      l'Android Vitals de Play (gratuits, sans SDK, mais sans détail), ou intégrer Sentry
- [ ] ⚪ Si un SDK est ajouté : **remettre à jour les deux déclarations de confidentialité**, elles
      deviennent fausses au moment du merge
- [ ] 🟡 Alerte sur les erreurs des Cloud Functions (Cloud Logging → alerte sur la sévérité
      `ERROR`), au minimum sur `scheduleDailyQuestion` — c'est là que « pas de question aujourd'hui »
      se signale

---

## 7. Ordre d'exécution

L'enchaînement qui minimise l'attente, sachant que les examens et vérifications de compte sont les
temps morts les plus longs :

| Quand | Quoi |
|---|---|
| **D'abord, en parallèle du code** | Créer les comptes Apple et Play, lancer la vérification d'identité Play (§4.1), trancher le nom d'éditeur (§2.7), acheter le domaine (§2.2) |
| **Semaine 1** | Suppression de compte (§2.1), signalement (§2.3), publication des pages légales (§2.2) |
| **Semaine 1** | Séparer le projet Firebase (§3.1), vérifier les variables EAS (§3.2) |
| **Semaine 2** | Notifications (§1.1) — le plus gros morceau, et ce sans quoi le produit n'a pas de rendez-vous |
| **Semaine 2** | Approvisionner et approuver 90 questions (§5.1) |
| **Semaine 3** | Build production, recette sur appareils (§4.3), TestFlight + piste interne Play (§4.4) |
| **Semaine 3** | Créer le compte de démonstration (§2.4), captures d'écran (§3 de `docs/store-listing.md`) |
| **Semaine 4** | Remplir les deux fiches, soumettre iOS et Android le même jour |
| **Après** | Clôture de minuit (§1.2), partage (§1.3), lien d'invitation (§1.5) |

---

## 8. Le jour du lancement

- [ ] Un appareil sous la main avec le build de production installé, pour vérifier le premier matin
- [ ] Le tableau de bord Cloud Logging ouvert entre 07:00 et 07:05
- [ ] Le budget Firebase surveillé les premiers jours : c'est le trafic réel qui dit si le modèle
      de lecture tient
- [ ] Ne **pas** publier les deux stores à des jours différents : les gens s'invitent entre eux, et
      une invitation vers une app indisponible sur l'autre plateforme est perdue
- [ ] Prévoir qui répond aux avis et aux e-mails de support la première semaine
