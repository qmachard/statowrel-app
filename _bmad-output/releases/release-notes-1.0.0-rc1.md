# StatOwrel 1.0.0-rc1 — notes de version

| Champ | Valeur |
|---|---|
| Version | **1.0.0-rc1** (`version` applicative : `1.0.0`) |
| Build iOS | non figé — la rc précède le build TestFlight (`autoIncrement` + `appVersionSource: "remote"` dans `apps/app/eas.json`) |
| Date | 2026-08-21 |
| Nature | **pre-release** — première release candidate, aucune version publiée avant elle |
| Fiche store | **français (France) uniquement** pour la 1.0 (`docs/store-listing.md`) ; la section anglaise ci-dessous est une réserve, à ne pas publier |

Source de vérité des textes : `docs/store-listing.md`. Cette note ne fait que découper la fiche
pour la soumission de cette version et **réactive les blocs de la §7** dont le code est désormais
présent (notification de 7 h, rappel du soir, suppression de compte).

---

## Français

### Texte promotionnel — 170 caractères max

Champ modifiable **sans nouvelle soumission**. Trois options, la première retenue.

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

```
Première version de StatOwrel.

Une question par jour, la même pour tout le monde. Elle tombe à 7h du matin. Tu réponds en deux taps, tu découvres dans quel pourcentage tu tombes, puis ce que tes potes ont répondu.

Ta série monte tant que tu ne rates pas un jour. Ton calendrier garde toutes les questions déjà posées, y compris celles d'avant ton arrivée : tu peux y répondre après coup pour compléter ta collection.

Tes potes s'ajoutent par leur nom d'utilisateur exact. Pas de recherche, pas d'annuaire, pas de profils publics. Quand l'un d'eux répond à une journée, une pastille apparaît sur la case du calendrier.

Et aussi : un rappel le soir si tu n'as pas encore joué, une découverte du jour si tu as déjà répondu, et la suppression de ton compte depuis les réglages, en deux taps.

Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.

Un souci, une idée, une question à proposer : écris-nous.
```

Ton : tutoiement, aucun emoji, aucun markdown, paragraphes courts — conformément à
`docs/store-listing.md` §6.

> ⚠️ **Ne rien ajouter ici sur le partage du résultat ni sur la proposition de questions.** Ni
> l'un ni l'autre n'existe dans le binaire (`docs/production-checklist.md` §1.3 et §1.4) ; le
> bouton de proposition est visible mais n'ouvre rien. Décrire une fonctionnalité absente est le
> motif de rejet 2.3.1.

### Description complète — 4000 caractères max

Reprend `docs/store-listing.md` §1.4 et **y insère un bloc**, `LA NOTIFICATION DE 7H`, désormais
honoré par le code (§7 du même document, débloqué par la checklist §1.1). Le reste est inchangé.

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

```
First release of StatOwrel.

One question a day, the same one for everybody. It drops at 7am. You answer in two taps, you find out which percentage you fall into, then you see what your friends answered.

Your streak grows as long as you don't miss a day. Your calendar keeps every question already asked, including the ones from before you arrived: you can answer them afterwards to complete your collection.

Friends are added by their exact username. No search, no directory, no public profiles. When one of them answers a day, a dot shows up on that calendar cell.

Also in this release: an evening reminder if you haven't played yet, a nudge to go see your friends' answers if you have, and account deletion straight from the settings.

One question, one answer, one statistic, your friends. Under thirty seconds a day.
```

---

## Notes pour le reviewer Apple

