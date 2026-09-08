# StatOwrel 1.3.0-rc1 — notes de version

| Champ | Valeur |
|---|---|
| Version | **1.3.0-rc1** (`version` applicative : `1.3.0` dans `apps/app/package.json` et `apps/app/app.config.ts` — Expo et l'App Store n'acceptent pas de suffixe pré-release) |
| Build iOS | *non attribué* — la rc précède le build TestFlight ; `eas.json` auto-incrémente (`appVersionSource: remote`) |
| Build Android | *non attribué* — idem |
| Date | 2026-09-08 |
| Nature | **pre-release** — première rc de la 1.3.0 |
| Version précédente | **1.2.0** (builds iOS 11 / Android 11), taggée le 2026-09-04 sur `482926e` — `release-notes-1.2.0.md` |
| Périmètre | les **32 commits** qui séparent `482926e` (le commit taggé `1.2.0`) de la tête de `main` |
| Fiche store | **français (France) uniquement** (`docs/store-listing.md`) ; la section anglaise ci-dessous est une réserve, à ne pas publier |

Cette note reprend exactement là où la 1.2.0 s'était arrêtée. Sa note de soumission le disait
noir sur blanc : « l'écran d'un pote et son score de compatibilité, les onglets du Menu, le récap
Instagram et le parrainage sont déjà sur `main`, et **rien de tout cela n'est dans la 1.2.0**. Ces
cinq chantiers partent dans la 1.3.0. » C'est cette version.

Le passage en **mineure** est justifié deux fois : la 1.3.0 ouvre le **parrainage**
(`docs/prd.md` §4.9) — un canal d'acquisition, avec sa propre économie de StatFlouzz et ses propres
liens universels — et la **compatibilité entre potes** (`docs/prd.md` §5.3), le premier chiffre de
l'app qui appartient à deux personnes à la fois.

> 🔴 **Les deux bloquants rouges de la 1.2.0 sont toujours ouverts** et ne sont pas résolus par
> cette version : le consentement RGPD / CNIL pour Firebase Analytics, et les déclarations de
> collecte de données à re-répondre dans les deux consoles. Cette version **ajoute trois événements**
> au plan de taggage (`referral_attributed`, `invite_link_shared`, `referral_link_opened`) — elle
> aggrave le premier plutôt qu'elle ne l'allège. Voir « Bloquants ».

> 🔴 **Le lien de parrainage n'ouvre l'app que si les deux plateformes ont vérifié le domaine, et
> elles échouent en silence.** Rien dans l'app, dans Firebase ou dans un log de build ne dit qu'un
> lien universel n'est pas vérifié : le seul symptôme est un lien qui ouvre le navigateur. L'ordre
> de déploiement compte, et il n'est pas négociable — **Hosting avant le build**, iOS récupérant
> l'association à l'installation via le CDN d'Apple et ne la relisant pas après coup. Voir
> « Déploiements que cette version exige » et `docs/production-checklist.md` §4.2 bis.

> ⚠️ **Cette version ne peut pas être soumise avant que le backend soit déployé.** L'écran d'un pote
> appelle `friends-getFriendCompatibility`, qui n'existe pas en production, et les règles Firestore
> de la 1.2.0 **refusent la création d'un profil portant `referred_by`** — c'est-à-dire l'inscription
> de tout compte venu d'un lien de parrainage.

---

## Ce qui change depuis la 1.2.0

### Dans le binaire

| # | Changement | Effet sur la soumission |
|---|---|---|
| 1 | **L'écran d'un pote et la compatibilité** (`c34f233` → `3055aa4`) — une ligne d'ami acceptée s'ouvre : sa série, son record, ses jours répondus, et sous eux la carte de compatibilité sur le rose `notification`. Un taux d'accord brut, rien en dessous de **5 journées communes** | **La nouveauté visible de cette version.** À raconter dans les nouveautés et dans la description |
| 2 | **Le parrainage** (`0d3ac60`) — un champ facultatif « Qui t'a fait venir ? » sur la feuille de pseudo, un bloc « Partager mon lien » sous le champ d'invitation, et deux versements à la première réponse du filleul : **30§** au parrain, **10§** au filleul | **La seconde nouveauté.** Elle touche l'économie interne : le bloc MONNAIE INTERNE des notes reviewer est à réécrire |
| 3 | **Les liens universels** (`2558462`, `b630750`, `58361c0`) — `https://statowrel-app.web.app/i/{pseudo}` ouvre l'app, `ios.associatedDomains` + intent filter `autoVerify` scopés à `/i/*`, **coupés sur la variante `development`** | **Nouveau build natif obligatoire** — `app.config.ts` a changé côté entitlement iOS et intent filter Android |
| 4 | **Les onglets du Menu** (`0522319`, `7451059`, `2b0db5b`) — la liste d'amis et « Mes questions » passent derrière un interrupteur segmenté, les deux panneaux restant montés (`display: 'none'`) ; inviter est demandé deux fois, poser une question ferme l'autre onglet | Détail visible. **La capture du Menu de `docs/store-listing.md` §3.1 est périmée** |
| 5 | **Un pote s'ouvre aussi depuis les réponses du jour** (`14c2929`) — la liste d'amis de la feuille du jour est cliquable | « Et aussi » |
| 6 | **Le lien entrant est gardé, pas retapé** (`2558462`) — `useReferrerCapture` stocke le pseudo du parrain jusqu'à ce que la feuille de pseudo puisse le dépenser, et ne l'écrase jamais sur ce qui a déjà été tapé. Un lien ouvert par un compte existant n'est **pas** stocké : il ouvre la feuille d'invitation | Hors fiche, mais c'est ce qui fait marcher le parcours |
| 7 | **Trois événements Analytics de plus** (`0d3ac60`, `2558462`) — `referral_attributed`, `invite_link_shared`, `referral_link_opened` (`has_account`, aucun pseudo : ce serait de la PII) | **Ne s'annonce pas.** Mais entre dans le bloquant consentement |

### Hors binaire — backend, règles, hébergement et outillage

