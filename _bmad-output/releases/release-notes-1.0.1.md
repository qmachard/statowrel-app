# StatOwrel 1.0.1 — notes de version

| Champ | Valeur |
|---|---|
| Version | **1.0.1** (`version` applicative : `1.0.1` dans `apps/app/package.json` et `apps/app/app.config.ts` sur le commit taggé) |
| Build iOS | **8** |
| Build Android | **7** |
| Date | 2026-08-27 |
| Nature | **release finale** — première mise à jour de la 1.0 |
| Commit taggé | `3213e724881a9e2c5f25073e6c1f3a22bceb5056` — le même arbre que la **1.0.1-rc1**, dont cette finale ne change rien. Ce qui a été poussé sur `main` **après** ce commit (mot de passe oublié, message d'erreur Google Android, table de modération de `apps/admin`) n'est **pas** dans ces builds et appartient à la **1.0.2** |
| Version précédente | **1.0.0** (build iOS 6), taggée sur `f597037` — `release-notes-1.0.0.md` |
| Fiche store | **français (France) uniquement** pour la 1.0 (`docs/store-listing.md`) ; la section anglaise ci-dessous est une réserve, à ne pas publier |

Cette note part de la **1.0.0** et n'en décrit que le delta. Les textes App Store sont inchangés —
rien de ce qui s'est ajouté depuis n'est une fonctionnalité qu'on annonce à un utilisateur qui
découvre l'app. Ce qui bouge est **sous la fiche** : l'app est passée sur les SDK Firebase natifs
(React Native Firebase), la console de modération est passée sous `/admin/` avec une page de
présentation à la racine du site, l'app est verrouillée en portrait, la question du jour s'ouvre en
modal pleine hauteur, les jours manqués du calendrier deviennent des boutons de rattrapage, les
lectures Firestore ont été fortement réduites, et deux bugs visibles sont corrigés (écran blanc au
lancement, journée figée après minuit).

> Les normes de sécurité des enfants (CSAE), l'âge minimum 16 ans des CGU et le correctif de la
> réponse de démonstration **appartiennent à la 1.0.0** — ils ne figurent pas dans ce delta.

---

## Ce qui change depuis la 1.0.0

| # | Changement | Effet sur la soumission |
|---|---|---|
| 1 | **App migrée sur React Native Firebase** (SDK natifs iOS/Android, résolution CocoaPods sur iOS) | Aucun texte de fiche ne bouge, mais la **surface de régression est maximale** : auth, Firestore, callables et push passent tous par un nouveau SDK — le plan QA complet est à repasser sur appareil physique |
| 2 | Console de modération déplacée sous **`/admin/`**, la racine du site servant une page de présentation | Les URLs légales sont inchangées ; l'URL marketing donnée aux stores peut être la racine du site sans tomber sur un écran de connexion admin |
| 3 | Question du jour présentée en **modal pleine hauteur**, contenu scrollant à l'intérieur (Android compris) | UX seulement — le parcours reviewer décrit plus bas est inchangé |
| 4 | Jours manqués du calendrier levés en **boutons de rattrapage** (« ? » noir) | Rend visible le rattrapage que la description promet déjà (« tu peux y répondre après coup ») |
| 5 | App **verrouillée en portrait** sur iOS et Android | Les captures store n'ont besoin d'aucune variante paysage |
| 6 | **Lectures Firestore réduites** : documents figés servis depuis le cache disque du SDK, question du jour lue une fois à l'ouverture, plus aucune lecture de profil par ami (avatar généré depuis le pseudo, `photo_url` retiré de `v1_users`) | Coût d'exploitation et réactivité — rien de visible sur la fiche |
| 7 | Correctifs : écran de lancement **jamais tenu plus de 6 s**, jour courant lu sur une **horloge vivante** | Deux bugs visibles de la 1.0.0 fermés — détail en QA |

**Delta 1.0.1-rc1 → 1.0.1 : aucun.** La finale est taggée sur le commit même de la rc1
(`3213e72`) ; les builds iOS 8 et Android 7 sont partis de cet arbre. Il n'y a donc rien à
retester que la rc1 n'aurait pas déjà couvert.

---

## Français

### Texte promotionnel — 170 caractères max

Champ modifiable **sans nouvelle soumission**. Inchangé depuis la 1.0.0, la première option reste
retenue.

**Option 1 — retenue** (166 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Une par jour, la même pour tous : tu réponds, tu découvres ta stat, puis celles de tes potes.
```

**Option 2 — le rendez-vous de 7 h** (148 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. La question tombe à 7h, tu réponds en deux taps, tes potes y passent aussi.
```

**Option 3 — par les absences** (134 caractères)

```
Pas de feed. Pas de likes. Une question par jour à 7h, ta réponse dans la statistique, et celles de tes potes une fois que tu as joué.
```

L'option 1 est la baseline suivie du mécanisme : c'est la formulation de `docs/store-listing.md`
§1.3, et la baseline ne se reformule jamais (§6 du même document). L'option 2 est la rotation à
passer le jour où le rendez-vous quotidien est installé et où c'est lui qu'on veut vendre.

### Nouveautés de cette version — 4000 caractères max

**Deux textes, un seul à coller** — le choix dépend de ce qui est en ligne au moment de soumettre :

**A. La 1.0.0 n'a jamais été publiée** (cas attendu : le build 6 n'est pas sorti de TestFlight).
La 1.0.1 est alors la **première version publiée** et le texte de la 1.0.0 est repris tel quel —
rien de ce qui s'est ajouté depuis n'est une fonctionnalité qu'on annonce à quelqu'un qui découvre
l'app.

```
Première version de StatOwrel.

Une question par jour, la même pour tout le monde. Elle tombe à 7h du matin. Tu réponds en deux taps, tu découvres dans quel pourcentage tu tombes, puis ce que tes potes ont répondu.

Ta série monte tant que tu ne rates pas un jour. Ton calendrier garde toutes les questions déjà posées, y compris celles d'avant ton arrivée : tu peux y répondre après coup pour compléter ta collection.

Tes potes s'ajoutent par leur nom d'utilisateur exact. Pas de recherche, pas d'annuaire, pas de profils publics. Quand l'un d'eux répond à une journée, une pastille apparaît sur la case du calendrier.

Et aussi : un rappel le soir si tu n'as pas encore joué, une découverte du jour si tu as déjà répondu, et la suppression de ton compte depuis les réglages, en deux taps.

Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.

Un souci, une idée, une question à proposer : écris-nous.
```

**B. La 1.0.0 est déjà en ligne.** La 1.0.1 est une mise à jour, et le texte le dit :

```
Cette version répare et accélère.

La question du jour s'ouvre maintenant en grand, sur toute la hauteur de l'écran, et défile à l'intérieur : plus rien ne passe sous la barre du téléphone.

Un jour que tu as raté porte désormais un bouton sur sa case du calendrier. Tu le touches, la question s'ouvre, tu réponds après coup. Ta collection se complète — ta série, elle, ne repart pas pour autant.

L'app démarre plus vite et lit beaucoup moins : les mois déjà consultés s'affichent même sans réseau.

Et aussi : l'écran de lancement ne reste plus bloqué, la journée bascule bien à minuit quand l'app est restée ouverte, et l'affichage est verrouillé en portrait.

Un souci, une idée, une question à proposer : écris-nous.
```

Ton : tutoiement, aucun emoji, aucun markdown, paragraphes courts — conformément à
`docs/store-listing.md` §6.

> ⚠️ **Ne rien ajouter ici sur le partage du résultat ni sur la proposition de questions.** Ni
> l'un ni l'autre n'existe dans le binaire (`docs/production-checklist.md` §1.3 et §1.4) ; le
> bouton de proposition est visible mais n'ouvre rien. Décrire une fonctionnalité absente est le
> motif de rejet 2.3.1.

> ⚠️ **Ne rien annoncer non plus sur le mot de passe oublié.** Il est sur `main`, il n'est pas dans
> le build 8 — il part avec la 1.0.2.

### Description complète — 4000 caractères max

Inchangée depuis la 1.0.0 : `docs/store-listing.md` §1.4 augmenté du bloc
`LA NOTIFICATION DE 7H`. Le rattrapage que le bloc calendrier décrit est désormais porté par un
vrai bouton sur chaque jour manqué — la description n'a pas à changer, le binaire l'a rattrapée.

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

TON CALENDRIER EST TON HISTORIQUE

Chaque journée répondue devient une case cochée. Toutes les questions déjà posées sont là, même celles d'avant ton inscription : tu peux y répondre après coup pour compléter ta collection et voir ce que tes potes avaient dit. Un rattrapage ne rallume jamais une série cassée — la série récompense la régularité, la case récompense la collection.

ENTRE POTES, VRAIMENT

Pas de recherche d'utilisateurs, pas d'annuaire, pas de suggestions, pas de profils publics. On ajoute un pote en tapant son nom d'utilisateur exact : le connaître est le prix d'entrée. L'amitié est réciproque, et se retire des deux côtés. Tu ne vois jamais que les réponses de tes amis — il n'y a aucun contenu public dans StatOwrel.

CE QU'IL N'Y A PAS

Pas de fil à scroller. Pas de likes, pas de commentaires, pas de messagerie. Pas de publicité. Pas de classement. Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.
```

Champs courts, inchangés depuis `docs/store-listing.md` :

| Champ | Valeur | Car. |
|---|---|---|
| Nom de l'app (iOS) / Titre (Play) | `StatOwrel — question du jour` | 28 |
| Sous-titre (iOS, 30) | `1 question/jour entre potes` | 27 |
| Description courte (Play, 80) | `Les questions que personne ne pose. Les réponses que tout le monde veut.` | 72 |

---

## English

**Réserve — à ne pas publier pour la 1.0.** Aucune localisation anglaise n'est prévue : les
questions elles-mêmes sont en français, une fiche anglaise attirerait un public que l'app ne sert
pas (`docs/store-listing.md`, en-tête). Ces textes existent pour le jour où une localisation est
décidée.

### Promotional Text — 170 characters max

**Option 1** (162 characters)

```
The questions nobody asks. The answers everybody wants. One a day, the same for everyone: you answer, you find out your stat, then you see what your friends said.
```

**Option 2** (130 characters)

```
The questions nobody asks. The answers everybody wants. The question drops at 7am, you answer in two taps, and so do your friends.
```

### What's New — 4000 characters max

**A. First published version**

```
First release of StatOwrel.

One question a day, the same one for everybody. It drops at 7am. You answer in two taps, you find out which percentage you fall into, then you see what your friends answered.

Your streak grows as long as you don't miss a day. Your calendar keeps every question already asked, including the ones from before you arrived: you can answer them afterwards to complete your collection.

Friends are added by their exact username. No search, no directory, no public profiles. When one of them answers a day, a dot shows up on that calendar cell.

Also in this release: an evening reminder if you haven't played yet, a nudge to go see your friends' answers if you have, and account deletion straight from the settings.

One question, one answer, one statistic, your friends. Under thirty seconds a day.
```

**B. Update over 1.0.0**

```
This one fixes and speeds things up.

The daily question now opens full height and scrolls inside: nothing hides under your phone's system bar any more.

A day you missed now carries a button on its calendar cell. Tap it, the question opens, you answer after the fact. Your collection fills up — your streak, on the other hand, does not restart.

The app starts faster and reads far less: months you've already opened show up even with no network.

Also: the launch screen no longer gets stuck, the day rolls over properly at midnight when the app was left open, and the display is locked to portrait.

Something off, an idea, a question to suggest: write to us.
```

---

## Notes pour le reviewer Apple

> ⚠️ **Un champ reste à compléter avant soumission** : les identifiants du compte de démonstration
> (`docs/production-checklist.md` §2.4) — inchangé depuis la 1.0.0, le compte n'existe pas encore.

```
IDENTIFIANTS DE DÉMONSTRATION
E-mail : <À COMPLÉTER>
Mot de passe : <À COMPLÉTER>

L'application est intégralement derrière une connexion : merci d'utiliser le compte de démonstration ci-dessus.

Le compte fourni a déjà répondu à plusieurs journées et compte deux amis, afin que le calendrier, le résultat statistique et la liste d'amis soient tous visibles immédiatement.

PARCOURS EN 30 SECONDES
1. Au premier lancement, un carrousel de présentation en quatre écrans s'affiche avant la connexion. Le dernier écran demande l'autorisation des notifications ; elle peut être refusée sans conséquence sur le parcours. Une question de démonstration est ensuite proposée : y répondre est facultatif.
2. Connexion avec l'e-mail et le mot de passe fournis.
3. L'écran d'accueil affiche la série en cours et le calendrier du mois.
4. Toucher le bandeau de la question du jour, ou n'importe quelle case du calendrier — un jour manqué porte un bouton « ? » qui ouvre la même journée.
5. Toucher une option une première fois : elle se sélectionne. La toucher une seconde fois : la réponse est validée. Il n'y a volontairement pas de bouton « Valider » — le second toucher est le bouton.
6. L'écran bascule sur le résultat : le pourcentage, la statistique de chaque option, et les réponses des amis.
7. Le second bouton de l'en-tête ouvre le menu : liste d'amis, invitation, réglages, suppression du compte.

CONNEXION AVEC APPLE
« Se connecter avec Apple » est proposé au même niveau que Google et l'e-mail, conformément à la guideline 4.8.

CONTENU GÉNÉRÉ PAR LES UTILISATEURS
Les questions ne sont pas publiées par les utilisateurs : elles sont approuvées une par une dans une console de modération avant de pouvoir être diffusées. L'application ne permet pas d'en proposer. Une réponse est le choix d'une option pré-écrite — jamais de texte libre, jamais de photo. Le seul texte qu'un utilisateur écrit est son nom d'utilisateur, visible uniquement de ses amis : il n'y a ni annuaire, ni recherche, ni profil public. Une amitié se retire des deux côtés à tout moment, depuis le menu de la ligne d'ami : retirer un ami est le blocage, il n'y a plus aucun contenu partagé ensuite.

SIGNALER UN UTILISATEUR
Un nom d'utilisateur inapproprié se signale à l'éditeur depuis la page d'assistance, accessible sans compte : https://statowrel-app.web.app/legal/assistance. Tout signalement est traité sous 24 heures, et le nom d'utilisateur concerné est supprimé ou le compte désactivé.

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

**Ce qui a changé par rapport aux notes de la 1.0.0, et pourquoi :**

- Le point 4 du parcours mentionne le **bouton « ? » des jours manqués** — c'est désormais le
  chemin visible du rattrapage, et un reviewer qui tape une case vide doit comprendre ce qu'il
  ouvre.
- Tout le reste est identique : la migration React Native Firebase, le déplacement de la console
  sous `/admin/` et les optimisations de lecture ne changent rien au parcours du reviewer.
- Le compte de démonstration reste **à compléter** — inchangé depuis la 1.0.0.
- Rien n'a bougé depuis les notes de la **1.0.1-rc1** : cette finale est le même arbre.

**Permissions demandées par l'app**

| Permission | Quand | Refus |
|---|---|---|
| Notifications | Dernier écran du carrousel d'accueil, après une phrase qui dit à quoi elles servent ; redemandable depuis le Menu | Sans conséquence — l'app fonctionne entièrement sans |

L'app ne demande **ni** la localisation, **ni** les contacts, **ni** l'appareil photo, **ni** le
suivi publicitaire (aucun appel à `AppTrackingTransparency`, aucun SDK publicitaire).

---

## Plan de test QA interne

À exécuter sur le **build iOS 8** et le **build Android 7**, profil `production`, sur **appareil
physique** — pas sur simulateur : les notifications push et la connexion Apple ne fonctionnent pas
autrement.

> ⚠️ **Cette version change de SDK Firebase.** L'app parle désormais aux SDK natifs (React Native
> Firebase) et plus au SDK web : auth, Firestore, callables et push passent tous par un code
> nouveau. La **régression complète** ci-dessous n'est pas optionnelle — elle est le test de la
> migration. Si elle a déjà été passée en entier sur la 1.0.1-rc1 *depuis le même arbre*, elle n'est
> pas à refaire : la finale ne contient pas une ligne de plus.

