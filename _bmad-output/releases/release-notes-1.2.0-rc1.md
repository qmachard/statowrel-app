# StatOwrel 1.2.0-rc1 — notes de version

| Champ | Valeur |
|---|---|
| Version | **1.2.0-rc1** (`version` applicative : `1.2.0` dans `apps/app/package.json` et `apps/app/app.config.ts` — Expo et l'App Store n'acceptent pas de suffixe pré-release) |
| Build iOS | *non attribué* — la rc précède le build TestFlight ; `eas.json` auto-incrémente (`appVersionSource: remote`) |
| Build Android | *non attribué* — idem |
| Date | 2026-09-04 |
| Nature | **pre-release** — première rc de la 1.2.0 |
| Version précédente | **1.1.0** (builds iOS 10 / Android 9), taggée le 2026-09-03 sur `b2d4db5` — `release-notes-1.1.0-rc1.md` |
| Fiche store | **français (France) uniquement** (`docs/store-listing.md`) ; la section anglaise ci-dessous est une réserve, à ne pas publier |

Cette note part de la **1.1.0** et couvre les 24 commits qui l'ont suivie. Le passage en **mineure**
est justifié : la 1.2.0 ouvre une fonctionnalité entière — le **joker** (`docs/prd.md` §4.8), qui
change la règle la plus structurante du produit, celle de la série — et intègre pour la première
fois un **SDK de mesure d'usage**, ce qui déplace une déclaration de confidentialité.

> 🔴 **Cette version ne peut pas être soumise en France en l'état.** Firebase Analytics est intégré
> et collecte dès le premier lancement ; le mécanisme de recueil du consentement (RGPD / CNIL) a été
> **volontairement sorti** de cette version et fait l'objet d'un ticket dédié
> (`docs/production-checklist.md` §6). Deux issues, une seule à choisir avant de soumettre : livrer
> la couche de consentement, ou contraindre la release à ne rien envoyer. Voir « Bloquants ».

> ⚠️ **Cette version change la déclaration de collecte de données des deux stores.** Jusqu'ici la
> réponse « Diagnostics / analyse d'usage » était **Non** dans les deux formulaires. Elle devient
> **Oui**. `docs/store-listing.md` §1.11 et `docs/privacy-policy.md` §3.8 sont déjà à jour ; les
> **formulaires d'App Store Connect et de la Play Console ne le sont pas**, et une déclaration
> fausse est un motif de rejet à part entière.

> ⚠️ **Cette version ne peut pas être soumise avant que le backend soit déployé.** Le bouton
> « Passer avec un Joker » appelle un callable qui n'existe pas encore en production, et les règles
> Firestore de la 1.1.0 refusent le document qu'il écrit. Voir « Déploiements que cette version
> exige » — l'ordre compte.

---

## Ce qui change depuis la 1.1.0

### Dans le binaire

| # | Changement | Effet sur la soumission |
|---|---|---|
| 1 | **Le joker** (`4db85fb` → `0f288d6`) — passer la question du jour sans y répondre, pour 20§, en gardant sa série. Illimité tant que le solde suit, réservé à la journée en cours | **La nouveauté de cette version.** Elle contredit une phrase publiée de la description (« pas de joker ») : `docs/store-listing.md` est déjà corrigé, la fiche en ligne est à corriger le jour de la mise à jour |
| 2 | **Dotation de bienvenue : 50§** (`4db85fb`, `380af59`) — un compte neuf s'ouvre avec de quoi tenter deux jokers avant son premier palier de série | S'annonce avec le joker, jamais seule |
| 3 | **StatCoins renommés StatFlouzz** (`93cfa57`) — partout dans l'interface. Le symbole `§` et le champ Firestore `statcoin_balance` ne bougent pas | À dire en une ligne : un utilisateur de la 1.1.0 verra le mot changer |
| 4 | **En-tête de l'écran Stats redessiné** (`25bbc19`) — le solde passe en haut à droite, en puce `muted`, et suit le défilement ; la carte « Deviens acteur de StatOwrel » se réduit à un bouton nu pleine largeur | Détail visible, « Et aussi ». **La capture 4 de `docs/store-listing.md` §3.1 est à refaire** |
| 5 | **Le bouton « Poser une question » dit ce qui manque** (`25bbc19`) — grisé mais tapable, une alerte native nomme le solde et le reste à gagner au lieu de rester inerte | « Et aussi » |
| 6 | **Firebase Analytics** (`51b1d86`, `69835f8`, `20978f5`) — 8 événements + `screen_view`, UID Firebase en User-ID, ni IDFA ni Google Signals | **Ne s'annonce pas** — ce n'est pas une fonctionnalité. Mais **change les deux déclarations de confidentialité** |
| 7 | **Le joker d'un pote est visible** dans la liste d'amis de la feuille du jour (`cbf905e`) | Se raconte avec le joker |
| 8 | **`ChartBar` au lieu de `BarChart3`** (`b84408d`) — nommage d'icône `lucide` v1.33 | Hors fiche |

### Hors binaire — backend, règles et outillage