| # | Changement | Conséquence |
|---|---|---|
| 8 | **`friends-getFriendCompatibility`** (`c34f233`) — le callable qui compare deux historiques, la seule requête que `firestore.rules` refuse à tout client. Il vérifie l'amitié avant de lire quoi que ce soit, cache ses trois chiffres dans `v1_friend_compatibilities/{pair_id}` et ne recalcule une paire **qu'une fois par jour parisien** | `deploy:functions` **et** `deploy:firestore` |
| 9 | **Le domaine `referrals`** (`0d3ac60`) — `payReferralReward`, **sans Cloud Function à lui** : `dailyQuestions-onDailyQuestionAnswerCreated` l'appelle après son propre pas, chacun gardant sa transaction. Un second trigger sur le même chemin aurait été une seconde invocation sur *chaque* réponse de l'app, pour régler une chose qui arrive une fois par compte | `deploy:functions` |
| 10 | **`users-onUserCreated` → `recordReferral`** (`0d3ac60`) — inscrit le filleul sur la liste du parrain avec `rewarded_at: null` **et** envoie au parrain une invitation d'ami au nom du filleul, via `createFriendshipPair` extrait d'`inviteFriend` | `deploy:functions` |
| 11 | **`firestore.rules`** — `hasValidReferrer()` (le parrain doit exister, et être quelqu'un d'autre), `keepsReferrer()` (`referred_by` figé après le `create`), `keepsReferralCounters()`, la sous-collection `v1_user_referrals` en lecture seule pour son propriétaire, et `v1_friend_compatibilities` lisible par les deux comptes que `user_ids` nomme | `deploy:firestore`. **Sans ce déploiement, un compte venu d'un lien ne peut pas s'inscrire du tout** |
| 12 | **Hosting : `/i/{handle}` et les deux fichiers d'association** (`b630750`, `844ea9e`, `d1ddc63`) — une page statique, un `/i/**` rewrite, et `apps/admin/public/well-known/` réécrit sur `/.well-known/…` (le `ignore` de `firebase.json` porte `**/.*` et aurait supprimé un vrai `.well-known/` en silence) | `deploy:admin` **obligatoire**, et **avant** le build |
| 13 | **`"appAssociation": "NONE"`** (`ae07139`) — sans quoi Hosting sert **son propre** apple-app-site-association, vestige de Dynamic Links, devant toutes les réécritures : l'URL répond 200, en JSON valide, et ne nomme aucune app. Aucun émulateur ne reproduit ça | `deploy:admin` |
| 14 | **`npm run check-app-links`** (`b630750`, `7dd54b2`) — branché sur le `predeploy` de `hosting`, refuse le déploiement tant qu'un marqueur `REPLACE_WITH_…` subsiste et vérifie que les fichiers ont atteint `dist/`. `SKIP_APP_LINKS_CHECK=1` est la porte pour un déploiement qui ne vise que la console ou les pages légales | Outillage |
| 15 | **Team ID et empreinte SHA-256 renseignés** (`58361c0`) — `2D295QW56H.fr.quentinmachard.statowrel` dans l'AASA, une empreinte dans `assetlinks.json` | ✅ le bloquant « marqueurs à remplir » est **levé** ; reste à vérifier que l'empreinte présente est bien **celle de la clé de signature Play**, et non seulement celle de la clé d'upload |
| 16 | **Le récap Instagram** (`8fcdc0c` → `595a259`, `6674f9c`) — le domaine `instagram`, **aucune Cloud Function** : trois slides 1080×1350 dessinées sur `@napi-rs/canvas`, inclinaisons hachées depuis la date pour qu'un run rejoué redessine à l'identique, et l'adverbe qui monte avec la part (`hedgeFor` : « peut-être » sous 35 %, « forcément » au-delà de 90 %) | **Rien à déployer, rien à annoncer.** Le Graph API, le jeton longue durée et le scheduler restent à faire |
| 17 | **`users-deleteAccount` suit le parrainage** (`0d3ac60`) — supprime les reçus du compte et **le sien chez son parrain**, sans décrémenter `referrals_count` : le parrain a été payé pour un parrainage qui a bien eu lieu, et rendre la place sous le plafond ouvrirait une boucle supprimer-reparrainer | `deploy:functions` |
| 18 | **Compatibilité en diff mensuel** (`0d2a2b5`) — le callable lit `v1_user_calendar_months`, pas les réponses, et seulement les mois bougés depuis son propre `synced_at`. **~7 300 lectures/jour → ~40** à douze mois d'historique et dix potes consultés | `deploy:functions` |
| 19 | **Le versement du parrainage ne relit rien** (`ca193ed`) — le profil lu dans la transaction du pas précédent lui est passé, donc décider une question qui ne se pose qu'une fois par compte ne coûte aucune lecture par réponse | `deploy:functions` |

### Effets de bord à ne pas manquer

- **Un binaire 1.3.0 devant les règles 1.2.0 ne peut pas inscrire un filleul.** `hasValidReferrer()`
  est ce qui autorise un `create` de profil portant `referred_by` ; les règles 1.2.0 n'en savent
  rien et refusent le document. Les règles se déploient donc **avant** de distribuer le moindre
  build. La réciproque est sans danger : un binaire ≤ 1.2.0 n'écrit jamais ce champ.
- **`referred_by` s'écrit une fois et jamais plus.** C'est tout le modèle anti-fraude : autoriser
  `null → valeur` sur un `update` laisserait l'intégralité du parc se déclarer parrainée du jour au
  lendemain et encaisser à la réponse suivante. Le champ est donc **le seul** qu'un client écrit à
  la création et que la règle épingle ensuite.
- **Le versement attend la première vraie réponse du filleul**, pas son inscription — une adresse
  ne coûte rien à inventer. Et **la question de démonstration est écartée sur son identifiant, au
  point d'appel** : `useDemoAnswerFlush` écrit la réponse d'onboarding sur ce chemin dès qu'une
  session existe, et ferait sinon partir le versement à l'inscription.
- **La ligne apparaît chez le parrain dès l'inscription, pas au versement.** Le versement peut être
  à plusieurs jours ; une carte vide jusque-là se lirait comme une attribution ratée.
- **`referral_rewarded_at` est estampillé même quand rien n'est crédité** — parrain supprimé,
  parrain plafonné — pour qu'un parrainage sans valeur se règle une fois au lieu de réessayer
  indéfiniment.
- **Aucun écran « Mes filleuls ».** `v1_user_referrals` est écrit et n'est **lu par rien** dans
  l'app : c'est le reçu qu'un versement qui déplace deux portefeuilles doit laisser, `referrals_count`
  étant incapable de dire *qui*. Ne pas le décrire dans la fiche.
- **La compatibilité ne s'affiche pas sous 5 journées communes**, et le nombre de journées n'est
  **jamais** montré : un chiffre qui imprime sa propre arithmétique invite à discuter l'arithmétique.
  Le plancher est ce qui tient l'honnêteté à sa place.
- **Jokers et question de démonstration sont exclus du calcul**, gratuitement : un joker est projeté
  dans `jokers` et jamais dans `days`, la démo dans aucun mois.
- **Le rose `notification` devient une surface**, et la carte de compatibilité est la seule de l'app
  bâtie dessus — le jaune `primary` voulant déjà dire « ta réponse » et « répondu ».