### Delta de la 1.0.1 — à passer en priorité

**Migration React Native Firebase**

- [ ] Le build de dev client et le build `production` **compilent et se lancent** sur iOS
      (résolution CocoaPods) et Android (`google-services.json` / `GoogleService-Info.plist`
      en place par variante — `apps/app/firebase/`, déclarés par `app.config.ts`)
- [ ] Les trois connexions (e-mail, Google, Apple) passent sur les deux plateformes
- [ ] Répondre à la question du jour : l'écriture passe, le résultat s'affiche
- [ ] `friends-inviteFriend` (callable) répond — pseudo connu et inconnu
- [ ] Push de 7h reçue sur un build de cette version (jeton enregistré via le nouveau SDK)
- [ ] Aucun code d'erreur brut `firestore/*`, `auth/*` ou `functions/*` ne remonte à l'écran

**Démarrage et écran de lancement**

- [ ] Lancement à froid : le splash (l'étoile sur le jaune) ne reste **jamais plus de 6 s**, même
      hors ligne ou sur session lente — plus d'écran blanc
- [ ] Mode avion, mois passés déjà visités : le calendrier s'affiche depuis le **cache disque** du
      SDK, sans chargement infini

**Question du jour en modal**

- [ ] La question s'ouvre en **modal pleine hauteur** sur iOS **et** Android (plus de feuille à
      mi-écran sous laquelle passe la barre système)