| # | Changement | Conséquence |
|---|---|---|
| 9 | **`questions-useJoker`** — le callable qui débite 20§ et écrit le joker sur `v1_daily_question_answers/{uid}` en une transaction, seule porte possible | `deploy:functions` **et** `deploy:firestore` obligatoires |
| 10 | **`users-onUserCreated` → `grantInitialBalance`** (`380af59`) — verse les 50§ côté serveur au profil qu'un client ≤ 1.1.0 a ouvert à 0, idempotent sans marqueur (les trois compteurs du portefeuille *sont* le marqueur) | `deploy:functions` |
| 11 | **`firestore.rules`** — `hasAnswerShape()` refuse toute réponse cliente portant `is_joker: true` ; `startsWithInitialBalance()` remplace `startsEmpty()` et **tolère les deux ouvertures, 0 et 50** | `deploy:firestore`. Sans le déploiement, **le joker est refusé et l'onboarding d'un client 1.2.0 aussi** |
| 12 | **Le joker rejoint `v1_daily_question_answers`** (`b106da1`) — une seule collection au lieu de deux, donc une seule lecture par ami sur la feuille du jour et sur la relance de 18h | `deploy:functions` — `onAnswerCreated` branche sur `is_joker` |
| 13 | **`npm run backfill-statcoins` devient `backfill-statflouzz`** (`93cfa57`) | Le nom change, le comportement non |
| 14 | **`npm run backfill-initial-balance`** (`380af59`) — verse les 50§ aux profils existants qui n'ont jamais touché leur portefeuille | À passer une fois, après le déploiement des functions |
| 15 | **`docs/analytics.md`** — plan de taggage, source unique des événements | Hors produit, mais **c'est la pièce que la déclaration de confidentialité cite** |
| 16 | **Ports des émulateurs déplacés** (`731696e`, `5b147a7`) — auth 9098, functions 5002, firestore 8082, hosting 5001, UI 4001, storage 9198 ; Metro sur 8083 | Développement seulement. Un `.env.local` ou un script qui pointait les anciens ports est à corriger |

### Effets de bord à ne pas manquer

- **Un binaire 1.2.0 devant les règles 1.1.0 ne peut pas créer de compte.** `startsWithInitialBalance()`
  est ce qui autorise l'ouverture à 50§ ; la règle 1.1.0 (`startsEmpty()`) exige `0`. Les règles se
  déploient donc **avant** de distribuer le moindre build.
- **La réciproque est vraie et volontaire** : les règles 1.2.0 acceptent encore l'ouverture à `0`,
  pour que les installations ≤ 1.1.0 puissent finir leur onboarding sans mise à jour du store. C'est
  `users-onUserCreated` qui les remet à niveau dans la seconde. **Ne resserrer sur `== 50` que
  lorsque le parc ≤ 1.1.0 aura fondu** — le commentaire de la règle le dit, il faudra y revenir.
- **Le joker ne compte pas dans `answer_counts`.** Passer un jour n'a pas d'option à compter : les
  pourcentages d'une question ne bougent pas d'un joker, et c'est voulu.
- **Un jour est `days` OU `jokers`, jamais les deux.** Le callable refuse un joker sur un jour déjà
  répondu, l'écriture de réponse refuse un jour déjà passé au joker.
- **Firebase Analytics envoie dès le premier lancement d'un build `production`.** Le drapeau
  `EXPO_PUBLIC_ANALYTICS_FORCE_ENABLED` ne gouverne que le mode développement. Il n'y a **aucun**
  interrupteur dans l'app — la ligne d'opt-out du Menu a été retirée exprès (`20978f5`), une bascule
  isolée valant moins que rien sans la couche de consentement autour.
- **`@react-native-firebase/analytics` est un module natif** : il faut un nouveau dev client, un
  simple redémarrage de Metro ne suffit pas. `RNFBAnalytics` est ajouté au `forceStaticLinking` iOS.

---

## Français

### Texte promotionnel — 170 caractères max

Champ modifiable **sans nouvelle soumission**. Trois options, la première reste la baseline de
`docs/store-listing.md` §1.3 ; les deux autres mettent le joker devant.

**Option 1 — la baseline, inchangée** (166 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Une par jour, la même pour tous : tu réponds, tu découvres ta stat, puis celles de tes potes.
```

**Option 2 — le joker** (149 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Une journée sans envie ? Passe-la avec un joker : ta série tient quand même.
```

**Option 3 — la boucle** (153 caractères)

```
Une question par jour à 7h. Ta série monte, elle te paie en StatFlouzz. Dépense-les pour poser ta question — ou pour passer un jour sans casser ta série.
```

L'option 1 reste retenue par défaut — la baseline ne se reformule jamais (`docs/store-listing.md`
§6). L'option 2 est celle à basculer le jour de la mise en ligne.

### Nouveautés de cette version — 4000 caractères max

**Deux textes, un seul à coller** — le choix dépend de ce qui est en ligne au moment de soumettre.

**A. Aucune version n'a encore été publiée.** La 1.2.0 est alors la **première version publiée** :
le texte de la 1.1.0 est repris, le joker et la dotation de bienvenue y entrant comme des parties du
produit et non comme des nouveautés.

```
Première version de StatOwrel.

Une question par jour, la même pour tout le monde. Elle tombe à 7h du matin. Tu réponds en deux taps, tu découvres dans quel pourcentage tu tombes, puis ce que tes potes ont répondu.

Ta série monte tant que tu ne rates pas un jour. Tous les dix jours d'affilée, tu gagnes 100 StatFlouzz, la monnaie de l'app. Tu démarres avec 50 StatFlouzz offerts.

Une journée sans envie, sans temps, sans réseau ? Passe-la avec un joker : 20 StatFlouzz, la journée est comptée, ta série est préservée, et tu vois quand même les réponses de tes potes.

Cent StatFlouzz, c'est le prix d'une question. Tu écris la tienne, la modération la valide, et elle peut tomber un matin pour tout le monde.

Ton calendrier garde toutes les questions déjà posées, y compris celles d'avant ton arrivée : tu peux y répondre après coup pour compléter ta collection.

Tes potes s'ajoutent par leur nom d'utilisateur exact. Pas de recherche, pas d'annuaire, pas de profils publics. Quand l'un d'eux répond à une journée, une pastille apparaît sur la case du calendrier.

Et aussi : un rappel le soir si tu n'as pas encore joué, une découverte du jour si tu as déjà répondu, et la suppression de ton compte depuis les réglages, en deux taps.

Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.

Un souci, une idée, une question à proposer : écris-nous.
```

