# StatOwrel 1.1.0 — notes de version

| Champ | Valeur |
|---|---|
| Version | **1.1.0** (`version` applicative : `1.1.0` dans `apps/app/package.json` et `apps/app/app.config.ts`) |
| Build iOS | **10** |
| Build Android | **9** |
| Date | 2026-09-03 |
| Nature | **release finale** — première mineure de StatOwrel |
| Commit taggé | `b2d4db5b0750b179ba1cf9fa95aa7303508e917d` — le même arbre que la **1.1.0-rc1**, dont cette finale ne change rien |
| Version précédente | **1.0.1** (builds iOS 8 / Android 7), taggée sur `3213e72` — `release-notes-1.0.1.md` |
| Version sautée | **1.0.2** — la `1.0.2-rc1` (`3596f51`) n'a produit aucun build et n'a jamais été soumise. Son contenu est repris ici tel quel ; le numéro est abandonné |
| Fiche store | **français (France) uniquement** (`docs/store-listing.md`) ; la section anglaise ci-dessous est une réserve, à ne pas publier |

Cette note part de la **1.0.1** — la dernière version qui a produit des builds — et couvre les
74 commits qui l'ont suivie, la `1.0.2-rc1` comprise. Le passage en **mineure** est justifié :
la 1.0.x était le produit de la 1.0.0 avec des correctifs dessous, la 1.1.0 ouvre une
fonctionnalité entière — l'économie de StatCoins et la proposition de questions
(`docs/prd.md` §4.7).

**Delta 1.1.0-rc1 → 1.1.0 : aucun.** La finale est taggée sur le commit même de la rc1
(`b2d4db5`) ; les builds iOS 10 et Android 9 partent de cet arbre. Il n'y a donc rien à retester
que la rc1 n'aurait pas déjà couvert, et le plan de test plus bas est celui de la rc, inchangé.