- **Les deux panneaux du Menu restent montés.** Les démonter relirait la collection de chaque carte
  à chaque bascule.
- **Rien n'est transporté à travers une installation depuis le store.** Firebase Dynamic Links a
  fermé le 25 août 2025, et aucun des deux stores ne dit à une installation d'où elle vient : la
  page d'atterrissage rend donc le pseudo gros et copiable, et **l'app ne lit jamais le
  presse-papier** — une lecture programmatique coûterait une bannière iOS 16+ à chaque inscription
  pour servir celles venues d'un lien.

---

## Français

### Texte promotionnel — 170 caractères max

Champ modifiable **sans nouvelle soumission**. Trois options, la première reste la baseline de
`docs/store-listing.md` §1.3 ; les deux autres mettent la nouveauté devant.

**Option 1 — la baseline, inchangée** (166 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Une par jour, la même pour tous : tu réponds, tu découvres ta stat, puis celles de tes potes.
```

**Option 2 — la compatibilité** (157 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Et maintenant, un chiffre de plus : à quel point tu réponds comme ton meilleur pote.
```

**Option 3 — le parrainage** (140 caractères)

```
Une question par jour à 7h. Ta série te paie en StatFlouzz. Fais venir un pote avec ton lien et gagne 30 StatFlouzz dès sa première réponse.
```

L'option 1 reste retenue par défaut — la baseline ne se reformule jamais (`docs/store-listing.md`
§6). L'option 2 est celle à basculer le jour de la mise en ligne.

### Nouveautés de cette version — 4000 caractères max

**Deux textes, un seul à coller** — le choix dépend de ce qui est en ligne au moment de soumettre.

**A. Aucune version n'a encore été publiée.** La 1.3.0 est alors la **première version publiée** :
le texte de la 1.2.0 est repris, la compatibilité et le parrainage y entrant comme des parties du
produit et non comme des nouveautés.

```
Première version de StatOwrel.

Une question par jour, la même pour tout le monde. Elle tombe à 7h du matin. Tu réponds en deux taps, tu découvres dans quel pourcentage tu tombes, puis ce que tes potes ont répondu.

Ta série monte tant que tu ne rates pas un jour. Tous les dix jours d'affilée, tu gagnes 100 StatFlouzz, la monnaie de l'app. Tu démarres avec 50 StatFlouzz offerts.

Une journée sans envie, sans temps, sans réseau ? Passe-la avec un joker : 20 StatFlouzz, la journée est comptée, ta série est préservée, et tu vois quand même les réponses de tes potes.

Ouvre la fiche d'un pote et découvre votre compatibilité : un pourcentage calculé sur les journées que vous avez répondues tous les deux, et la petite phrase qu'il mérite. Il faut cinq journées en commun pour qu'il apparaisse.

Cent StatFlouzz, c'est le prix d'une question. Tu écris la tienne, la modération la valide, et elle peut tomber un matin pour tout le monde.

Ton calendrier garde toutes les questions déjà posées, y compris celles d'avant ton arrivée : tu peux y répondre après coup pour compléter ta collection.

Tes potes s'ajoutent par leur nom d'utilisateur exact. Pas de recherche, pas d'annuaire, pas de profils publics. Et s'ils ne sont pas encore là, envoie-leur ton lien : tu gagnes 30 StatFlouzz dès leur première réponse, et eux 10.

Et aussi : un rappel le soir si tu n'as pas encore joué, une découverte du jour si tu as déjà répondu, et la suppression de ton compte depuis les réglages, en deux taps.

Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.

Un souci, une idée, une question à proposer : écris-nous.
```

*(1 646 caractères)*

**B. Une 1.2.x est déjà en ligne.** Le texte annonce le delta.

```
Tu sais enfin à quel point tes potes te ressemblent.

Ouvre la fiche d'un pote depuis ta liste : sa série, son record, ses jours répondus, et surtout votre compatibilité. Un pourcentage calculé sur les journées que vous avez répondues tous les deux, et la petite phrase qu'il mérite. Il faut cinq journées en commun pour qu'il s'affiche : en dessous, ce serait une coïncidence.

Fais venir tes potes avec ton lien. Partage-le depuis l'écran d'invitation : il ouvre StatOwrel s'ils l'ont déjà, une page qui leur explique quoi faire sinon, et ton pseudo est déjà rempli à l'inscription. Dès leur première réponse, tu gagnes 30 StatFlouzz et eux 10.

Le menu s'est rangé. Tes potes d'un côté, tes questions proposées de l'autre, derrière deux onglets au lieu d'une seule longue page.

Et aussi : depuis les réponses d'une journée, tu ouvres directement la fiche d'un pote.

Un souci, une idée, une question à proposer : écris-nous.
```

*(928 caractères)*

Ton : tutoiement, aucun emoji, aucun markdown, paragraphes courts — conformément à
`docs/store-listing.md` §6.

> ⚠️ **Ne rien annoncer sur la mesure d'usage.** Trois événements s'ajoutent au plan de taggage
> dans cette version ; ce n'est toujours pas une fonctionnalité et cela n'a rien à faire dans les
> nouveautés. Sa place est dans la déclaration de collecte de données et dans la politique de
> confidentialité.
>
> ⚠️ **Ne pas promettre une liste de filleuls.** Il n'y en a pas, et il n'y en aura pas : le
> parrainage se voit dans les deux endroits où il se produit — le partage et la notification de
> versement — et nulle part ailleurs.
>
> ⚠️ **Ne rien ajouter sur le partage du résultat.** Il n'existe toujours pas dans le binaire
> (`docs/production-checklist.md` §1.3). Décrire une fonctionnalité absente est le motif de rejet
> 2.3.1. Le bouton « Partager mon lien » du parrainage **n'est pas** le partage de résultat.
>
> ⚠️ **Ne pas promettre d'être prévenu quand une question est validée ou tirée.** Rien ne le
> notifie ; c'est toujours à faire (`docs/production-checklist.md` §1.4).
>
> ⚠️ **Ne pas écrire que la compatibilité se voit sur n'importe quel pote.** Elle demande une
> amitié **acceptée** et cinq journées répondues des deux côtés.

### Description complète — 4000 caractères max

La description de la 1.2.0 avec **deux blocs en plus** : `VOTRE COMPATIBILITÉ` et
`FAIS VENIR TES POTES`. Le bloc `ENTRE POTES, VRAIMENT` est complété d'une phrase — la seule façon
d'entrer n'est plus le pseudo exact, un lien en est une autre.

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

VOTRE COMPATIBILITÉ