*(1 389 caractères)*

**B. Une 1.1.x est déjà en ligne.** Le texte annonce le delta.

```
Ta série ne casse plus par accident.

Une journée sans temps, sans envie, sans réseau ? Passe-la avec un joker. Vingt StatFlouzz, la journée est comptée, ta série continue, et tu vois quand même ce que tes potes ont répondu. Autant de jokers que ton porte-monnaie peut en payer.

Les StatCoins s'appellent maintenant des StatFlouzz. Même monnaie, même règle : 100 à chaque palier de dix jours de série. Et tu démarres désormais avec 50 StatFlouzz offerts, de quoi t'offrir deux jokers avant même ton premier palier.

Ton solde a déménagé en haut de l'écran d'accueil : il te suit pendant que tu fais défiler, juste au-dessus du bouton qui le dépense.

Et aussi : le bouton « Poser une question » te dit maintenant ce qui te manque au lieu de rester inerte.

Un souci, une idée, une question à proposer : écris-nous.
```

*(815 caractères)*

Ton : tutoiement, aucun emoji, aucun markdown, paragraphes courts — conformément à
`docs/store-listing.md` §6.

> ⚠️ **Ne rien annoncer sur la mesure d'usage.** Firebase Analytics n'est pas une fonctionnalité et
> n'a rien à faire dans les nouveautés. Sa place est dans la déclaration de collecte de données et
> dans la politique de confidentialité, où elle est déjà.
>
> ⚠️ **Ne rien ajouter sur le partage du résultat.** Il n'existe toujours pas dans le binaire
> (`docs/production-checklist.md` §1.3). Décrire une fonctionnalité absente est le motif de rejet
> 2.3.1.
>
> ⚠️ **Ne pas promettre d'être prévenu quand une question est validée ou tirée.** Rien ne le
> notifie ; c'est toujours à faire (`docs/production-checklist.md` §1.4).
>
> ⚠️ **Ne pas écrire que le joker « rattrape » un jour manqué.** Il ne s'utilise que sur la question
> du jour encore ouverte. Un jour déjà raté se complète depuis le calendrier, et cela ne rallume
> jamais la série.

### Description complète — 4000 caractères max

La description de la 1.1.0 avec **deux corrections et un bloc en plus**. La correction obligatoire
est celle de `TA SÉRIE` : elle disait « pas de joker », ce qui devient faux avec cette version.

```
Les questions que personne ne pose. Les réponses que tout le monde veut.

Une par jour. La même pour tout le monde.

StatOwrel est un réseau social entre potes sans feed, sans likes et sans commentaires. Une question personnelle, absurde, celle que personne ne pense à poser. Tu as la journée pour y répondre, et ça te prend dix secondes.

TU RÉPONDS, TU DÉCOUVRES DEUX CHOSES

1. Ta StatOwrel — ta réponse replacée dans la statistique de tous les autres. « Comme 68% des gens, tu es un.e efficace. » Plus ta réponse est minoritaire, plus le résultat est rare : au-dessous de 25% il passe rare, au-dessous de 10% ultra rare.

2. Les réponses de tes potes — débloquées seulement une fois que tu as répondu toi-même. Pas de voyeurisme, pas de triche : on ne regarde pas les autres sans avoir joué.

LA NOTIFICATION DE 7H

Tous les matins à 7h, la question tombe. Tu as jusqu'à minuit. Le soir, un rappel si tu as oublié — et si tu as déjà joué, on te dit plutôt d'aller voir ce que tes potes ont répondu.

LE DOUBLE TAP

Il n'y a pas de bouton « Valider ». Un tap pour choisir ton option, un deuxième sur la même option pour la valider. C'est tout, et c'est étrangement satisfaisant. La réponse est définitive — c'est exactement ce qui rend la statistique honnête.

DES QUESTIONS QU'ON A ENVIE DE SCREENSHOTER

« Ton dentifrice, tu le presses par le bout, au milieu, ou tu l'écrases n'importe comment ? » Méthodique, sauvage, ou anarchiste.

« Tes plantes ? » Arroseur.euse, ou killer.euse.

Intime sans être gênant, jamais moralisateur. Juste la vanne du matin, et la petite vérité qu'elle révèle sur toi.

TA SÉRIE

Réponds avant minuit et ta série monte d'un jour. Rate une journée, elle repart à zéro — sauf à dépenser un joker pour la passer sans la casser. Ton meilleur score reste affiché, lui, pour toujours.

TON JOKER

Une journée sans temps, sans envie, sans réseau : vingt StatFlouzz, et elle est passée. La journée est comptée, la série continue, tes potes voient ta case cochée et tu vois les leurs. Il n'y a pas de quota : le prix est la seule limite, et il se gagne en jouant. Un joker s'utilise sur la question du jour, tant qu'elle est ouverte — pas sur un jour déjà raté.

PROPOSE TES QUESTIONS

Une meilleure idée ? Propose-la. Tous les dix jours de série, tu gagnes 100 StatFlouzz, et une question en coûte exactement 100. Tu écris la question, tes réponses, et la StatOwrel que chacune donne. Validée par la modération, elle peut tomber un matin pour tout le monde. Refusée, tes StatFlouzz te reviennent.

TON CALENDRIER EST TON HISTORIQUE

Chaque journée répondue devient une case cochée. Toutes les questions déjà posées sont là, même celles d'avant ton inscription : tu peux y répondre après coup pour compléter ta collection et voir ce que tes potes avaient dit. Un rattrapage ne rallume jamais une série cassée — la série récompense la régularité, la case récompense la collection.

ENTRE POTES, VRAIMENT

Pas de recherche d'utilisateurs, pas d'annuaire, pas de suggestions, pas de profils publics. On ajoute un pote en tapant son nom d'utilisateur exact : le connaître est le prix d'entrée. L'amitié est réciproque, et se retire des deux côtés. Tu ne vois jamais que les réponses de tes amis — il n'y a aucun contenu public dans StatOwrel.

CE QU'IL N'Y A PAS

Pas de fil à scroller. Pas de likes, pas de commentaires, pas de messagerie. Pas de publicité. Pas de classement. Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.
```