> ⚠️ **Cette version change la déclaration de contenu utilisateur.** Jusqu'ici, l'app ne permettait
> pas de proposer une question et le contenu utilisateur pouvait être décrit comme inexistant côté
> app. Il existe désormais. Il reste **entièrement pré-modéré** — une question proposée n'est
> visible de personne tant qu'un modérateur ne l'a pas approuvée — mais la §1.9 de
> `docs/store-listing.md` et les notes pour l'examen sont à relire avec cette formulation-là, et le
> **signalement de contenu** (et non plus seulement d'utilisateur) devient une question ouverte pour
> la ligne directrice 1.2 d'Apple. Voir « Bloquants » plus bas.

> ⚠️ **Cette version ne peut pas être soumise avant que le backend soit déployé.** Le bouton
> « Poser une question » appelle un callable qui n'existe pas encore en production, et « Mes
> questions » a besoin d'un index composite. Voir « Déploiements que cette version exige » — l'ordre
> compte.

---

## Ce qui change depuis la 1.0.1

### Dans le binaire

| # | Changement | Effet sur la soumission |
|---|---|---|
| 1 | **Économie de StatCoins** (`bf18903` → `938a95f`) — 100§ à chaque série de 10 jours consécutifs, portefeuille affiché sous le calendrier | Nouveauté annonçable, mais **jamais seule** : une monnaie ne s'annonce qu'avec ce qu'elle achète |
| 2 | **Proposer une question depuis l'app** (`dc06977` → `724097c`) — un formulaire plein écran, 2 à 6 réponses, 100§ prélevés à l'envoi, remboursés si la question est refusée | **La nouveauté de cette version**, et celle qui change la déclaration de contenu utilisateur |
| 3 | **« Mes questions »** dans le Menu (`88dd8a2`) — le statut de chaque proposition, le motif d'un refus, et les StatCoins rendus | Se raconte avec la proposition, pas séparément |
| 4 | **Le bandeau du jour répondu affiche la StatOwrel gagnée** (`b5c1b77`, `c097aa7`) — « Aujourd'hui tu es un.e BORDÉLIQUE » au lieu d'annoncer la question du lendemain | Détail visible, à mettre dans « Et aussi » |
| 5 | **Mot de passe oublié** (`fd9c664`) — *repris de la 1.0.2 abandonnée*, jamais publié | Nouveauté annonçable |
| 6 | **Mail de réinitialisation aux couleurs de StatOwrel** (`68aefd5`) | Ne s'annonce pas |
| 7 | **`DEVELOPER_ERROR` nommé** sur la connexion Google Android (`c107cfd`) — *repris de la 1.0.2* | Ne change rien à la fiche. **Rend visible un bloquant Android réel** — voir « Bloquants » |
| 8 | **StatOwrel optionnel** dans le formulaire de proposition (`334e84a`) — seule l'intitulé de la réponse est requis | Hors fiche |

### Hors binaire — backend et console

| # | Changement | Conséquence |
|---|---|---|
| 9 | **`questions-proposeQuestion`** — le callable qui débite et écrit la question en une transaction, et la **seule** porte d'écriture sur `v1_questions` : `firestore.rules` est passé à `allow create: if false` | `deploy:functions` **et** `deploy:firestore` obligatoires |
| 10 | **`questions-onQuestionUpdated`** — rembourse les 100§ quand un modérateur rejette, derrière le marqueur `refunded_at` | `deploy:functions` |
| 11 | **`questions-scheduleModerationDigest`** — le mercredi à 08:00 Paris, le pot `pending` par e-mail à tous les comptes portant le claim `admin` (Resend). N'envoie **rien** quand le pot est vide | `deploy:functions` + secret `RESEND_API_KEY` + `RESEND_FROM` |
| 12 | **Table de modération** filtrable et triable dans `apps/admin` (`f03575a` → `3575e2e`) — *reprise de la 1.0.2* | `deploy:admin` |
| 13 | **Mot de passe oublié sur la console** (`8264b8b`) | `deploy:admin` |
| 14 | **`author_username` dénormalisé** sur la question (`936a044`, `53a609f`) — le crédit d'auteur ne coûte plus une lecture de profil, dans l'app comme dans la console | `npm run backfill-question-authors -- --production` |
| 15 | **Fan-out du badge amis sorti de la transaction de réponse** (`362fc94`) | `deploy:functions` |
| 16 | **Domaine `health` supprimé** (`1b768b3`) — la fonction `healthApi` disparaît | `firebase functions:delete health-healthApi` si elle est déployée |
| 17 | **CI GitHub Actions** (`a505dc3`) — `typecheck`, `lint` et `build` sur chaque PR et sur chaque push `main` | Hors produit |

### Effets de bord à ne pas manquer

- **`firestore.rules` a changé sur deux points, et les deux sont des fermetures.**
  `v1_questions` : `allow create: if false` — l'app n'écrit plus jamais une question elle-même.
  `v1_users` : le portefeuille (`statcoin_balance`, `statcoins_earned`, `statcoins_spent`) est
  épinglé sur `update` (`keepsWallet()`) **et** sur `create` (`startsEmpty()`, qui épingle aussi la
  série — le versement se calcule depuis `streak_count`, donc un profil créé avec une série de 9
  vaudrait 100§ le lendemain).
- **Un index composite est nécessaire** : `v1_questions` sur `author_id` ASC + `created_at` DESC.
  Sans lui, « Mes questions » reste sur sa phrase d'échec — pour quelqu'un qui vient de payer 100§,
  ce n'est pas neutre.
- **Le secret `RESEND_API_KEY` doit être posé avant le premier déploiement des functions**, sinon
  `firebase deploy` s'arrête pour le réclamer.
- Les comptes existants n'ont **aucun StatCoin** : leurs séries passées ont couru avant la monnaie.
  `npm run backfill-statcoins -- --production` paie ce que les séries doivent, et reconstruit au
  passage les compteurs de série depuis les réponses.

---

## Français

### Texte promotionnel — 170 caractères max

Champ modifiable **sans nouvelle soumission**. Trois options, la première reste la baseline de
`docs/store-listing.md` §1.3 ; les deux autres mettent la nouveauté devant.

**Option 1 — la baseline, inchangée** (166 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Une par jour, la même pour tous : tu réponds, tu découvres ta stat, puis celles de tes potes.
```

**Option 2 — la nouveauté** (155 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Et maintenant, c'est toi qui les poses : gagne des StatCoins, propose ta question.
```

**Option 3 — la boucle** (134 caractères)

```
Une question par jour à 7h. Tu réponds, tu montes ta série, tu gagnes des StatCoins. Et tu les dépenses pour poser ta propre question.
```

L'option 1 reste retenue par défaut — la baseline ne se reformule jamais (`docs/store-listing.md`
§6). L'option 2 est celle à basculer le jour de la mise en ligne, ce champ n'exigeant pas de
soumission : c'est là qu'une nouveauté s'annonce le jour même.

### Nouveautés de cette version — 4000 caractères max

**Deux textes, un seul à coller** — le choix dépend de ce qui est en ligne au moment de soumettre.

**A. Aucune version n'a encore été publiée.** La 1.1.0 est alors la **première version publiée** et
le texte de la 1.0.0 est repris, augmenté d'un paragraphe sur la proposition de questions — c'est
désormais une partie du produit, pas une nouveauté.

```
Première version de StatOwrel.

Une question par jour, la même pour tout le monde. Elle tombe à 7h du matin. Tu réponds en deux taps, tu découvres dans quel pourcentage tu tombes, puis ce que tes potes ont répondu.

Ta série monte tant que tu ne rates pas un jour. Tous les dix jours d'affilée, tu gagnes 100 StatCoins. Cent StatCoins, c'est le prix d'une question : tu écris la tienne, la modération la valide, et elle peut tomber un matin pour tout le monde.

Ton calendrier garde toutes les questions déjà posées, y compris celles d'avant ton arrivée : tu peux y répondre après coup pour compléter ta collection.

Tes potes s'ajoutent par leur nom d'utilisateur exact. Pas de recherche, pas d'annuaire, pas de profils publics. Quand l'un d'eux répond à une journée, une pastille apparaît sur la case du calendrier.

Et aussi : un rappel le soir si tu n'as pas encore joué, une découverte du jour si tu as déjà répondu, et la suppression de ton compte depuis les réglages, en deux taps.

Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.

Un souci, une idée, une question à proposer : écris-nous.
```

*(1 138 caractères)*

**B. Une 1.0.x est déjà en ligne.** Le texte annonce le delta.

```
C'est toi qui poses les questions, maintenant.

Tous les dix jours de série, tu gagnes 100 StatCoins. Cent StatCoins, c'est exactement le prix d'une question. Tu la rédiges, tu écris tes réponses, tu envoies. La modération la valide, et elle peut tomber un matin pour tout le monde.

Si elle est refusée, tes 100 StatCoins te reviennent. Le menu garde la liste de tes questions : celles qui attendent, celles qui sont validées, celles qui sont tombées, et celles qui ont été refusées, avec le motif.

Ton portefeuille est sous le calendrier, à côté du prix.

Tu peux enfin récupérer ton mot de passe. Un lien sous le bouton de connexion, tu tapes ton adresse, tu reçois le mail, tu choisis un nouveau mot de passe.

Et aussi : une fois la question du jour répondue, l'écran d'accueil affiche la StatOwrel que tu viens de gagner au lieu de te parler de demain.

Un souci, une idée, une question à proposer : écris-nous.
```

*(918 caractères)*

Ton : tutoiement, aucun emoji, aucun markdown, paragraphes courts — conformément à
`docs/store-listing.md` §6.

> ⚠️ **Ne rien ajouter ici sur le partage du résultat.** Il n'existe pas dans le binaire
> (`docs/production-checklist.md` §1.3). Décrire une fonctionnalité absente est le motif de rejet
> 2.3.1.
>
> ⚠️ **Ne rien annoncer sur la console de modération ni sur le digest hebdomadaire.** Ils ne sont
> pas dans l'app, ils sont réservés à l'éditeur, et un utilisateur n'a aucun moyen de les atteindre.
>
> ⚠️ **Ne pas promettre d'être prévenu quand une question est validée ou tirée.** Rien ne le
> notifie : l'auteur doit ouvrir « Mes questions » pour le savoir (`docs/production-checklist.md`
> §1.4). Le texte B ci-dessus dit « le menu garde la liste », jamais « on te préviendra ».