Ouvre la fiche d'un pote : sa série, son record, ses jours répondus, et le seul chiffre de l'app qui appartient à deux personnes. Le pourcentage de journées où vous avez répondu la même chose, sur celles que vous avez répondues tous les deux. Cinq journées en commun minimum, sinon on ne dit rien : à une seule journée, tout le monde est compatible à 100%.

TA SÉRIE

Réponds avant minuit et ta série monte d'un jour. Rate une journée, elle repart à zéro — sauf à dépenser un joker pour la passer sans la casser. Ton meilleur score reste affiché, lui, pour toujours.

TON JOKER

Une journée sans temps, sans envie, sans réseau : vingt StatFlouzz, et elle est passée. La journée est comptée, la série continue, tes potes voient ta case cochée et tu vois les leurs. Il n'y a pas de quota : le prix est la seule limite, et il se gagne en jouant.

PROPOSE TES QUESTIONS

Une meilleure idée ? Propose-la. Tous les dix jours de série, tu gagnes 100 StatFlouzz, et une question en coûte exactement 100. Validée par la modération, elle peut tomber un matin pour tout le monde. Refusée, tes StatFlouzz te reviennent.

FAIS VENIR TES POTES

Ton lien d'invitation porte ton pseudo. Envoie-le : il ouvre StatOwrel chez ceux qui l'ont déjà, et une page qui explique quoi faire chez les autres. Dès la première réponse de ton pote, tu gagnes 30 StatFlouzz et lui 10.

TON CALENDRIER EST TON HISTORIQUE

Chaque journée répondue devient une case cochée. Toutes les questions déjà posées sont là, même celles d'avant ton inscription : tu peux y répondre après coup. Un rattrapage ne rallume jamais une série cassée.

ENTRE POTES, VRAIMENT

Pas de recherche d'utilisateurs, pas d'annuaire, pas de suggestions, pas de profils publics. On ajoute un pote en tapant son nom d'utilisateur exact, ou en lui envoyant son lien. L'amitié est réciproque, et se retire des deux côtés. Tu ne vois jamais que les réponses de tes amis.

CE QU'IL N'Y A PAS

Pas de fil à scroller. Pas de likes, pas de commentaires, pas de messagerie. Pas de publicité. Pas de classement. Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.
```

*(3 413 caractères)*

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

**Option 2** (145 characters)

```
The questions nobody asks. The answers everybody wants. And now one number more: how alike you and your best mate actually answer, day after day.
```

### What's New — 4000 characters max

**A. First published version**

```
First release of StatOwrel.

One question a day, the same one for everybody. It drops at 7am. You answer in two taps, you find out which percentage you fall into, then you see what your friends answered.

Your streak grows as long as you don't miss a day. Every ten days in a row, you earn 100 StatFlouzz, the app's own currency. You start with 50 of them.

No time, no wifi, no mood? Spend a joker: 20 StatFlouzz, the day counts, your streak holds, and you still get to see what your friends answered.

Open a friend's page and find out how compatible you are: the share of days you both answered the same way, over the days you both answered at all. Five shared days minimum, otherwise it would be a coincidence.

A hundred StatFlouzz is what a question costs. You write your own, moderation approves it, and it can drop one morning for everybody.

Your calendar keeps every question already asked, including the ones from before you arrived.

Friends are added by their exact username. No search, no directory, no public profiles. And if they are not here yet, send them your link: you earn 30 StatFlouzz on their first answer, they earn 10.

Also in this release: an evening reminder if you haven't played yet, a nudge to go see your friends' answers if you have, and account deletion straight from the settings.

One question, one answer, one statistic, your friends. Under thirty seconds a day.
```

**B. Update over a published 1.2.x**

```
You finally know how alike your friends really are.

Open a friend from your list: their streak, their record, their answered days, and above all your compatibility. A percentage over the days you both answered, and the line that number deserves. Five shared days are needed before it shows: below that, it would be a coincidence.

Bring your friends in with your own link. Share it from the invite screen: it opens StatOwrel for those who already have it, and a page explaining what to do for everybody else. On their first answer, you earn 30 StatFlouzz and they earn 10.

The menu is tidier. Your friends on one side, your proposed questions on the other, behind two tabs instead of one endless page.

Also: you can open a friend straight from a day's answer list.

Something off, an idea, a question to suggest: write to us.
```

---

## Notes pour le reviewer Apple

> ⚠️ **Trois champs restent à compléter avant soumission** : les identifiants du compte de
> démonstration (`docs/production-checklist.md` §2.4) — le compte n'existe toujours pas —, ce compte
> doit porter **au moins 120 StatFlouzz**, et il doit avoir **au moins un ami accepté avec cinq
> journées répondues en commun**, faute de quoi la carte de compatibilité affichera son compte à
> rebours au lieu du chiffre.

```
IDENTIFIANTS DE DÉMONSTRATION
E-mail : <À COMPLÉTER>
Mot de passe : <À COMPLÉTER>

L'application est intégralement derrière une connexion : merci d'utiliser le compte de démonstration ci-dessus.

Le compte fourni a déjà répondu à plusieurs journées, compte deux amis avec qui il partage au moins cinq journées répondues, et dispose de StatFlouzz, afin que le calendrier, le résultat statistique, la liste d'amis, la compatibilité, le joker et la proposition de question soient tous accessibles immédiatement.

PARCOURS EN 30 SECONDES
1. Au premier lancement, un carrousel de présentation en quatre écrans s'affiche avant la connexion. Le dernier écran demande l'autorisation des notifications ; elle peut être refusée sans conséquence sur le parcours. Une question de démonstration est ensuite proposée : y répondre est facultatif.
2. Connexion avec l'e-mail et le mot de passe fournis.
3. L'écran d'accueil affiche la série en cours, le solde de StatFlouzz en haut à droite, et le calendrier du mois.
4. Toucher le bandeau de la question du jour, ou n'importe quelle case du calendrier — un jour manqué porte un bouton « ? » qui ouvre la même journée.
5. Toucher une option une première fois : elle se sélectionne. La toucher une seconde fois : la réponse est validée. Il n'y a volontairement pas de bouton « Valider » — le second toucher est le bouton.
6. L'écran bascule sur le résultat : le pourcentage, la statistique de chaque option, et les réponses des amis.
7. Le second bouton de l'en-tête ouvre le menu : deux onglets, « Mes potes » et « Mes questions », puis les réglages, l'invitation et la suppression du compte.
8. Toucher un ami accepté dans la liste ouvre sa fiche : sa série, son record, ses jours répondus et votre compatibilité.

CONTENU GÉNÉRÉ PAR LES UTILISATEURS
Il y a deux choses qu'un utilisateur écrit, et une seule est du contenu.