- [ ] Le contenu scrolle **à l'intérieur** du modal quand la question ou les options dépassent
- [ ] Après le double tap, l'écran ne bascule sur le résultat qu'**une fois les chiffres arrêtés**
      — aucun battement de pourcentages, sa propre réponse comptée d'emblée

**Rattrapage depuis le calendrier**

- [ ] Un jour manqué porte un bouton « ? » (en noir) sur sa case
- [ ] Le bouton ouvre la journée, la réponse est prise, le résultat s'affiche
- [ ] La série n'est **pas** rallumée par un rattrapage (attendu)

**Jour courant sur une horloge vivante**

- [ ] App laissée ouverte au passage de minuit : le bandeau bascule sur la nouvelle journée
- [ ] App remise au premier plan le lendemain sans relancement : « aujourd'hui » et la série
      suivent le vrai jour — plus de journée figée sur la veille

**Avatars sans lecture de profil**

- [ ] Les avatars des amis s'affichent (initiales puis motif généré depuis le pseudo) — aucune
      lecture `v1_users` par ami
- [ ] Son propre avatar dans le Menu affiche la photo du fournisseur d'identité quand elle existe

**Site web et pages légales**

- [ ] `npm run deploy:admin:production` passé, puis en navigation privée : la **racine** du site
      affiche la page de présentation, `/admin/` la console de modération