### Description complète — 4000 caractères max

La description de la 1.0.0 augmentée d'**un bloc**, `PROPOSE TES QUESTIONS`, dont la phrase est
celle que `docs/store-listing.md` §7 tenait en réserve — enfin débloquée, la checklist §1.4 étant
close côté app.

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

Réponds avant minuit et ta série monte d'un jour. Rate une journée, elle repart à zéro — pas de joker. Ton meilleur score reste affiché, lui, pour toujours.

PROPOSE TES QUESTIONS

Une meilleure idée ? Propose-la. Tous les dix jours de série, tu gagnes 100 StatCoins, et une question en coûte exactement 100. Tu écris la question, tes réponses, et la StatOwrel que chacune donne. Validée par la modération, elle peut tomber un matin pour tout le monde. Refusée, tes StatCoins te reviennent.

TON CALENDRIER EST TON HISTORIQUE

Chaque journée répondue devient une case cochée. Toutes les questions déjà posées sont là, même celles d'avant ton inscription : tu peux y répondre après coup pour compléter ta collection et voir ce que tes potes avaient dit. Un rattrapage ne rallume jamais une série cassée — la série récompense la régularité, la case récompense la collection.

ENTRE POTES, VRAIMENT

Pas de recherche d'utilisateurs, pas d'annuaire, pas de suggestions, pas de profils publics. On ajoute un pote en tapant son nom d'utilisateur exact : le connaître est le prix d'entrée. L'amitié est réciproque, et se retire des deux côtés. Tu ne vois jamais que les réponses de tes amis — il n'y a aucun contenu public dans StatOwrel.

CE QU'IL N'Y A PAS

Pas de fil à scroller. Pas de likes, pas de commentaires, pas de messagerie. Pas de publicité. Pas de classement. Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.
```

*(3 072 caractères)*

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

**Option 2** (150 characters)

```
The questions nobody asks. The answers everybody wants. And now you get to ask them: earn StatCoins with your streak, spend them on your own question.
```

### What's New — 4000 characters max

**A. First published version**

```
First release of StatOwrel.

One question a day, the same one for everybody. It drops at 7am. You answer in two taps, you find out which percentage you fall into, then you see what your friends answered.

Your streak grows as long as you don't miss a day. Every ten days in a row, you earn 100 StatCoins. A hundred StatCoins is what a question costs: you write your own, moderation approves it, and it can drop one morning for everybody.