*(3 490 caractères)*

Champs courts, inchangés depuis `docs/store-listing.md` :

| Champ | Valeur | Car. |
|---|---|---|
| Nom de l'app (iOS) / Titre (Play) | `StatOwrel — question du jour` | 28 |
| Sous-titre (iOS, 30) | `1 question/jour entre potes` | 27 |
| Description courte (Play, 80) | `Les questions que personne ne pose. Les réponses que tout le monde veut.` | 72 |

---

## English

**Réserve — à ne pas publier.** Aucune localisation anglaise n'est prévue : les questions
elles-mêmes sont en français, une fiche anglaise attirerait un public que l'app ne sert pas
(`docs/store-listing.md`, en-tête).

### Promotional Text — 170 characters max

**Option 1** (162 characters)

```
The questions nobody asks. The answers everybody wants. One a day, the same for everyone: you answer, you find out your stat, then you see what your friends said.
```

**Option 2** (154 characters)

```
The questions nobody asks. The answers everybody wants. No time today? Spend a joker: the day counts, your streak holds, your friends still see your cell.
```

### What's New — 4000 characters max

**A. First published version**

```
First release of StatOwrel.

One question a day, the same one for everybody. It drops at 7am. You answer in two taps, you find out which percentage you fall into, then you see what your friends answered.

Your streak grows as long as you don't miss a day. Every ten days in a row, you earn 100 StatFlouzz, the app's own currency. You start with 50 of them.

No time, no wifi, no mood? Spend a joker: 20 StatFlouzz, the day counts, your streak holds, and you still get to see what your friends answered.

A hundred StatFlouzz is what a question costs. You write your own, moderation approves it, and it can drop one morning for everybody.

Your calendar keeps every question already asked, including the ones from before you arrived: you can answer them afterwards to complete your collection.

Friends are added by their exact username. No search, no directory, no public profiles. When one of them answers a day, a dot shows up on that calendar cell.

Also in this release: an evening reminder if you haven't played yet, a nudge to go see your friends' answers if you have, and account deletion straight from the settings.

One question, one answer, one statistic, your friends. Under thirty seconds a day.
```

**B. Update over a published 1.1.x**

```
Your streak no longer breaks by accident.

No time, no wifi, no mood? Spend a joker. Twenty StatFlouzz, the day counts, your streak holds, and you still get to see what your friends answered. As many jokers as your wallet can pay for.

StatCoins are now called StatFlouzz. Same currency, same rule: 100 every ten days of streak. And you now start with 50 of them, enough for two jokers before your first milestone.

Your balance moved to the top of the home screen: it follows you as you scroll, right above the button that spends it.

Also: the "Poser une question" button now tells you what you're short of instead of doing nothing.

Something off, an idea, a question to suggest: write to us.
```

---

## Notes pour le reviewer Apple

> ⚠️ **Deux champs restent à compléter avant soumission** : les identifiants du compte de
> démonstration (`docs/production-checklist.md` §2.4) — le compte n'existe toujours pas — et ce
> compte doit porter **au moins 120 StatFlouzz**, de quoi ouvrir le formulaire de proposition (100§)
> **et** essayer un joker (20§).