1. Les questions. Un utilisateur peut proposer une question et ses réponses depuis l'écran d'accueil, en dépensant la monnaie interne de l'application (100 StatFlouzz, gagnés en répondant tous les jours). Cette question n'est visible de personne : elle entre dans une file d'attente et est approuvée une par une par un modérateur, dans une console d'administration réservée à l'éditeur, avant de pouvoir être tirée un matin. Une question refusée n'est jamais diffusée et son auteur est remboursé. Il n'y a aucun moyen, dans l'application, de consulter les questions proposées par quelqu'un d'autre.

2. Le nom d'utilisateur, visible uniquement de ses amis : il n'y a ni annuaire, ni recherche, ni profil public.

Une réponse à une question est le choix d'une option pré-écrite — jamais de texte libre, jamais de photo. Une amitié se retire des deux côtés à tout moment : retirer un ami est le blocage, il n'y a plus aucun contenu partagé ensuite.

MONNAIE INTERNE
Les StatFlouzz ne s'achètent pas. Il n'y a aucun achat intégré, aucun paiement, aucune publicité. Un compte neuf reçoit 50 StatFlouzz à sa création. Il y a ensuite deux façons d'en gagner : répondre à la question du jour dix jours de suite, ce qui en verse 100, et faire venir un nouvel utilisateur, ce qui en verse 30 au parrain et 10 au filleul lors de la première réponse du filleul. Ils ne servent qu'à deux choses : proposer une question (100) et passer une journée avec un joker (20). Ils n'ont aucune valeur hors de l'application, ne se convertissent en rien, et ne peuvent ni être achetés, ni être transférés d'un compte à l'autre.

LE PARRAINAGE
Chaque utilisateur dispose d'un lien contenant son propre nom d'utilisateur, qu'il peut partager depuis l'écran d'invitation. À l'inscription, un champ facultatif « Qui t'a fait venir ? » accepte un nom d'utilisateur existant ; il est pré-rempli si l'inscription vient d'un lien. Ce champ ne peut être renseigné qu'à la création du compte et jamais modifié ensuite. La récompense n'est versée qu'à la première réponse réelle du nouvel utilisateur, elle est plafonnée à 20 filleuls par compte, et elle est payée exclusivement en monnaie interne — aucune contrepartie monétaire, aucun achat, aucun contenu déverrouillé. Aucune liste de filleuls n'est consultable dans l'application, et aucun nom d'utilisateur tiers n'est révélé par ce mécanisme.

LA COMPATIBILITÉ
La fiche d'un ami accepté affiche un pourcentage : la proportion de journées où les deux comptes ont choisi la même option, sur les journées qu'ils ont répondues tous les deux. Il est calculé côté serveur, n'est accessible qu'aux deux personnes concernées, et n'expose jamais le détail des réponses de l'autre — seulement ce chiffre agrégé. En dessous de cinq journées communes, rien n'est affiché.