Your calendar keeps every question already asked, including the ones from before you arrived: you can answer them afterwards to complete your collection.

Friends are added by their exact username. No search, no directory, no public profiles. When one of them answers a day, a dot shows up on that calendar cell.

Also in this release: an evening reminder if you haven't played yet, a nudge to go see your friends' answers if you have, and account deletion straight from the settings.

One question, one answer, one statistic, your friends. Under thirty seconds a day.
```

**B. Update over a published 1.0.x**

```
Now you get to ask the questions.

Every ten days of streak, you earn 100 StatCoins. A hundred StatCoins is exactly what a question costs. You write it, you write the answers, you send it. Moderation approves it, and it can drop one morning for everybody.

If it gets rejected, your 100 StatCoins come back. The menu keeps the list of your questions: the ones waiting, the ones approved, the ones that have run, and the ones turned down, with the reason.

Your wallet sits under the calendar, right next to the price.

You can finally reset your password. A link under the sign-in button, you type your address, you get the mail, you pick a new password.

Also: once you've answered the day's question, the home screen shows the StatOwrel you just earned instead of talking about tomorrow.

Something off, an idea, a question to suggest: write to us.
```

---

## Notes pour le reviewer Apple

> ⚠️ **Deux champs restent à compléter avant soumission** : les identifiants du compte de
> démonstration (`docs/production-checklist.md` §2.4) — inchangé depuis la 1.0.0, le compte n'existe
> pas encore — et le compte doit désormais porter **au moins 100 StatCoins**, sans quoi le reviewer
> ne peut pas ouvrir le formulaire de proposition.

```
IDENTIFIANTS DE DÉMONSTRATION
E-mail : <À COMPLÉTER>
Mot de passe : <À COMPLÉTER>

L'application est intégralement derrière une connexion : merci d'utiliser le compte de démonstration ci-dessus.

Le compte fourni a déjà répondu à plusieurs journées, compte deux amis et dispose de StatCoins, afin que le calendrier, le résultat statistique, la liste d'amis et la proposition de question soient tous accessibles immédiatement.

PARCOURS EN 30 SECONDES
1. Au premier lancement, un carrousel de présentation en quatre écrans s'affiche avant la connexion. Le dernier écran demande l'autorisation des notifications ; elle peut être refusée sans conséquence sur le parcours. Une question de démonstration est ensuite proposée : y répondre est facultatif.
2. Connexion avec l'e-mail et le mot de passe fournis.
3. L'écran d'accueil affiche la série en cours et le calendrier du mois.
4. Toucher le bandeau de la question du jour, ou n'importe quelle case du calendrier — un jour manqué porte un bouton « ? » qui ouvre la même journée.
5. Toucher une option une première fois : elle se sélectionne. La toucher une seconde fois : la réponse est validée. Il n'y a volontairement pas de bouton « Valider » — le second toucher est le bouton.
6. L'écran bascule sur le résultat : le pourcentage, la statistique de chaque option, et les réponses des amis.
7. Le second bouton de l'en-tête ouvre le menu : liste d'amis, questions proposées, invitation, réglages, suppression du compte.

CONTENU GÉNÉRÉ PAR LES UTILISATEURS
Il y a deux choses qu'un utilisateur écrit, et une seule est du contenu.

1. Les questions. Un utilisateur peut proposer une question et ses réponses depuis l'écran d'accueil, en dépensant la monnaie interne de l'application (100 StatCoins, gagnés en répondant tous les jours). Cette question n'est visible de personne : elle entre dans une file d'attente et est approuvée une par une par un modérateur, dans une console d'administration réservée à l'éditeur, avant de pouvoir être tirée un matin. Une question refusée n'est jamais diffusée et son auteur est remboursé. Il n'y a aucun moyen, dans l'application, de consulter les questions proposées par quelqu'un d'autre.

2. Le nom d'utilisateur, visible uniquement de ses amis : il n'y a ni annuaire, ni recherche, ni profil public.

Une réponse à une question est le choix d'une option pré-écrite — jamais de texte libre, jamais de photo. Une amitié se retire des deux côtés à tout moment, depuis le menu de la ligne d'ami : retirer un ami est le blocage, il n'y a plus aucun contenu partagé ensuite.

MONNAIE INTERNE
Les StatCoins ne s'achètent pas. Il n'y a aucun achat intégré, aucun paiement, aucune publicité, et aucun moyen d'en obtenir autrement qu'en répondant à la question du jour dix jours de suite. Ils ne servent qu'à une chose : proposer une question. Ils n'ont aucune valeur hors de l'application et ne se convertissent en rien.

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

**Ce qui a changé par rapport aux notes de la 1.0.1, et pourquoi :**

- Le bloc **CONTENU GÉNÉRÉ PAR LES UTILISATEURS** est réécrit de fond en comble. Il disait « l'app
  ne permet pas de proposer une question ». Ce n'est plus vrai, et laisser cette phrase serait une
  fausse déclaration à l'examen. La nouvelle rédaction dit ce qui existe et pourquoi la
  pré-modération tient quand même.