```
IDENTIFIANTS DE DÉMONSTRATION
E-mail : <À COMPLÉTER>
Mot de passe : <À COMPLÉTER>

L'application est intégralement derrière une connexion : merci d'utiliser le compte de démonstration ci-dessus.

Le compte fourni a déjà répondu à plusieurs journées, compte deux amis et dispose de StatFlouzz, afin que le calendrier, le résultat statistique, la liste d'amis, le joker et la proposition de question soient tous accessibles immédiatement.

PARCOURS EN 30 SECONDES
1. Au premier lancement, un carrousel de présentation en quatre écrans s'affiche avant la connexion. Le dernier écran demande l'autorisation des notifications ; elle peut être refusée sans conséquence sur le parcours. Une question de démonstration est ensuite proposée : y répondre est facultatif.
2. Connexion avec l'e-mail et le mot de passe fournis.
3. L'écran d'accueil affiche la série en cours, le solde de StatFlouzz en haut à droite, et le calendrier du mois.
4. Toucher le bandeau de la question du jour, ou n'importe quelle case du calendrier — un jour manqué porte un bouton « ? » qui ouvre la même journée.
5. Toucher une option une première fois : elle se sélectionne. La toucher une seconde fois : la réponse est validée. Il n'y a volontairement pas de bouton « Valider » — le second toucher est le bouton.
6. L'écran bascule sur le résultat : le pourcentage, la statistique de chaque option, et les réponses des amis.
7. Le second bouton de l'en-tête ouvre le menu : liste d'amis, questions proposées, invitation, réglages, suppression du compte.

CONTENU GÉNÉRÉ PAR LES UTILISATEURS
Il y a deux choses qu'un utilisateur écrit, et une seule est du contenu.

1. Les questions. Un utilisateur peut proposer une question et ses réponses depuis l'écran d'accueil, en dépensant la monnaie interne de l'application (100 StatFlouzz, gagnés en répondant tous les jours). Cette question n'est visible de personne : elle entre dans une file d'attente et est approuvée une par une par un modérateur, dans une console d'administration réservée à l'éditeur, avant de pouvoir être tirée un matin. Une question refusée n'est jamais diffusée et son auteur est remboursé. Il n'y a aucun moyen, dans l'application, de consulter les questions proposées par quelqu'un d'autre.

2. Le nom d'utilisateur, visible uniquement de ses amis : il n'y a ni annuaire, ni recherche, ni profil public.

Une réponse à une question est le choix d'une option pré-écrite — jamais de texte libre, jamais de photo. Une amitié se retire des deux côtés à tout moment, depuis le menu de la ligne d'ami : retirer un ami est le blocage, il n'y a plus aucun contenu partagé ensuite.

MONNAIE INTERNE
Les StatFlouzz ne s'achètent pas. Il n'y a aucun achat intégré, aucun paiement, aucune publicité. Un compte neuf reçoit 50 StatFlouzz à sa création, et il n'y a ensuite qu'une seule façon d'en gagner : répondre à la question du jour dix jours de suite, ce qui en verse 100. Ils ne servent qu'à deux choses : proposer une question (100) et passer une journée avec un joker (20). Ils n'ont aucune valeur hors de l'application et ne se convertissent en rien.

LE JOKER
Un joker permet de passer la question du jour sans y répondre, tout en conservant sa série de jours consécutifs. Il coûte 20 StatFlouzz et ne s'utilise que sur la question du jour, tant qu'elle est ouverte. Il n'y a pas de quota : la seule limite est le solde, qui se gagne en jouant. Une journée passée avec un joker n'entre pas dans les statistiques de la question — passer un jour n'est pas une réponse.

MESURE D'USAGE
L'application utilise Firebase Analytics (Google Analytics 4) pour mesurer le parcours produit : les changements d'écran et huit événements (création de compte, connexion, déconnexion, réponse envoyée, joker utilisé, question proposée, invitation envoyée, invitation acceptée). Aucune donnée personnelle n'est envoyée : ni e-mail, ni nom d'utilisateur, ni contenu de réponse. La collecte de l'identifiant publicitaire est explicitement désactivée (google_analytics_adid_collection_enabled: false), les Google Signals sont désactivés, et aucune donnée n'est partagée avec un annonceur ni recoupée avec des données tierces. Aucun appel à AppTrackingTransparency n'est donc fait. Le détail complet est publié : https://github.com/qmachard/statowrel-app/blob/main/docs/analytics.md

SIGNALER UN UTILISATEUR OU UNE QUESTION
Un nom d'utilisateur inapproprié se signale à l'éditeur depuis la page d'assistance, accessible sans compte : https://statowrel-app.web.app/legal/assistance. Tout signalement est traité sous 24 heures, et le nom d'utilisateur concerné est supprimé ou le compte désactivé. Une question diffusée peut être signalée par la même voie et retirée du calendrier.

MOT DE PASSE OUBLIÉ
Le lien « Mot de passe oublié ? » sous le bouton de connexion ouvre un écran qui demande une adresse e-mail. Firebase Authentication envoie le lien de réinitialisation ; le nouveau mot de passe est choisi sur la page que ce lien ouvre. La confirmation affichée est volontairement la même que l'adresse corresponde à un compte ou non — ne pas révéler qu'une adresse est inscrite est une précaution, pas un bug.

CONNEXION AVEC APPLE
« Se connecter avec Apple » est proposé au même niveau que Google et l'e-mail, conformément à la guideline 4.8.

NOTIFICATIONS
L'application envoie trois notifications au maximum : la question du jour à 7h, un rappel en fin de journée, et une alerte lors de la réception d'une invitation d'un ami. L'autorisation est demandée au dernier écran du carrousel d'accueil, après explication de ce à quoi elle sert, et se réactive à tout moment depuis le menu.

SUPPRESSION DU COMPTE
Menu (second bouton de l'en-tête) → « Supprimer mon compte », derrière une confirmation. La suppression est immédiate et définitive : profil, réponses, calendrier, amitiés, jetons de notification, réservation du nom d'utilisateur et compte d'authentification.

CONDITIONS D'UTILISATION, CONFIDENTIALITÉ ET MENTIONS LÉGALES
Accessibles depuis le bas des écrans de connexion et d'inscription, et depuis le bas du menu :
https://statowrel-app.web.app/legal/cgu
https://statowrel-app.web.app/legal/confidentialite
https://statowrel-app.web.app/legal/mentions-legales
```

**Ce qui a changé par rapport aux notes de la 1.1.0, et pourquoi :**

- Un bloc **LE JOKER** est ajouté. Une monnaie qui achète le droit de *ne pas jouer* mérite d'être
  décrite avant qu'un examinateur ne s'en fasse sa propre idée.
- Le bloc **MONNAIE INTERNE** est réécrit : il annonçait « aucun moyen d'en obtenir autrement qu'en
  répondant dix jours de suite », ce qui devient faux avec la dotation de 50§ à la création. Il dit
  aussi désormais les deux usages, pas un seul.
- Un bloc **MESURE D'USAGE** est ajouté, et il est **obligatoire** : un SDK d'analytics apparaît
  dans cette version. Le taire quand le formulaire de collecte de données le déclare serait une
  incohérence entre deux déclarations du même dossier.