> ⚠️ **Deux champs sont à compléter avant soumission** : les identifiants du compte de
> démonstration (`docs/production-checklist.md` §2.4, le compte n'existe pas encore).

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
4. Toucher le bandeau de la question du jour, ou n'importe quelle case du calendrier.
5. Toucher une option une première fois : elle se sélectionne. La toucher une seconde fois : la réponse est validée. Il n'y a volontairement pas de bouton « Valider » — le second toucher est le bouton.
6. L'écran bascule sur le résultat : le pourcentage, la statistique de chaque option, et les réponses des amis.
7. Le second bouton de l'en-tête ouvre le menu : liste d'amis, invitation, réglages, suppression du compte.

CONNEXION AVEC APPLE
« Se connecter avec Apple » est proposé au même niveau que Google et l'e-mail, conformément à la guideline 4.8.

CONTENU GÉNÉRÉ PAR LES UTILISATEURS
Les questions ne sont pas publiées par les utilisateurs : elles sont approuvées une par une dans une console de modération avant de pouvoir être diffusées. L'application ne permet pas d'en proposer. Une réponse est le choix d'une option pré-écrite — jamais de texte libre, jamais de photo. Le seul texte qu'un utilisateur écrit est son nom d'utilisateur, visible uniquement de ses amis : il n'y a ni annuaire, ni recherche, ni profil public. Une amitié se retire des deux côtés à tout moment, depuis le menu de la ligne d'ami.

NOTIFICATIONS
L'application envoie trois notifications au maximum : la question du jour à 7h, un rappel en fin de journée, et une alerte lors de la réception d'une invitation d'un ami. L'autorisation est demandée une seule fois, au dernier écran du carrousel d'accueil, après explication de ce à quoi elle sert.

SUPPRESSION DU COMPTE
Menu (second bouton de l'en-tête) → « Supprimer mon compte », derrière une confirmation. La suppression est immédiate et définitive : profil, réponses, calendrier, amitiés, jetons de notification, réservation du nom d'utilisateur et compte d'authentification.

CONDITIONS D'UTILISATION ET MENTIONS LÉGALES
Accessibles depuis le bas des écrans de connexion et d'inscription, et depuis le bas du menu.
```

**Ce qui a changé par rapport à `docs/store-listing.md` §1.10, et pourquoi :**

- Le paragraphe **« un utilisateur peut signaler un nom d'utilisateur inapproprié »** est
  **retiré** : la fonctionnalité n'existe pas (`docs/production-checklist.md` §2.3, aucune
  collection `v1_user_reports` dans le dépôt). Un examinateur qui suit un chemin décrit dans les
  notes et ne le trouve pas rejette. **C'est un bloquant guideline 1.2 encore ouvert.**
- Le paragraphe **suppression de compte** est conservé et précisé : il est désormais honoré par le
  callable `users-deleteAccount`.
- Le **carrousel d'accueil** et la **question de démonstration** sont ajoutés en tête du parcours :
  ils précèdent la connexion, et un examinateur qui ne s'y attend pas croirait avoir manqué
  l'écran de login.

**Permissions demandées par l'app**

| Permission | Quand | Refus |
|---|---|---|
| Notifications | Dernier écran du carrousel d'accueil, après une phrase qui dit à quoi elles servent | Sans conséquence — l'app fonctionne entièrement sans |

L'app ne demande **ni** la localisation, **ni** les contacts, **ni** l'appareil photo, **ni** le
suivi publicitaire (aucun appel à `AppTrackingTransparency`, aucun SDK publicitaire).

---

## Plan de test QA interne

À exécuter sur un build **`production`**, sur **appareil physique** (iOS et Android), pas sur
simulateur — les notifications push et la connexion Apple ne fonctionnent pas autrement.

### Onboarding et question de démonstration

- [ ] Premier lancement sur un appareil vierge : le carrousel s'affiche **avant** tout écran de connexion
- [ ] Les quatre écrans défilent, le dernier propose l'autorisation des notifications
- [ ] Refuser l'autorisation : le parcours continue sans blocage
- [ ] La question de démonstration s'ouvre, la réponse se fait au double tap, le résultat s'affiche
- [ ] Ne **pas** répondre à la démo, puis se connecter : aucune erreur
- [ ] Répondre à la démo **puis** se connecter : la réponse est comptée dans les statistiques de la question de démonstration, et n'ajoute ni jour au calendrier ni jour à la série
- [ ] Relancer l'app : le carrousel ne réapparaît pas

### Authentification et compte

- [ ] Inscription e-mail + mot de passe, choix du pseudo, arrivée sur l'écran Stats
- [ ] Pseudo déjà pris : le message d'erreur est explicite, aucun code `auth/*` brut n'apparaît
- [ ] Connexion Google (iOS et Android)
- [ ] Connexion Apple (iOS), **y compris avec « Masquer mon e-mail »**
- [ ] Déconnexion puis reconnexion : la session persiste au relancement
- [ ] Les liens CGU et mentions légales s'ouvrent depuis la connexion, l'inscription et le menu
- [ ] Suppression de compte : confirmation native, puis déconnexion locale
- [ ] Après suppression : le pseudo est de nouveau disponible, l'ex-ami ne voit plus l'amitié
- [ ] Après suppression : les `answer_counts` des questions répondues sont **inchangés** (c'est voulu)

### Question du jour et résultat

- [ ] Le bandeau de l'écran Stats porte la question tant que la journée est ouverte
- [ ] Une fois répondu, le bandeau bascule sur « RDV demain » et devient inerte
- [ ] Double tap : premier tap sélectionne, changement d'option possible, second tap valide
- [ ] Le résultat s'affiche : phrase de rareté, part de chaque option, la sienne cochée en jaune
- [ ] Réouvrir une journée répondue : on retombe sur le résultat, pas sur les options
- [ ] Rattrapage d'un jour passé depuis le calendrier : la réponse est prise, la série n'est **pas** rallumée
- [ ] Les réponses des amis n'apparaissent **qu'après** avoir répondu soi-même
- [ ] Le contenu du résultat est scrollable jusqu'au bout, y compris avec beaucoup d'amis

### Série, calendrier et stats

- [ ] Série, record et total de jours répondus cohérents après une réponse
- [ ] La case du jour se coche, l'accent « aujourd'hui » reste visible
- [ ] Une journée où un ami a répondu depuis la dernière ouverture porte une pastille rose
- [ ] Ouvrir cette journée : la pastille disparaît
- [ ] Le bouton de proposition de question affiche bien sa condition et **n'ouvre rien** (attendu en 1.0)

### Potes

- [ ] Invitation par pseudo exact depuis la feuille d'invitation
- [ ] Pseudo inconnu : « Utilisateur introuvable. » sous le champ
- [ ] L'invité reçoit une notification « Nouvelle invitation », un tap ouvre le menu
- [ ] L'invitation reçue apparaît en haut de l'écran Stats **et** dans la liste du menu
- [ ] Accepter, refuser, annuler, retirer : les deux moitiés de l'amitié suivent des deux côtés
- [ ] Les avatars s'affichent (initiales, puis motif généré, puis photo de profil)

### Notifications

- [ ] Le jeton est enregistré au lancement d'une session connectée, supprimé à la déconnexion
- [ ] Push de 7h reçue, un tap ouvre la question du jour
- [ ] Push du soir sans avoir répondu : « … ont répondu à la question du jour. Et toi ? »
- [ ] Push du soir sans ami ayant répondu : « Ne perds pas ta série… »
- [ ] Push du soir en ayant déjà répondu : « Découvre la réponse de tes potes… »
- [ ] Aucun envoi du soir quand aucun ami n'a répondu et que l'on a déjà répondu
- [ ] Android : les deux canaux (question du jour, invitations) sont distincts dans les réglages système

### Régression et robustesse

- [ ] `npm run typecheck` et `npm run lint` verts (aucune CI sur ce dépôt)
- [ ] Mode avion : aucun écran ne reste bloqué sur un chargement infini
- [ ] Écran de lancement (l'étoile sur le jaune) et icône corrects sur les deux plateformes
- [ ] Petit écran (iPhone SE) et police système agrandie : rien ne déborde
- [ ] Android : aucune feuille ne passe sous la barre de navigation système
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

Ce qui doit être vrai **avant** de soumettre la 1.0 finale. Les cases cochées sont acquises dans ce
dépôt à la date de cette rc.

### Bloquants store encore ouverts

- [ ] **Signalement d'un utilisateur** — guideline 1.2, `docs/production-checklist.md` §2.3. Aucune
      collection `v1_user_reports`, aucune action « Signaler ce pote ». **Le seul bloquant dur qui
      reste côté code.**
- [ ] Politique de confidentialité **publiée** et son URL renseignée dans les deux consoles
      (`docs/privacy-policy.md` est rédigé, non hébergé)
- [ ] Page web de demande de suppression de compte (exigée par Play, hors de l'app)
- [ ] Page ou adresse de support publique
- [ ] Compte de démonstration créé sur la production, avec des journées répondues et deux amis
      acceptés, puis renseigné dans App Store Connect **et** dans la Play Console
- [ ] Capability « Sign in with Apple » activée sur l'App ID `fr.quentinmachard.statowrel`

### Acquis dans le code à cette rc

- [x] Suppression de compte depuis l'app (`users-deleteAccount`)
- [x] Connexion avec Apple au même niveau que Google et l'e-mail
- [x] CGU et mentions légales atteignables depuis l'app et servies en HTTPS
- [x] Notification du matin réellement envoyée — la fiche peut en parler
- [x] Aucun SDK d'analytics ni de publicité : les deux formulaires de confidentialité restent
      ceux de `docs/store-listing.md` §1.11 et §2.4

### Infrastructure

- [ ] Projet Firebase de développement séparé de la production (`.firebaserc` pointe les deux
      alias sur `statowrel-app` — `docs/production-checklist.md` §3.1)
- [ ] `eas env:list --environment production` : les six `EXPO_PUBLIC_FIREBASE_*` présents, aucun
      `*_EMULATOR_*`
- [ ] `npm run deploy:firestore:production` passé, index du calendrier **Enabled** et non
      « Building »
- [ ] `npm run deploy:functions:production` passé, `firebase functions:list` montre les deux
      schedulers et les deux triggers
- [ ] Alerte de budget et sauvegardes Firestore programmées
- [ ] Bloc `submit.production` d'`eas.json` rempli (iOS : `appleId`, `ascAppId`, `appleTeamId` ;
      Android : clé de compte de service, `track: internal`)

### Contenu

- [ ] **Au moins 90 questions approuvées** dans le pot (`npm run seed-questions`, puis approbation
      dans `apps/admin`) — un jour sans question casse la série de tout le monde
- [ ] `npm run seed-daily-questions` passé sur la production, pour qu'un nouvel arrivant ne tombe
      pas sur un calendrier vide
- [ ] `npm run seed-demo-question` passé sur la production — sans lui, le carrousel d'accueil
      ouvre sur une question introuvable
- [ ] Console de modération déployée (`npm run deploy:admin:production`) et rôle admin accordé

### Visuels

- [ ] Captures 1 à 3 de `docs/store-listing.md` §3.1 aux deux formats iOS et au format Play
- [ ] Capture 4 : **utiliser la variante de repli** (« TA SÉRIE NE TIENT QU'À TOI. ») — la
      proposition de questions n'existe pas
- [ ] Bannière Play 1024×500
- [ ] Icônes 1024×1024 (iOS) et 512×512 (Play)

### Recette

- [ ] Plan de test QA ci-dessus passé en entier sur iOS **et** Android, sur appareil physique
- [ ] TestFlight interne : au moins une semaine d'usage quotidien réel, c'est le seul moyen de
      vérifier que le rendez-vous de 7h tient
- [ ] Piste de test interne Play lancée en parallèle