- Un bloc **MONNAIE INTERNE** est ajouté : une monnaie dans une app fait immédiatement penser à un
  achat intégré, et un examinateur qui ne trouve pas la boutique cherche l'entourloupe. Il n'y en a
  pas, et c'est à dire.
- Le bloc **SIGNALER** est étendu aux questions, pas seulement aux noms d'utilisateur.
- Un bloc **MOT DE PASSE OUBLIÉ** est ajouté (préparé pour la 1.0.2, jamais publié).
- Le parcours en 30 secondes mentionne « questions proposées » dans le menu.
- Le compte de démonstration doit porter des StatCoins.
- **`docs/store-listing.md` §1.9 est à mettre à jour** : « En 1.0, l'app ne permet même pas d'en
  proposer » est faux à partir de cette version.

**Permissions demandées par l'app**

| Permission | Quand | Refus |
|---|---|---|
| Notifications | Dernier écran du carrousel d'accueil, après une phrase qui dit à quoi elles servent ; redemandable depuis le Menu | Sans conséquence — l'app fonctionne entièrement sans |

L'app ne demande **ni** la localisation, **ni** les contacts, **ni** l'appareil photo, **ni** le
suivi publicitaire (aucun appel à `AppTrackingTransparency`, aucun SDK publicitaire).

---

## Plan de test QA interne

À exécuter sur le build iOS **10** et le build Android **9**, profil `production`, sur
**appareil physique** — pas sur simulateur : les notifications push et la connexion Apple ne
fonctionnent pas autrement.

> **Pré-requis absolu** : les functions, les règles **et les index** Firestore de cette version
> doivent être déployés avant le premier test. Un build 1.1.0 contre un backend 1.0.x échoue sur la
> proposition (callable absent) et sur « Mes questions » (index absent), et les deux échecs se
> lisent comme des bugs de l'app.

### Delta de la 1.1.0 — à passer en priorité

**Portefeuille et gains de série** (`bf18903` → `82b520c`)

- [ ] La carte « Deviens acteur de StatOwrel » est visible sous le calendrier, avec le solde centré
      et « StatCoins (§) » dessous
- [ ] Un compte neuf ouvre à `0§` et le bouton « Poser une question » est inerte
- [ ] Répondre le dixième jour consécutif crédite **100§** — le solde bouge sans relancer l'app
      (le profil est abonné)
- [ ] Répondre le onzième jour ne crédite rien
- [ ] Une réponse en rattrapage (`late`) ne crédite rien et ne casse pas le compteur
- [ ] `npm run backfill-statcoins -- --dry-run --production` rapporte des montants plausibles
      **avant** de l'exécuter pour de bon
- [ ] Après le backfill, un compte ayant fait 23 jours d'affilée porte bien 200§
- [ ] VoiceOver / TalkBack lisent « 100 StatCoins » et non « paragraphe 100 »

**Proposer une question** (`dc06977` → `724097c`)

- [ ] Le bouton ouvre le formulaire **plein écran**, pas une feuille
- [ ] Deux réponses au minimum, six au maximum : « Ajouter une réponse » disparaît à six, la
      corbeille est estompée à deux
- [ ] Le clavier ne cache pas la dernière réponse — le formulaire défile dessous
- [ ] Le bouton de fermeture ne passe pas sous la barre d'état
- [ ] Retirer une réponse ne déplace pas la ligne au moment du tap
- [ ] La StatOwrel est **facultative** : envoyer sans la remplir passe, et la réponse sert de
      repli
- [ ] Dépasser les longueurs (question 120, réponse 60, StatOwrel 30) est refusé côté formulaire,
      sans aller-retour réseau
- [ ] Envoi réussi : 100§ prélevés, la feuille se ferme sur « Il te reste N§ », et le solde de la
      carte suit
- [ ] Solde insuffisant : **sa propre phrase**, jamais « réessaie »
- [ ] Mode avion : l'erreur est en français, aucun code `functions/*` brut à l'écran
- [ ] La question apparaît en `pending` dans la console de modération, avec le bon `author_username`
- [ ] **Écrire directement dans `v1_questions` depuis un client est refusé** — c'est le point de la
      règle `allow create: if false` ; à vérifier une fois, avec le simulateur de règles de la
      console Firebase

**« Mes questions »** (`88dd8a2`)

- [ ] La carte est sous la liste d'amis sur l'écran Menu
- [ ] Sans proposition : la phrase d'état vide, pas une carte vide
- [ ] Les quatre pastilles s'affichent bien : en attente (`muted`), validée (`primary`), tirée le
      JJ/MM (`secondary`), rejetée (`destructive`)
- [ ] Un refus affiche son motif, et la ligne **« Tes 100§ t'ont été rendus. »**
- [ ] Une question rejetée qui n'avait **rien coûté** (question seedée, importée depuis la console)
      n'affiche **pas** la ligne de remboursement