- Le parcours en 30 secondes mentionne le solde dans l'en-tête, qui a changé de place.
- Le compte de démonstration doit porter **120 StatFlouzz** et non 100.

**Permissions demandées par l'app**

| Permission | Quand | Refus |
|---|---|---|
| Notifications | Dernier écran du carrousel d'accueil, après une phrase qui dit à quoi elles servent ; redemandable depuis le Menu | Sans conséquence — l'app fonctionne entièrement sans |

L'app ne demande **ni** la localisation, **ni** les contacts, **ni** l'appareil photo, **ni** le
suivi publicitaire (aucun appel à `AppTrackingTransparency`, aucun SDK publicitaire — Firebase
Analytics ne lit ni l'IDFA ni l'AdID).

---

## Plan de test QA interne

À exécuter sur le build iOS et le build Android tirés de cette rc, profil `production`, sur
**appareil physique** — pas sur simulateur : les notifications push et la connexion Apple ne
fonctionnent pas autrement.

> **Pré-requis absolu** : les functions **et les règles** Firestore de cette version doivent être
> déployées avant le premier test. Un build 1.2.0 contre un backend 1.1.x échoue sur le joker
> (callable absent) **et sur la création de compte** (règle `startsEmpty()` refusant l'ouverture à
> 50§) — deux échecs qui se lisent comme des bugs de l'app.

### Delta de la 1.2.0 — à passer en priorité

**Le joker** (`4db85fb` → `0f288d6`)

- [ ] Le bouton « Passer avec un Joker » n'apparaît **que** sur la question du jour encore ouverte
- [ ] Il n'apparaît **pas** sur un jour passé du calendrier, ni sur un jour déjà répondu
- [ ] Le prix « 20§ » est sur la fente `trailingLabel`, jamais dans le libellé
- [ ] Solde < 20§ : le bouton reste **visible** mais désactivé, avec la phrase qui nomme le solde
- [ ] Le tap ouvre une **alerte native de confirmation** avant toute dépense — « Annuler » ne
      dépense rien
- [ ] Confirmation : 20§ prélevés, la feuille bascule sur « Tu as utilisé un JOKER », la série
      avance
- [ ] La feuille du joker débloque bien **les réponses des potes**, sans mood propre
- [ ] Le dixième jour d'affilée atteint **avec un joker** verse bien les 100§
- [ ] La case du calendrier passe au **cinquième état** : bordée, spade de carte à jouer, violet
      `#9723C9` — distincte d'un jour manqué comme d'un jour répondu
- [ ] Sur la journée en cours, l'état joker **prime** sur le liseré « aujourd'hui »
- [ ] Le bandeau de l'écran Stats reprend la même formule que la feuille (« Tu as utilisé un JOKER »)
- [ ] Un pote ayant joué son joker apparaît dans la liste d'amis de la feuille du jour, avec le
      même violet
- [ ] Les pourcentages de la question **ne bougent pas** après un joker (`answer_counts` intact)
- [ ] Re-taper le joker sur un jour déjà passé : refusé proprement, message en français, aucun code
      `functions/*` brut à l'écran
- [ ] Répondre normalement à un jour déjà passé au joker : refusé
- [ ] Mode avion : « Ton Joker n'est pas parti. Vérifie ta connexion et réessaie. »
- [ ] La relance de 18h **saute** un compte qui a joué son joker
- [ ] Simulateur de règles Firestore : une création de réponse cliente portant `is_joker: true` est
      **refusée**

**Dotation de bienvenue** (`4db85fb`, `380af59`)

- [ ] Un compte créé **depuis un build 1.2.0** s'ouvre à **50§**, visibles dans l'en-tête
- [ ] Un compte créé **depuis un build 1.1.0** (ancien binaire, nouvelles règles) s'ouvre aussi :
      l'onboarding aboutit, et le solde passe à 50§ dans la seconde grâce à `users-onUserCreated`
- [ ] Relancer le trigger sur le même compte ne recrédite **rien**
- [ ] Un compte dont le portefeuille a déjà bougé n'est **pas** rechargé
- [ ] `npm run backfill-initial-balance -- --dry-run --production` rapporte des comptes plausibles
      **avant** de l'exécuter pour de bon
- [ ] Simulateur de règles : un `create` de profil portant `statcoin_balance: 500` est **refusé** ;
      `0` et `50` passent

**StatFlouzz** (`93cfa57`)

- [ ] Plus aucune occurrence de « StatCoin » dans l'interface — carte streak, en-tête, formulaire
      de proposition, joker, « Mes questions »
- [ ] Le symbole `§` est inchangé, et VoiceOver / TalkBack lisent bien « 20 StatFlouzz »
- [ ] `npm run backfill-statflouzz -- --dry-run` fonctionne sous son nouveau nom

**En-tête et bouton de proposition** (`25bbc19`)

- [ ] Le solde est en haut à droite, en puce `muted` sans bordure ni ombre, entre le bouton
      d'invitation et le bouton menu
- [ ] Il **reste visible** pendant le défilement de l'écran Stats
- [ ] Il se met à jour tout seul après une réponse, un joker ou une proposition
- [ ] Sous le calendrier, le bouton « Poser une question » est **nu**, pleine largeur, prix en
      `trailingLabel`
- [ ] Solde insuffisant : le bouton est grisé **mais tapable**, et l'alerte nomme le manque
- [ ] Solde suffisant : le bouton est `primary` et ouvre le formulaire

**Firebase Analytics** (`51b1d86`, `69835f8`, `20978f5`)