- [ ] `/legal/cgu`, `/legal/confidentialite`, `/legal/mentions-legales`, `/legal/assistance`,
      `/legal/protection-des-enfants` répondent toujours — pas la page de présentation, pas la
      console. Les cinq pages sont acquises depuis la 1.0.0, mais le déplacement sous `/admin/`
      rejoue les réécritures qui les servent

### Régression complète

**Onboarding et question de démonstration**

- [ ] Premier lancement sur un appareil vierge : le carrousel s'affiche **avant** tout écran de connexion
- [ ] Les quatre écrans défilent, le dernier propose l'autorisation des notifications
- [ ] Refuser l'autorisation : le parcours continue sans blocage
- [ ] La question de démonstration s'ouvre, la réponse se fait au double tap, le résultat s'affiche
- [ ] Ne **pas** répondre à la démo, puis se connecter : aucune erreur
- [ ] Relancer l'app : le carrousel ne réapparaît pas

**Authentification et compte**

- [ ] Inscription e-mail + mot de passe, choix du pseudo, arrivée sur l'écran Stats
- [ ] Pseudo déjà pris : le message d'erreur est explicite, aucun code `auth/*` brut n'apparaît
- [ ] Connexion Google (iOS et Android)
- [ ] Connexion Apple (iOS), **y compris avec « Masquer mon e-mail »**
- [ ] Déconnexion puis reconnexion : la session persiste au relancement
- [ ] Suppression de compte : confirmation native, puis déconnexion locale
- [ ] Après suppression : le pseudo est de nouveau disponible, l'ex-ami ne voit plus l'amitié
- [ ] Après suppression : les `answer_counts` des questions répondues sont **inchangés** (c'est voulu)

**Question du jour et résultat**

- [ ] Le bandeau de l'écran Stats porte la question tant que la journée est ouverte
- [ ] Une fois répondu, le bandeau bascule sur « RDV demain » et devient inerte
- [ ] Double tap : premier tap sélectionne, changement d'option possible, second tap valide
- [ ] Le résultat s'affiche : phrase de rareté, part de chaque option, la sienne cochée en jaune
- [ ] Réouvrir une journée répondue : on retombe sur le résultat, pas sur les options
- [ ] Les réponses des amis n'apparaissent **qu'après** avoir répondu soi-même

**Série, calendrier et stats**

- [ ] Série, record et total de jours répondus cohérents après une réponse
- [ ] La case du jour se coche, l'accent « aujourd'hui » reste visible
- [ ] Une journée où un ami a répondu depuis la dernière ouverture porte une pastille rose, qui
      disparaît quand on ouvre la journée
- [ ] Le bouton de proposition de question affiche bien sa condition et **n'ouvre rien** (attendu en 1.0)

**Potes**

- [ ] Invitation par pseudo exact ; pseudo inconnu : « Utilisateur introuvable. » sous le champ
- [ ] L'invité reçoit une notification « Nouvelle invitation », un tap ouvre le menu
- [ ] L'invitation reçue apparaît en haut de l'écran Stats **et** dans la liste du menu
- [ ] Accepter, refuser, annuler, retirer : les deux moitiés de l'amitié suivent des deux côtés

**Notifications**

- [ ] Le jeton est enregistré au lancement d'une session connectée, supprimé à la déconnexion
- [ ] Push de 7h reçue, un tap ouvre la question du jour
- [ ] Push du soir sans avoir répondu : « … ont répondu à la question du jour. Et toi ? »
- [ ] Push du soir sans ami ayant répondu : « Ne perds pas ta série… »
- [ ] Push du soir en ayant déjà répondu : « Découvre la réponse de tes potes… »
- [ ] Aucun envoi du soir quand aucun ami n'a répondu et que l'on a déjà répondu
- [ ] Android : les deux canaux (question du jour, invitations) sont distincts dans les réglages système
- [ ] Permission refusée au carrousel : l'alerte de relance ne revient pas, le bouton du Menu la
      relève (ou ouvre les réglages système quand elle est grillée)

**Robustesse**

- [ ] `npm run typecheck` et `npm run lint` verts (aucune CI sur ce dépôt)
- [ ] Mode avion : aucun écran ne reste bloqué sur un chargement infini
- [ ] Écran de lancement (l'étoile sur le jaune) et icône corrects sur les deux plateformes
- [ ] Petit écran (iPhone SE) et police système agrandie : rien ne déborde
- [ ] L'app reste en **portrait** quand l'appareil tourne, iOS et Android, iPad compris
- [ ] Le premier tir de `scheduleDailyQuestion` à 07:00 Paris est vérifié dans les logs

---

## Mots-clés

### App Store — français, 100 caractères max, séparés par des virgules sans espace

```
question,jour,potes,amis,stat,statistique,sondage,quiz,vote,serie,streak,quotidien,matin,entre
```
94 caractères. Aucune marque concurrente, aucune répétition du nom ni du sous-titre, singulier et
sans accent — les trois règles de `docs/store-listing.md` §1.5.

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

Ce qui doit être vrai **avant** de soumettre les builds iOS 8 et Android 7. Les cases cochées sont
acquises dans ce dépôt à hauteur du commit taggé.

### Bloquants store encore ouverts

- [ ] **Signalement d'un utilisateur dans l'app** — guideline 1.2, `docs/production-checklist.md`
      §2.3. Aucune collection `v1_user_reports`, aucune action « Signaler ce pote ». Le contact
      éditeur de `/legal/assistance` couvre l'exigence « traitement sous 24 h », mais **pas** le
      mécanisme de signalement lui-même. **Le seul bloquant dur qui reste côté code.**
- [ ] `npm run deploy:admin:production` — la page de présentation et le déplacement `/admin/` ne
      sont en ligne qu'à hauteur du dernier déploiement Hosting, réécritures comprises
- [ ] Page web de demande de suppression de compte (exigée par Play, hors de l'app)
- [ ] URLs de confidentialité et de support renseignées dans App Store Connect **et** dans la Play
      Console ; URL des normes de sécurité des enfants (`/legal/protection-des-enfants`)
      renseignée dans la Play Console
- [ ] Compte de démonstration créé sur la production, avec des journées répondues et deux amis
      acceptés, puis renseigné dans les deux consoles
- [ ] Capability « Sign in with Apple » activée sur l'App ID `fr.quentinmachard.statowrel`
- [ ] Relecture juridique des cinq pages légales

### Acquis dans le code à cette version

- [x] **App sur React Native Firebase** — SDK natifs, résolution CocoaPods sur iOS, fichiers
      Firebase déclarés par variante *(nouveau en 1.0.1)*
- [x] **Site racine = page de présentation**, console sous `/admin/` *(nouveau en 1.0.1)*
- [x] **Portrait verrouillé** sur iOS et Android *(nouveau en 1.0.1)*
- [x] **Rattrapage visible** — les jours manqués du calendrier sont des boutons *(nouveau en 1.0.1)*
- [x] Normes de sécurité des enfants (CSAE) publiées sur `/legal/protection-des-enfants`
      (+ alias `/legal/child-safety`) — FR puis EN *(acquis en 1.0.0)*
- [x] Âge minimum 16 ans dans les CGU, aligné sur le classement des fiches *(acquis en 1.0.0)*
- [x] Réponse de démonstration acceptée sur le seul statut `demo` de la question *(acquis en 1.0.0)*
- [x] Politique de confidentialité servie sur `/legal/confidentialite`
- [x] Page d'assistance servie sur `/legal/assistance`, avec adresse de contact, délais, FAQ,
      suppression de compte, signalement et droits RGPD
- [x] Identité de l'éditeur complète sur les pages légales — Quentin Machard SAS, RCS Laval
      891 303 893
- [x] Permission de notification redemandable — alerte une fois par installation, interrupteur
      permanent dans le Menu
- [x] Règle de création d'une réponse tolérante à `counted_at` absent (déployée avec les rules)
      *(acquis avant la 1.0.0)*
- [x] Suppression de compte depuis l'app (`users-deleteAccount`)
- [x] Connexion avec Apple au même niveau que Google et l'e-mail
- [x] Notification du matin réellement envoyée — la fiche peut en parler
- [x] Aucun SDK d'analytics ni de publicité : les deux formulaires de confidentialité restent
      ceux de `docs/store-listing.md` §1.11 et §2.4

### Hors de cette version — pour la 1.0.2

Sur `main`, **absent des builds 8 / 7**, à ne décrire dans aucune fiche tant que la 1.0.2 n'est pas
partie :

- [ ] Mot de passe oublié depuis l'écran de connexion (`fd9c664`)
- [ ] Message d'erreur nommé pour le `DEVELOPER_ERROR` de la connexion Google Android (`c107cfd`)
- [ ] Pot de modération en table filtrable et triable dans `apps/admin` (`f03575a` → `3575e2e`)

### Infrastructure

- [ ] Projet Firebase de développement séparé de la production (`.firebaserc` pointe les deux
      alias sur `statowrel-app` — `docs/production-checklist.md` §3.1)
- [ ] `eas env:list --environment production` : les six `EXPO_PUBLIC_FIREBASE_*` présents, aucun
      `*_EMULATOR_*`, **et les fichiers `google-services.json` / `GoogleService-Info.plist` de
      production fournis à EAS** — la migration React Native Firebase configure l'app nativement,
      plus par variables au runtime
- [ ] `npm run deploy:firestore:production` passé — règles `counted_at` comprises, index du
      calendrier **Enabled** et non « Building »
- [ ] `npm run deploy:functions:production` passé, `firebase functions:list` montre les deux
      schedulers et les deux triggers
- [ ] Alerte de budget et sauvegardes Firestore programmées
- [ ] Bloc `submit.production` d'`eas.json` rempli (iOS : `appleId`, `ascAppId`, `appleTeamId` ;
      Android : clé de compte de service, `track: internal`)
- [ ] Domaine tranché — `statowrel-app.web.app` ou un domaine propre (`docs/store-listing.md` §4) ;
      un changement après soumission oblige à remettre à jour les deux consoles et l'app

### Contenu

- [ ] **Au moins 90 questions approuvées** dans le pot (`npm run seed-questions`, puis approbation
      dans `apps/admin`) — un jour sans question casse la série de tout le monde
- [ ] `npm run seed-daily-questions` passé sur la production
- [ ] `npm run seed-demo-question` passé sur la production — sans lui, le carrousel d'accueil
      ouvre sur une question introuvable
- [ ] Console de modération déployée et rôle admin accordé

### Visuels

- [ ] Captures 1 à 3 de `docs/store-listing.md` §3.1 aux deux formats iOS et au format Play —
      **à refaire sur cette version** : la question du jour est désormais un modal pleine hauteur
- [ ] Capture 4 : **utiliser la variante de repli** (« TA SÉRIE NE TIENT QU'À TOI. ») — la
      proposition de questions n'existe pas
- [ ] Bannière Play 1024×500
- [ ] Icônes 1024×1024 (iOS) et 512×512 (Play)

### Recette

- [ ] Delta de la 1.0.1 ci-dessus passé en entier, **migration React Native Firebase comprise**
- [ ] Plan de test QA passé en entier sur iOS **et** Android, sur appareil physique
- [ ] TestFlight interne : au moins une semaine d'usage quotidien réel, c'est le seul moyen de
      vérifier que le rendez-vous de 7h tient
- [ ] Piste de test interne Play lancée en parallèle