- [ ] Rejeter depuis la console pendant que l'écran est ouvert : la ligne bascule toute seule
- [ ] Seule une question **tirée** est pressable, et elle ouvre le bon jour
- [ ] Une question `used` mais jamais diffusée n'ouvre rien
- [ ] **Sans l'index déployé** : la carte affiche sa phrase d'échec, jamais « aucune question »

**Bandeau du jour répondu** (`b5c1b77`, `c097aa7`)

- [ ] Avant réponse : le bandeau porte la question
- [ ] Après réponse : une coche, « Aujourd'hui tu es un.e », la StatOwrel, « Prochaine question à
      7h » — et **plus** la question
- [ ] Un tap dessus rouvre le résultat de la journée
- [ ] Naviguer vers un mois passé ne fait pas disparaître la StatOwrel du bandeau
- [ ] Une StatOwrel longue ne déborde pas et ne pousse pas le calendrier hors écran

**Mot de passe oublié** (`fd9c664`, `68aefd5`)

- [ ] Le lien est visible sous le bouton de connexion, iOS et Android
- [ ] Compte e-mail existant : le mail arrive, **aux couleurs de StatOwrel**, le lien ouvre la page
      Firebase, le nouveau mot de passe est accepté
- [ ] Adresse inconnue : **la même confirmation** s'affiche — c'est voulu, ce n'est pas un bug
- [ ] Adresse malformée : l'erreur est en français, aucun code `auth/*` brut à l'écran
- [ ] Le pied de page légal reste collé en bas, sans monter avec le clavier
- [ ] Un compte Google ou Apple : la même confirmation, et rien ne se débloque — attendu

**Connexion Google sur Android** (`c107cfd`, `69534ae`)

- [ ] **Pré-requis** : les deux empreintes SHA-1 sont enregistrées dans Firebase, et
      `npm run check-google-signin -- --expect <SHA-1 de la clé Play>` confirme qu'elles sont
      devenues des clients OAuth
- [ ] Build installé **depuis Play** (piste interne) : la connexion Google aboutit
- [ ] Build installé à la main depuis EAS : la connexion Google aboutit aussi
- [ ] Tant qu'une empreinte manque : le message nomme la cause au lieu de proposer une relance
      inutile
- [ ] iOS non affecté

**Règles Firestore** (`packages/firestore-config`)

- [ ] Créer un compte neuf : le profil s'écrit bien (le `startsEmpty()` ne bloque pas un parcours
      normal)
- [ ] Simulateur de règles : un `create` de profil portant `statcoin_balance: 500` est refusé
- [ ] Simulateur de règles : un `update` de profil déplaçant `statcoin_balance` est refusé
- [ ] Un compte **existant** (créé avant ces champs) peut toujours mettre à jour son profil

### Hors binaire

**Digest de modération** (`4c41c8b` → `0cb7070`)

- [ ] `firebase functions:secrets:set RESEND_API_KEY` posé, `RESEND_FROM` renseigné sur un domaine
      **vérifié chez Resend** — sans quoi un seul modérateur reçoit
- [ ] `npm run send-moderation-digest -- --dry-run` imprime le pot et n'envoie rien
- [ ] `npm run send-moderation-digest -- --to <adresse>` envoie, et le mail s'affiche correctement
      sur Gmail web, Gmail mobile et Mail iOS (tables, styles en ligne, ombre dure)
- [ ] Un mercredi avec des questions `pending` produit un e-mail ; un mercredi sans n'en produit
      **aucun** (`firebase functions:log --only questions-scheduleModerationDigest`)
- [ ] Les destinataires sont bien tous les comptes portant le claim `admin`

**Console de modération** (`f03575a` → `3575e2e`, `8264b8b`)

- [ ] `npm run deploy:admin:production` passé, puis en navigation privée sur `/admin/`
- [ ] La table s'ouvre triée sur la date de création, la plus récente en haut
- [ ] Filtre par statut, tri sur l'auteur et sur les deux dates
- [ ] La colonne auteur affiche `author_username` sans lecture de profil, après
      `npm run backfill-question-authors -- --production`
- [ ] Une question proposée depuis l'app porte le bon pseudo dès sa création
- [ ] Actions par statut : `pending` → Approuver / Rejeter / Éditer ; `approved` → Rejeter /
      Éditer ; `rejected` → Approuver / Éditer ; `used` et `demo` → Éditer seul
- [ ] « Rejeter » ouvre son modal, le motif est obligatoire, et re-rejeter rouvre le champ sur le
      motif enregistré
- [ ] Éditer une question conserve l'ULID de chaque option
- [ ] « Mot de passe oublié ? » sur la console : même comportement que dans l'app, même
      confirmation pour une adresse inconnue

**Backend**

- [ ] `firebase functions:list` montre `questions-proposeQuestion`,
      `questions-onQuestionUpdated`, `questions-scheduleModerationDigest`, les deux schedulers
      quotidiens, les deux tâches de notification et les deux triggers