- [ ] Dev client avec `EXPO_PUBLIC_ANALYTICS_FORCE_ENABLED=true` : les **8 événements** custom et
      `screen_view` remontent dans **DebugView** — protocole d'activation dans `docs/analytics.md` §8
- [ ] `setUserId` porte bien l'UID Firebase Auth, **jamais** un handle ni un e-mail
- [ ] `answer_submitted` porte `question_id`, `option_id`, `late`
- [ ] `joker_used` part **une seule fois** par joker
- [ ] `friend_invited` part avec `outcome: not_found` sur un handle inexistant
- [ ] La déconnexion pousse `setUserId(null)`
- [ ] Un build sans le drapeau, en `__DEV__`, n'envoie **rien**
- [ ] **Il n'y a aucune ligne d'opt-out dans le Menu** — c'est volontaire (`20978f5`), la couche de
      consentement est un ticket à part
- [ ] Le nouveau dev client est bien reconstruit — `@react-native-firebase/analytics` est un module
      natif, un redémarrage de Metro ne suffit pas

### Hors binaire

**Backend**

- [ ] `firebase functions:list` montre `questions-useJoker` et `users-onUserCreated` en plus de
      l'existant
- [ ] Un joker écrit bien un document dans `v1_daily_question_answers` avec `is_joker: true` et un
      `option_id` vide
- [ ] `v1_user_calendar_months.jokers.{DD}` est renseigné par le trigger, et `days.{DD}` ne l'est
      pas pour le même jour
- [ ] Les compteurs `friend_answer_counts` des potes s'incrémentent aussi sur un joker

**Émulateurs** (`731696e`, `5b147a7`)

- [ ] `npm run dev:functions` démarre sur les nouveaux ports (auth 9098, functions 5002, firestore
      8082, hosting 5001, UI 4001, storage 9198)
- [ ] `npm run seed-emulator` remplit bien un joker sur aujourd'hui côté ami
- [ ] `npm run dev:app` démarre Metro sur 8083

### Régression complète

Inchangée depuis la 1.0.1 — voir `release-notes-1.0.1.md` § « Régression complète ». S'y ajoutent
les points de la 1.1.0 (portefeuille, proposition, « Mes questions », mot de passe oublié, connexion
Google Android) et, cette fois, deux cases nées de la fusion des collections :

- [ ] La feuille du jour ne fait **qu'une lecture par ami** — le joker et la réponse vivant
      désormais sur le même document
- [ ] Un mois mélangeant jours répondus, jours joker et jours manqués s'affiche sans confusion, et
      les trois états restent distinguables d'un coup d'œil

Et une dernière, avant le tag :

- [ ] `npm run typecheck`, `npm run lint` et `npm run build` verts — la CI les passe sur chaque PR,
      mais rien ne les rejoue sur le tag qu'on soumet

---

## Mots-clés

### App Store — français, 100 caractères max, séparés par des virgules sans espace

```
question,jour,potes,amis,stat,statistique,sondage,quiz,vote,serie,streak,quotidien,matin,entre
```
94 caractères. Inchangés depuis la 1.0.0 — le joker n'apporte aucun terme de recherche : personne
ne cherche « joker » pour trouver une app de question du jour.

### App Store — anglais (réserve, non publié)

```
question,daily,friends,stat,poll,quiz,vote,streak,morning,answer,percent,social,habit,mates
```
91 caractères.

### Google Play

Play n'a pas de champ de mots-clés : l'indexation se fait sur le titre, la description courte et la
description complète. Rien à saisir.

---

## Checklist publication

Ce qui doit être vrai **avant** de soumettre les builds tirés de cette version.

### Bloquants store encore ouverts

- [ ] 🔴 **Consentement RGPD / CNIL pour Firebase Analytics** — *nouveau, et propre à cette
      version*. La CNIL exige un consentement explicite pour tout traceur qui n'est pas
      « strictement nécessaire » ; Firebase Analytics en est un. Le wrapper expose déjà
      `setEnabled(bool)` pour être branché sur une couche de consentement, mais **cette couche
      n'existe pas** : elle a été sortie de la version exprès (`20978f5`). Deux issues, une seule à
      choisir : livrer le bandeau + le drapeau persisté + le gate, **ou** contraindre la release
      production à ne rien envoyer. `docs/production-checklist.md` §6.
- [ ] 🔴 **Déclarations de collecte de données à re-répondre dans les deux consoles** —
      « Diagnostics / analyse d'usage » passe de **Non** à **Oui**. `docs/store-listing.md` §1.11
      et `docs/privacy-policy.md` §3.8 sont à jour ; les formulaires en ligne ne le sont pas.
- [ ] **Signalement dans l'app** — guideline 1.2, `docs/production-checklist.md` §2.3. Toujours
      aucune collection `v1_user_reports`, aucune action « Signaler ». Inchangé depuis la 1.1.0, et
      toujours le seul bloquant dur qui reste côté code produit.
- [ ] **La fiche en ligne dit « pas de joker »** — la phrase de `TA SÉRIE` doit être corrigée dans
      les deux stores **en même temps** que la mise à jour, sinon la description décrit une règle que
      l'app ne suit plus.
- [ ] **SHA-1 de la clé de signature Play enregistré dans Firebase**, et **vérifié** avec
      `npm run check-google-signin` (`docs/production-checklist.md` §4.2)