LIENS UNIVERSELS
L'application déclare le domaine statowrel-app.web.app et n'en revendique que le chemin /i/*, réservé aux liens de parrainage. Toutes les autres pages de ce domaine — dont les conditions d'utilisation, la politique de confidentialité et la page d'assistance — restent volontairement dans le navigateur.

MESURE D'USAGE
L'application utilise Firebase Analytics (Google Analytics 4) pour mesurer le parcours produit : les changements d'écran et onze événements (création de compte, connexion, déconnexion, réponse envoyée, joker utilisé, question proposée, invitation envoyée, invitation acceptée, lien d'invitation partagé, lien d'invitation ouvert, inscription attribuée à un parrain). Aucune donnée personnelle n'est envoyée : ni e-mail, ni nom d'utilisateur, ni contenu de réponse. La collecte de l'identifiant publicitaire est explicitement désactivée (google_analytics_adid_collection_enabled: false), les Google Signals sont désactivés, et aucune donnée n'est partagée avec un annonceur ni recoupée avec des données tierces. Aucun appel à AppTrackingTransparency n'est donc fait. Le détail complet est publié : https://github.com/qmachard/statowrel-app/blob/main/docs/analytics.md

SIGNALER UN UTILISATEUR OU UNE QUESTION
Un nom d'utilisateur inapproprié se signale à l'éditeur depuis la page d'assistance, accessible sans compte : https://statowrel-app.web.app/legal/assistance. Tout signalement est traité sous 24 heures, et le nom d'utilisateur concerné est supprimé ou le compte désactivé. Une question diffusée peut être signalée par la même voie et retirée du calendrier.

MOT DE PASSE OUBLIÉ
Le lien « Mot de passe oublié ? » sous le bouton de connexion ouvre un écran qui demande une adresse e-mail. Firebase Authentication envoie le lien de réinitialisation ; le nouveau mot de passe est choisi sur la page que ce lien ouvre. La confirmation affichée est volontairement la même que l'adresse corresponde à un compte ou non — ne pas révéler qu'une adresse est inscrite est une précaution, pas un bug.

CONNEXION AVEC APPLE
« Se connecter avec Apple » est proposé au même niveau que Google et l'e-mail, conformément à la guideline 4.8.

NOTIFICATIONS
L'application envoie au maximum : la question du jour à 7h, un rappel en fin de journée, une alerte lors de la réception d'une invitation d'un ami, et une alerte lors du versement d'un parrainage. L'autorisation est demandée au dernier écran du carrousel d'accueil, après explication de ce à quoi elle sert, et se réactive à tout moment depuis le menu.

SUPPRESSION DU COMPTE
Menu (second bouton de l'en-tête) → « Supprimer mon compte », derrière une confirmation. La suppression est immédiate et définitive : profil, réponses, calendrier, amitiés, parrainages, jetons de notification, réservation du nom d'utilisateur et compte d'authentification.

CONDITIONS D'UTILISATION, CONFIDENTIALITÉ ET MENTIONS LÉGALES
Accessibles depuis le bas des écrans de connexion et d'inscription, et depuis le bas du menu :
https://statowrel-app.web.app/legal/cgu
https://statowrel-app.web.app/legal/confidentialite
https://statowrel-app.web.app/legal/mentions-legales
```

**Ce qui a changé par rapport aux notes de la 1.2.0, et pourquoi :**

- Un bloc **LE PARRAINAGE** est ajouté, et il est **obligatoire**. Un mécanisme qui récompense
  l'apport d'un nouvel utilisateur est exactement ce qu'un examinateur lit comme une incitation ; le
  décrire d'avance — plafond, monnaie interne uniquement, aucune contrepartie monétaire, aucune
  liste consultable — coûte moins qu'un aller-retour.
- Un bloc **LA COMPATIBILITÉ** est ajouté : un chiffre calculé sur les réponses de deux comptes
  appelle la question « qu'est-ce qui est exposé de l'autre ? », et la réponse est « rien d'autre que
  ce chiffre ».
- Un bloc **LIENS UNIVERSELS** est ajouté. Il dit surtout ce que l'app **ne** revendique **pas** :
  une app qui avalerait les pages légales répondrait à un tap de l'examinateur par un écran vide.
- Le bloc **MONNAIE INTERNE** est réécrit : il annonçait « une seule façon d'en gagner », ce qui
  devient faux avec le parrainage. Il ajoute aussi que les StatFlouzz **ne se transfèrent pas**.
- Le bloc **MESURE D'USAGE** passe de huit à **onze** événements.
- Le bloc **NOTIFICATIONS** passe de trois à **quatre**.
- Le parcours en 30 secondes gagne les onglets du menu et l'ouverture de la fiche d'un pote.
- Le compte de démonstration doit désormais partager **cinq journées répondues** avec au moins un
  de ses deux amis.

**Permissions demandées par l'app**

| Permission | Quand | Refus |
|---|---|---|
| Notifications | Dernier écran du carrousel d'accueil, après une phrase qui dit à quoi elles servent ; redemandable depuis le Menu | Sans conséquence — l'app fonctionne entièrement sans |

L'app ne demande **ni** la localisation, **ni** les contacts, **ni** l'appareil photo, **ni** le
suivi publicitaire (aucun appel à `AppTrackingTransparency`, aucun SDK publicitaire — Firebase
Analytics ne lit ni l'IDFA ni l'AdID). Elle ne lit **pas** le presse-papier.

---

## Plan de test QA interne

À exécuter sur le build iOS et le build Android tirés de cette rc, profil `production`, sur
**appareil physique** — pas sur simulateur : les notifications push, la connexion Apple **et les
liens universels** ne fonctionnent pas autrement.

> **Pré-requis absolu** : les règles Firestore, les functions **et l'hébergement** de cette version
> doivent être déployés avant le premier test, dans cet ordre. Un build 1.3.0 contre un backend
> 1.2.x échoue sur la compatibilité (callable absent) **et sur l'inscription d'un filleul** (règle
> refusant `referred_by`) — deux échecs qui se lisent comme des bugs de l'app.

### Delta de la 1.3.0 — à passer en priorité

**La compatibilité et la fiche d'un pote** (`c34f233` → `3055aa4`)

- [ ] Une ligne d'ami **acceptée** porte un chevron et ouvre sa fiche ; une invitation en attente
      porte ses deux boutons et **n'ouvre rien**
- [ ] La fiche montre la série, le record et les jours répondus de l'ami — avec les mêmes composants
      que l'écran Stats
- [ ] La carte de compatibilité est sur le rose `notification`, les deux visages se chevauchent,
      la phrase de verdict correspond bien à la tranche du pourcentage
- [ ] **Moins de 5 journées communes** : le compte à rebours (« Encore N jours répondus à deux… »)
      s'affiche, jamais un pourcentage
- [ ] **Zéro journée commune** : « Vous n'avez pas encore répondu au même jour. », pas le compte à
      rebours
- [ ] Le **nombre de journées communes n'est affiché nulle part** quand le score l'est
- [ ] Un joker de l'un des deux **ne compte pas** comme journée commune
- [ ] La question de démonstration **ne compte pas**
- [ ] Rouvrir la même fiche dans la même journée **ne rappelle pas** le callable (cache
      AsyncStorage, `data/compatibilityCache.ts`)
- [ ] Répondre aujourd'hui, puis rouvrir la fiche : le score **bouge** (la clé du cache est le jour
      parisien)
- [ ] « Retirer ce pote » est dans le menu de l'en-tête de la fiche, pas sur la ligne
- [ ] Après retrait, rouvrir l'ancienne fiche est impossible et le callable **refuse** (amitié
      vérifiée avant toute lecture)
- [ ] Mode avion : « Compatibilité indisponible pour le moment. », aucun code `functions/*` brut
- [ ] Depuis la liste d'amis de la feuille du jour, toucher un pote ouvre **la même fiche**

**Le parrainage** (`0d3ac60`, `2558462`)

- [ ] Feuille de pseudo : le champ « Qui t'a fait venir ? » est **facultatif** et l'inscription
      aboutit en le laissant vide
- [ ] Un pseudo inexistant est refusé **dans le formulaire**, avec une phrase française — jamais un
      `permission-denied` (la résolution passe par `v1_usernames` **et** le profil avant l'écriture)
- [ ] Son propre pseudo est refusé
- [ ] Inscription avec un parrain valide : le profil porte `referred_by`, une ligne apparaît
      **immédiatement** dans `v1_user_referrals` du parrain avec `rewarded_at: null`, et le parrain
      reçoit une **invitation d'ami** au nom du filleul
- [ ] Refuser cette invitation **ne casse pas** le versement à venir
- [ ] Première réponse réelle du filleul : **+30§** au parrain, **+10§** au filleul, une notification
      de chaque côté (« Un pote t'a rejoint » / « +10§ pour toi »)
- [ ] La réponse à la **question de démonstration** ne déclenche **rien**
- [ ] Une deuxième réponse ne recrédite **rien** (`referral_rewarded_at`)
- [ ] Parrain supprimé entre l'inscription et la première réponse : le filleul répond normalement,
      le marqueur est posé, rien n'est crédité, aucune erreur à l'écran
- [ ] Simulateur de règles : un `update` de profil posant `referred_by` sur un compte qui n'en avait
      pas est **refusé**
- [ ] Simulateur de règles : un `create` portant `referrals_count: 5` ou `referral_rewarded_at`
      renseigné est **refusé**
- [ ] Simulateur de règles : lire `v1_user_referrals` d'un autre compte est **refusé** ; lire
      `v1_friend_compatibilities` d'une paire dont on ne fait pas partie est **refusé**
- [ ] Suppression de compte : les reçus du compte partent, **et** le sien chez son parrain ; le
      `referrals_count` du parrain **ne bouge pas**

**Le lien de parrainage et les liens universels** (`b630750`, `2558462`, `58361c0`, `ae07139`)

- [ ] `curl -sI https://statowrel-app.web.app/.well-known/apple-app-site-association` rend
      `content-type: application/json` **et** le corps nomme bien `2D295QW56H.fr.quentinmachard.statowrel`
      — pas un JSON vide généré par Hosting
- [ ] `curl -s https://statowrel-app.web.app/.well-known/assetlinks.json` rend le tableau attendu
- [ ] `https://statowrel-app.web.app/i/<pseudo>` affiche le pseudo, gros et copiable
- [ ] **iOS, app installée** : ouvrir le lien **depuis Messages** (pas depuis Safari sur la même
      page) ouvre l'app
- [ ] **Android** : `adb shell pm get-app-links fr.quentinmachard.statowrel` affiche `verified`
- [ ] Lien ouvert **avant** toute inscription : le pseudo est pré-rempli sur la feuille de pseudo, et
      **n'écrase pas** ce qui a déjà été tapé
- [ ] Lien ouvert par un **compte existant** : rien n'est stocké, la feuille d'invitation s'ouvre
      avec le pseudo
- [ ] Un lien vers `/legal/cgu` **reste dans le navigateur** — l'app ne revendique que `/i/*`
- [ ] Le partage : « Partager mon lien » envoie bien le lien avec le pseudo dans l'URL, et le
      message cite le bonus **du filleul** (10§), pas celui de l'expéditeur
- [ ] Build `development` : **aucun** lien universel — c'est voulu, l'association ne nomme qu'un
      App ID et une clé de signature

**Les onglets du Menu** (`0522319`, `7451059`, `2b0db5b`)

- [ ] L'interrupteur segmenté est là où était le titre de la liste d'amis ; **aucune** des deux
      cartes ne porte de titre
- [ ] Les deux libellés restent noirs, l'onglet actif se distingue par sa surface
- [ ] Basculer d'un onglet à l'autre **ne relit pas** les collections (les deux panneaux restent
      montés)
- [ ] Inviter est proposé **deux fois** : bouton d'icône en haut à droite, bouton pleine largeur
      sous la liste
- [ ] « Poser une question » ferme l'onglet « Mes questions » de la même façon

**Analytics** (`0d3ac60`, `2558462`)

- [ ] `referral_attributed` fire **une fois**, à l'inscription avec un parrain valide, et jamais
      sur un champ laissé vide
- [ ] `invite_link_shared` **ne fire pas** quand on ferme la share sheet sans partager
- [ ] `referral_link_opened` porte `has_account`, et **aucun pseudo**

### Hors binaire

**Backend**

- [ ] `firebase functions:list` montre `friends-getFriendCompatibility` en plus de l'existant, et
      **aucune fonction `referrals-*`** — c'est voulu, le versement est appelé par le trigger de
      réponse
- [ ] `v1_friend_compatibilities/{pair_id}` porte `user_ids`, `months`, `synced_at` et `computed_on`
- [ ] Un second appel le même jour **ne relit pas** les mois (le `computed_on` sert d'expiration)
- [ ] Un compte à douze mois d'historique consulté par dix potes : vérifier dans les logs que le
      recalcul ne relit que les mois bougés (`0d2a2b5`)
- [ ] Le versement du parrainage n'apparaît **pas** comme une lecture supplémentaire par réponse
      (`ca193ed`)
- [ ] Log structuré `Referral rewarded` présent dans Cloud Logging avec `user_id`, `sponsor_id`,
      `sponsor_reward`

**Récap Instagram** (`8fcdc0c` → `595a259`, `6674f9c`)

- [ ] `npm run render-instagram-card -- --sample` écrit cinq jeux de trois JPEG 1080×1350 lisibles
- [ ] Les cinq échantillons couvrent 2 à 6 options et les cinq rangs d'adverbe
- [ ] Rejouer la même date produit **les mêmes inclinaisons** (hachage sur la date)
- [ ] `npm run render-instagram-card` contre un émulateur seedé sort une journée réelle, colonnes
      totalisant 100
- [ ] `npm run build:functions` embarque bien les polices dans `dist/assets/`

### Régression complète

Inchangée depuis la 1.0.1 — voir `release-notes-1.0.1.md` § « Régression complète ». S'y ajoutent
les points de la 1.1.0 et de la 1.2.0 (portefeuille, proposition, « Mes questions », mot de passe
oublié, joker, dotation de bienvenue), et cette fois :

- [ ] Un compte **sans aucun ami** : le Menu, les deux onglets et la feuille du jour s'affichent
      sans erreur
- [ ] Un compte **inscrit avant la 1.3.0** (sans `referred_by`) : rien ne casse, aucune carte vide
- [ ] La feuille du jour fait toujours **une lecture par ami**

Et une dernière, avant le tag :

- [ ] `npm run typecheck`, `npm run lint` et `npm run build` verts — la CI les passe sur chaque PR,
      mais rien ne les rejoue sur le tag qu'on soumet

---

## Mots-clés

### App Store — français, 100 caractères max, séparés par des virgules sans espace

```
question,jour,potes,amis,stat,statistique,sondage,quiz,vote,serie,streak,quotidien,matin,entre
```
94 caractères. Inchangés depuis la 1.0.0 — ni la compatibilité ni le parrainage n'apportent de
terme de recherche : personne ne cherche « parrainage » pour trouver une app de question du jour.

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

- [ ] 🔴 **Consentement RGPD / CNIL pour Firebase Analytics** — *ouvert depuis la 1.2.0, et
      **aggravé** ici*. La CNIL exige un consentement explicite pour tout traceur qui n'est pas
      « strictement nécessaire ». Le wrapper expose `setEnabled(bool)`, mais la couche de
      consentement n'existe toujours pas, et cette version **ajoute trois événements**. Deux issues,
      une seule à choisir : livrer le bandeau + le drapeau persisté + le gate, **ou** contraindre la
      release production à ne rien envoyer. `docs/production-checklist.md` §6.
- [ ] 🔴 **Déclarations de collecte de données à re-répondre dans les deux consoles** —
      « Diagnostics / analyse d'usage » passe de **Non** à **Oui**. Toujours pas fait si la 1.2.0
      n'a pas été soumise.
- [ ] 🔴 **Liens universels vérifiés sur les deux plateformes** — *nouveau, et propre à cette
      version*. `docs/production-checklist.md` §4.2 bis. Le Team ID et une empreinte SHA-256 sont
      renseignés (`58361c0`) ; il reste à **confirmer que l'empreinte est celle de la clé de
      signature Play** et pas seulement celle de la clé d'upload, sans quoi tout lien ouvert depuis
      un build du store ouvrira le navigateur.
- [ ] **Signalement dans l'app** — guideline 1.2, `docs/production-checklist.md` §2.3. Toujours
      aucune collection `v1_user_reports`, aucune action « Signaler ». Inchangé depuis la 1.1.0, et
      toujours le seul bloquant dur qui reste côté code produit.
- [ ] **SHA-1 de la clé de signature Play enregistré dans Firebase**, et **vérifié** avec
      `npm run check-google-signin` (`docs/production-checklist.md` §4.2). Attention :
      `check-google-signin` n'imprime que des SHA-**1** ; `assetlinks.json` veut du SHA-**256**, il
      ne peut pas venir de là
- [ ] Page web de demande de suppression de compte (exigée par Play, hors de l'app)
- [ ] URLs de confidentialité et de support renseignées dans App Store Connect **et** dans la Play
      Console ; URL des normes de sécurité des enfants (`/legal/protection-des-enfants`) renseignée
      dans la Play Console
- [ ] Compte de démonstration créé sur la production, avec des journées répondues, **deux amis
      acceptés dont un partageant au moins cinq journées répondues**, et au moins 120 StatFlouzz,
      puis renseigné dans les deux consoles
- [ ] Capability « Sign in with Apple » activée sur l'App ID `fr.quentinmachard.statowrel`
- [ ] **Politique de confidentialité à relire pour le parrainage** — `referred_by`,
      `v1_user_referrals` et le lien contenant un pseudo sont trois traitements de plus ;
      `docs/privacy-policy.md` ne les mentionne pas encore
- [ ] Relecture juridique des cinq pages légales

### Acquis dans le code à cette version

- [x] **La compatibilité entre potes** — la fiche d'un ami et son pourcentage *(nouveau en 1.3.0)*
- [x] **Le parrainage** — champ à l'inscription, lien partageable, 30§/10§ à la première réponse
      *(nouveau en 1.3.0)*
- [x] **Les liens universels `/i/{pseudo}`** — iOS + Android, page d'atterrissage incluse
      *(nouveau en 1.3.0)*
- [x] **`referred_by` figé après le `create`** — le modèle anti-fraude tient dans une règle
      *(nouveau en 1.3.0)*
- [x] **Les deux listes du Menu derrière des onglets** *(nouveau en 1.3.0)*
- [x] **La compatibilité lue comme un diff mensuel** — ~7 300 lectures/jour → ~40 *(nouveau en 1.3.0)*
- [x] **Le récap Instagram dessiné** — trois slides, prévisualisables hors ligne. **Rien ne les
      publie encore** *(nouveau en 1.3.0)*
- [x] Joker, dotation de bienvenue, solde dans l'en-tête, Firebase Analytics *(acquis en 1.2.0)*
- [x] Économie de StatFlouzz, proposition de questions, « Mes questions », mot de passe oublié,
      digest de modération, console en table filtrable *(acquis en 1.1.0)*
- [x] App sur React Native Firebase, console sous `/admin/`, portrait verrouillé, rattrapage visible
      *(acquis en 1.0.1)*
- [x] Normes CSAE publiées, âge minimum 16 ans *(acquis en 1.0.0)*
- [x] Suppression de compte depuis l'app, connexion avec Apple au même niveau que Google et l'e-mail
- [x] Aucun SDK publicitaire, **aucun achat intégré** — les StatFlouzz ne s'achètent pas et ne se
      transfèrent pas

### Déploiements que cette version exige — dans cet ordre

L'ordre n'est pas une préférence. Un build 1.3.0 devant un backend 1.2.x ne peut ni afficher une
compatibilité ni inscrire un filleul, et un build produit **avant** le déploiement de Hosting
n'aura jamais de liens universels vérifiés.

1. - [ ] `npm run deploy:firestore:production` — **les règles d'abord** : `hasValidReferrer()` est
        ce qui laisse un filleul ouvrir un profil, `keepsReferrer()` ce qui le fige, et les deux
        nouveaux `match` ce qui rend `v1_user_referrals` et `v1_friend_compatibilities` lisibles.
        **Aucun index nouveau** cette fois — celui de « Mes questions » (`author_id` + `created_at`)
        reste requis depuis la 1.1.0
2. - [ ] `npm run deploy:functions:production` — `friends-getFriendCompatibility`, le
        `payReferralReward` appelé par `dailyQuestions-onDailyQuestionAnswerCreated`, le
        `recordReferral` de `users-onUserCreated` et le `deleteAccount` qui suit les reçus
3. - [ ] `npm run deploy:admin:production` — **et c'est nouveau** : `/i/**`, les deux fichiers
        d'association et `appAssociation: NONE`. Le `predeploy` rejoue `check-app-links`
4. - [ ] Vérifier les deux URLs en ligne (`curl` ci-dessus) **avant** de builder
5. - [ ] Seulement ensuite : `npm run build:prod:ios` / `build:prod:android` — iOS récupère
        l'association à l'installation et ne la relit pas après coup
6. - [ ] Trancher le **bloquant consentement** — livrer la couche, ou couper l'envoi
7. - [ ] Re-répondre les **deux déclarations de collecte de données**
8. - [ ] `npm run submit:prod`

### Infrastructure

- [ ] Projet Firebase de développement séparé de la production (`.firebaserc` pointe les deux alias
      sur `statowrel-app` — `docs/production-checklist.md` §3.1)
- [ ] `eas env:list --environment production` : aucun `EXPO_PUBLIC_ANALYTICS_FORCE_ENABLED`
      résiduel, aucun `EXPO_PUBLIC_FIREBASE_*` résiduel, et les fichiers `google-services.json` /
      `GoogleService-Info.plist` de production fournis à EAS
- [ ] Alerte de budget et sauvegardes Firestore programmées
- [ ] Bloc `submit.production` d'`eas.json` rempli (iOS : `appleId`, `ascAppId`, `appleTeamId` ;
      Android : clé de compte de service, `track: internal`)
- [ ] Domaine tranché — `statowrel-app.web.app` ou un domaine propre (`docs/store-listing.md` §4).
      **Ce choix est maintenant coûteux** : changer de domaine invalide les deux fichiers
      d'association et tous les liens déjà partagés

### Contenu

- [ ] **Au moins 90 questions approuvées** dans le pot — un jour sans question casse la série de
      tout le monde
- [ ] `npm run seed-daily-questions` et `npm run seed-demo-question` passés sur la production
- [ ] Rôle admin accordé (`npm run set-admin -- <email> --production`)

### Visuels

- [ ] **Captures à refaire** : le Menu a changé (onglets), et la fiche d'un pote n'existait pas
- [ ] Une capture pour la **compatibilité** — la carte rose est la plus vendeuse de la version
- [ ] Bannière Play 1024×500, icônes 1024×1024 (iOS) et 512×512 (Play)

### Recette

- [ ] Delta de la 1.3.0 ci-dessus passé en entier, **après** les trois déploiements
- [ ] Plan de test QA passé sur iOS **et** Android, sur appareil physique
- [ ] Liens universels vérifiés sur un appareil de chaque plateforme, depuis un build **du store ou
      de la piste interne** — pas depuis un build local
- [ ] DebugView vérifié une fois, sur chaque plateforme
- [ ] TestFlight interne : au moins une semaine d'usage quotidien réel — dont **un parrainage mené
      de bout en bout**, du partage du lien jusqu'à la notification de versement
- [ ] Piste de test interne Play lancée en parallèle