- [ ] `health-healthApi` a bien été **supprimée** (`firebase functions:delete health-healthApi`)
- [ ] Un rejet crédite bien 100§ **une seule fois** — re-déclencher le trigger (modifier la question
      à nouveau) ne recrédite rien (`refunded_at`)

### Régression complète

Inchangée depuis la 1.0.1 — voir `release-notes-1.0.1.md` § « Régression complète » : onboarding et
question de démonstration, authentification et compte, question du jour et résultat, série /
calendrier / stats, potes, notifications, robustesse. Deux cases s'y ajoutent, parce que le fan-out
des badges amis a changé de place :

- [ ] Répondre à une journée met bien la pastille rose sur la case du calendrier de chaque ami
      accepté, et le décalage de quelques secondes n'est pas visible à l'usage
- [ ] Un compte avec beaucoup d'amis répond sans que la transaction échoue ni ne traîne

Et une dernière, avant le tag :

- [ ] `npm run typecheck`, `npm run lint` et `npm run build` verts — la CI les passe sur chaque PR,
      mais rien ne les rejoue sur le tag qu'on soumet

---

## Mots-clés

### App Store — français, 100 caractères max, séparés par des virgules sans espace

```
question,jour,potes,amis,stat,statistique,sondage,quiz,vote,serie,streak,quotidien,matin,entre
```
94 caractères. Inchangés depuis la 1.0.0 — la proposition de questions n'apporte aucun terme de
recherche : personne ne cherche « proposer une question » sur l'App Store.

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

- [ ] **Signalement dans l'app** — guideline 1.2, `docs/production-checklist.md` §2.3. Aucune
      collection `v1_user_reports`, aucune action « Signaler ». Le contact éditeur de
      `/legal/assistance` couvre l'exigence « traitement sous 24 h », mais **pas** le mécanisme
      lui-même. **La 1.1.0 durcit ce bloquant** : jusqu'ici il portait sur les noms d'utilisateur,
      il porte désormais aussi sur des questions écrites par des utilisateurs. Elles sont
      pré-modérées, ce qui est un argument solide — mais un contenu utilisateur diffusé sans bouton
      de signalement reste ce que la 1.2 vise. **Le seul bloquant dur qui reste côté code.**
- [ ] **`docs/store-listing.md` §1.9 à réécrire** — la phrase « En 1.0, l'app ne permet même pas
      d'en proposer » devient fausse avec cette version, et la réponse au questionnaire de
      classification par âge s'appuie dessus.
- [ ] **SHA-1 de la clé de signature Play enregistré dans Firebase**, et **vérifié** avec
      `npm run check-google-signin` — une empreinte affichée dans la console n'est pas une empreinte
      qui autorise (`docs/production-checklist.md` §4.2). Sans elle, la connexion Google échoue sur
      tout build installé depuis Play.