- [ ] Page web de demande de suppression de compte (exigée par Play, hors de l'app)
- [ ] URLs de confidentialité et de support renseignées dans App Store Connect **et** dans la Play
      Console ; URL des normes de sécurité des enfants (`/legal/protection-des-enfants`) renseignée
      dans la Play Console
- [ ] Compte de démonstration créé sur la production, avec des journées répondues, deux amis
      acceptés **et au moins 120 StatFlouzz**, puis renseigné dans les deux consoles
- [ ] Capability « Sign in with Apple » activée sur l'App ID `fr.quentinmachard.statowrel`
- [ ] Relecture juridique des cinq pages légales, **politique de confidentialité §3.8 comprise**

### Acquis dans le code à cette version

- [x] **Le joker** — passer la journée pour 20§ en gardant sa série *(nouveau en 1.2.0)*
- [x] **Dotation de bienvenue de 50§**, versée par les règles ou par `users-onUserCreated`
      *(nouveau en 1.2.0)*
- [x] **Joker et réponse sur une seule collection** — une lecture par ami au lieu de deux
      *(nouveau en 1.2.0)*
- [x] **Solde dans l'en-tête**, visible pendant le défilement *(nouveau en 1.2.0)*
- [x] **Bouton de proposition qui explique ce qui manque** au lieu de rester inerte
      *(nouveau en 1.2.0)*
- [x] **Firebase Analytics + plan de taggage** `docs/analytics.md` *(nouveau en 1.2.0)*
- [x] **`is_joker` refusé aux clients par les règles** — le prix du joker ne se contourne pas
      *(nouveau en 1.2.0)*
- [x] Économie de StatFlouzz, proposition de questions, « Mes questions », mot de passe oublié,
      digest de modération, console en table filtrable *(acquis en 1.1.0)*
- [x] App sur React Native Firebase, console sous `/admin/`, portrait verrouillé, rattrapage visible
      *(acquis en 1.0.1)*
- [x] Normes CSAE publiées, âge minimum 16 ans *(acquis en 1.0.0)*
- [x] Suppression de compte depuis l'app, connexion avec Apple au même niveau que Google et l'e-mail
- [x] Aucun SDK publicitaire, **aucun achat intégré** — les StatFlouzz ne s'achètent pas
- [ ] ⚠️ **« Aucun SDK d'analytics » n'est plus vrai** — la phrase disparaît de cette liste à partir
      de cette version, et c'est ce qui déclenche les deux bloquants rouges ci-dessus

### Déploiements que cette version exige — dans cet ordre

L'ordre n'est pas une préférence. Un build 1.2.0 devant un backend 1.1.x ne peut ni jouer un joker
ni créer un compte.

1. - [ ] `npm run deploy:firestore:production` — **les règles d'abord** : `startsWithInitialBalance()`
        est ce qui laisse un client 1.2.0 ouvrir un profil, et `hasAnswerShape()` ce qui ferme
        `is_joker` aux clients. Aucun index nouveau cette fois
2. - [ ] `npm run deploy:functions:production` — `questions-useJoker`, `users-onUserCreated`, et
        `onAnswerCreated` qui branche désormais sur `is_joker`
3. - [ ] `npm run backfill-initial-balance -- --production` (après un `--dry-run`) — les comptes
        existants qui n'ont jamais touché leur portefeuille reçoivent leurs 50§
4. - [ ] Rien à déployer côté console : `apps/admin` n'a pas bougé dans cette version
5. - [ ] Trancher le **bloquant consentement** — livrer la couche, ou couper l'envoi
6. - [ ] Re-répondre les **deux déclarations de collecte de données**
7. - [ ] Seulement ensuite : `npm run build:prod:ios` / `build:prod:android`, puis `submit:prod`

### Infrastructure

- [ ] Projet Firebase de développement séparé de la production (`.firebaserc` pointe les deux alias
      sur `statowrel-app` — `docs/production-checklist.md` §3.1). **La mesure d'usage rend ce point
      plus gênant qu'avant** : les sessions de développement et les sessions réelles atterrissent
      dans le même GA4
- [ ] `eas env:list --environment production` : aucun `EXPO_PUBLIC_ANALYTICS_FORCE_ENABLED`
      résiduel, aucun `EXPO_PUBLIC_FIREBASE_*` résiduel, et les fichiers `google-services.json` /
      `GoogleService-Info.plist` de production fournis à EAS
- [ ] Alerte de budget et sauvegardes Firestore programmées
- [ ] Bloc `submit.production` d'`eas.json` rempli (iOS : `appleId`, `ascAppId`, `appleTeamId` ;
      Android : clé de compte de service, `track: internal`)
- [ ] Domaine tranché — `statowrel-app.web.app` ou un domaine propre (`docs/store-listing.md` §4)

### Contenu

- [ ] **Au moins 90 questions approuvées** dans le pot — un jour sans question casse la série de
      tout le monde
- [ ] `npm run seed-daily-questions` et `npm run seed-demo-question` passés sur la production
- [ ] Rôle admin accordé (`npm run set-admin -- <email> --production`)

### Visuels

- [ ] **Captures à refaire, pas seulement à compléter** : l'en-tête de l'écran Stats a changé et la
      carte « Deviens acteur de StatOwrel » n'existe plus. Toute capture montrant l'accueil est
      périmée
- [ ] Une capture pour le joker — la feuille « Tu as utilisé un JOKER » ou la case violette du
      calendrier
- [ ] Bannière Play 1024×500, icônes 1024×1024 (iOS) et 512×512 (Play)

### Recette

- [ ] Delta de la 1.2.0 ci-dessus passé en entier, **après** les déploiements
- [ ] Plan de test QA passé sur iOS **et** Android, sur appareil physique
- [ ] DebugView vérifié une fois, sur chaque plateforme
- [ ] TestFlight interne : au moins une semaine d'usage quotidien réel — dont **un jour joué au
      joker**, pour voir la série tenir par-dessus minuit
- [ ] Piste de test interne Play lancée en parallèle