- [ ] Page web de demande de suppression de compte (exigée par Play, hors de l'app)
- [ ] URLs de confidentialité et de support renseignées dans App Store Connect **et** dans la Play
      Console ; URL des normes de sécurité des enfants (`/legal/protection-des-enfants`) renseignée
      dans la Play Console
- [ ] Compte de démonstration créé sur la production, avec des journées répondues, deux amis
      acceptés **et au moins 100 StatCoins**, puis renseigné dans les deux consoles
- [ ] Capability « Sign in with Apple » activée sur l'App ID `fr.quentinmachard.statowrel`
- [ ] Relecture juridique des cinq pages légales

### Acquis dans le code à cette version

- [x] **Économie de StatCoins** — 100§ par palier de 10 jours de série *(nouveau en 1.1.0)*
- [x] **Proposition de questions depuis l'app**, payante et remboursée en cas de refus
      *(nouveau en 1.1.0 — ferme `docs/production-checklist.md` §1.4 côté app)*
- [x] **« Mes questions »** — suivi des propositions, motif de refus, remboursement affiché
      *(nouveau en 1.1.0)*
- [x] **`v1_questions` fermé en écriture à tous les clients** — le prix ne se contourne pas
      *(nouveau en 1.1.0)*
- [x] **Portefeuille et compteurs de série épinglés par les règles**, en création comme en mise à
      jour *(nouveau en 1.1.0)*
- [x] **Digest de modération hebdomadaire** par e-mail, silencieux quand le pot est vide
      *(nouveau en 1.1.0)*
- [x] **CI sur chaque PR** — `typecheck`, `lint`, `build` *(nouveau en 1.1.0)*
- [x] **Bandeau d'accueil affichant la StatOwrel du jour** *(nouveau en 1.1.0)*
- [x] **Mot de passe oublié** dans l'app et sur la console, mail aux couleurs de la marque
      *(préparé en 1.0.2, publié pour la première fois en 1.1.0)*
- [x] **`DEVELOPER_ERROR` Android nommé** *(préparé en 1.0.2)*
- [x] **Pot de modération en table filtrable et triable** *(préparé en 1.0.2)*
- [x] App sur React Native Firebase *(acquis en 1.0.1)*
- [x] Site racine = page de présentation, console sous `/admin/` *(acquis en 1.0.1)*
- [x] Portrait verrouillé sur iOS et Android *(acquis en 1.0.1)*
- [x] Rattrapage visible — les jours manqués du calendrier sont des boutons *(acquis en 1.0.1)*
- [x] Normes de sécurité des enfants (CSAE) publiées *(acquis en 1.0.0)*
- [x] Âge minimum 16 ans dans les CGU *(acquis en 1.0.0)*
- [x] Suppression de compte depuis l'app (`users-deleteAccount`)
- [x] Connexion avec Apple au même niveau que Google et l'e-mail
- [x] Aucun SDK d'analytics ni de publicité, **et aucun achat intégré** — les StatCoins ne s'achètent
      pas

### Déploiements que cette version exige — dans cet ordre

L'ordre n'est pas une préférence. Un build 1.1.0 devant un backend 1.0.x plante sur sa
fonctionnalité principale ; l'inverse est inoffensif, l'app 1.0.x n'appelant aucun de ces
nouveaux points d'entrée.

1. - [ ] `firebase functions:secrets:set RESEND_API_KEY` **et** `RESEND_FROM` sur un domaine vérifié
        — sans le secret, le déploiement des functions s'arrête pour le réclamer
2. - [ ] `npm run deploy:functions:production` — `questions-proposeQuestion`,
        `questions-onQuestionUpdated`, `questions-scheduleModerationDigest`, et le fan-out des
        badges sorti de la transaction
3. - [ ] `firebase functions:delete health-healthApi` — le domaine `health` a été supprimé du code,
        la fonction déployée survit toute seule
4. - [ ] `npm run deploy:firestore:production` — **les règles et les index**. L'index composite
        `v1_questions` (`author_id` ASC + `created_at` DESC) met plusieurs minutes à se construire :
        le lancer avant de soumettre, pas pendant
5. - [ ] `npm run backfill-question-authors -- --production` (après un `--dry-run`) — les questions
        antérieures portent leur `author_username`
6. - [ ] `npm run backfill-statcoins -- --production` (après un `--dry-run`) — les séries déjà
        courues sont payées, et les compteurs de série reconstruits
7. - [ ] `npm run deploy:admin:production` — la table de modération et le mot de passe oublié de la
        console
8. - [ ] Seulement ensuite : `npm run build:prod:ios` / `build:prod:android`, puis `submit:prod`

### Infrastructure

- [ ] Projet Firebase de développement séparé de la production (`.firebaserc` pointe les deux alias
      sur `statowrel-app` — `docs/production-checklist.md` §3.1)
- [ ] `eas env:list --environment production` : aucun `EXPO_PUBLIC_FIREBASE_*` résiduel, et les
      fichiers `google-services.json` / `GoogleService-Info.plist` de production fournis à EAS —
      re-poussés après l'ajout du SHA-1
- [ ] Alerte de budget et sauvegardes Firestore programmées
- [ ] Bloc `submit.production` d'`eas.json` rempli (iOS : `appleId`, `ascAppId`, `appleTeamId` ;
      Android : clé de compte de service, `track: internal`)
- [ ] Domaine tranché — `statowrel-app.web.app` ou un domaine propre (`docs/store-listing.md` §4)

### Contenu

- [ ] **Au moins 90 questions approuvées** dans le pot — un jour sans question casse la série de
      tout le monde. Filtrer sur `approved` dans la table de modération pour compter
- [ ] `npm run seed-daily-questions` passé sur la production
- [ ] `npm run seed-demo-question` passé sur la production — sans lui, le carrousel d'accueil ouvre
      sur une question introuvable
- [ ] Rôle admin accordé (`npm run set-admin -- <email> --production`) — c'est aussi ce qui décide
      qui reçoit le digest du mercredi

### Visuels

- [ ] Captures 1 à 3 de `docs/store-listing.md` §3.1 aux deux formats iOS et au format Play
- [ ] **Capture 4 : la vraie, enfin** — la proposition de questions existe, la variante de repli
      (« TA SÉRIE NE TIENT QU'À TOI. ») n'est plus nécessaire. Montrer la carte StatCoins et le
      formulaire
- [ ] Bannière Play 1024×500
- [ ] Icônes 1024×1024 (iOS) et 512×512 (Play)

### Recette

- [ ] Delta de la 1.1.0 ci-dessus passé en entier, **après** les déploiements
- [ ] Plan de test QA passé sur iOS **et** Android, sur appareil physique
- [ ] TestFlight interne : au moins une semaine d'usage quotidien réel — dont **un mercredi matin**,
      pour voir passer le digest
- [ ] Piste de test interne Play lancée en parallèle — c'est le seul endroit où le bloquant SHA-1
      se vérifie
