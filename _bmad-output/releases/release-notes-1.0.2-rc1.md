# StatOwrel 1.0.2-rc1 — notes de version

| Champ | Valeur |
|---|---|
| Version | **1.0.2-rc1** (`version` applicative : `1.0.2` dans `apps/app/package.json` et `apps/app/app.config.ts` — Expo et l'App Store n'acceptent pas de suffixe pré-release) |
| Build iOS | *non attribué* — la rc précède le build TestFlight ; `eas.json` auto-incrémente (`appVersionSource: remote`) |
| Build Android | *non attribué* — idem |
| Date | 2026-08-27 |
| Nature | **pre-release** — première rc de la 1.0.2 |
| Version précédente | **1.0.1** (builds iOS 8 / Android 7), taggée sur `3213e72` — `release-notes-1.0.1.md` |
| Fiche store | **français (France) uniquement** pour la 1.0 (`docs/store-listing.md`) ; la section anglaise ci-dessous est une réserve, à ne pas publier |

Cette note part de la **1.0.1** et n'en décrit que le delta. Ce delta est exactement ce que la note
de la 1.0.1 avait mis de côté sous « Hors de cette version — pour la 1.0.2 » : le mot de passe
oublié, le message d'erreur nommé de la connexion Google sur Android, et la table de modération de
`apps/admin`.

Une seule de ces trois choses se raconte sur une fiche store — **le mot de passe oublié**. La
deuxième est un message d'erreur, et la troisième n'est pas dans le binaire du tout : c'est la
console web.

> ⚠️ **La 1.0.2 ne répare pas la connexion Google sur Android — elle la nomme.** L'empreinte SHA-1
> de la clé de signature Play doit être enregistrée dans la console Firebase ; aucun code ne peut le
> faire. Voir « Bloquants » plus bas : c'est un pré-requis de soumission Android, pas un item de QA.

---

## Ce qui change depuis la 1.0.1

| # | Changement | Effet sur la soumission |
|---|---|---|
| 1 | **Mot de passe oublié** depuis l'écran de connexion (`fd9c664`) — un écran qui demande l'adresse, Firebase envoie le lien, le nouveau mot de passe se choisit sur la page que ce lien ouvre | Seule nouveauté annonçable de cette version. À ajouter au parcours reviewer : un compte e-mail sans mot de passe n'était jusqu'ici récupérable par personne |
| 2 | **`DEVELOPER_ERROR` nommé** sur la connexion Google Android (`c107cfd`) — le code tombait dans « Quelque chose s'est mal passé. Réessaie. », une relance qui ne pouvait pas aboutir | Ne change rien à la fiche. **Rend visible un bloquant Android réel** : sans le SHA-1 de la clé Play enregistré dans Firebase, la connexion Google échoue sur tout build installé depuis le store |
| 3 | **Pot de modération en table filtrable et triable** dans `apps/admin` (`f03575a` → `3575e2e`) — six colonnes, filtre par statut, verdicts par statut, colonne auteur, tri par défaut sur la date de création | **Hors binaire.** Aucune capture, aucun texte, aucun parcours reviewer. Demande un `npm run deploy:admin:production` pour être en ligne |

Deux effets de bord à ne pas manquer :

- `v1_questions` porte un nouveau champ **`updated_at`** (nullable, replié sur `created_at` par
  `questionLastModifiedAt` pour les questions antérieures). Le tirage quotidien l'estampille
  désormais — `apps/functions/src/domains/daily-questions/schedules/scheduleDailyQuestion.ts` a
  changé, donc **un `npm run deploy:functions:production` est nécessaire** pour que la colonne
  « dernière modification » dise la vérité sur une question tirée.
- **`deleteQuestion` a disparu de la console** : une question sort du pot en étant refusée, jamais
  supprimée — une question déjà diffusée est pointée par son mois de calendrier et porte les
  réponses de tout le monde.

Ni les règles Firestore ni les index n'ont bougé (`packages/firestore-config` : aucun diff).

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
§1.3, et la baseline ne se reformule jamais (§6 du même document).

### Nouveautés de cette version — 4000 caractères max

**Deux textes, un seul à coller** — le choix dépend de ce qui est en ligne au moment de soumettre :

**A. Aucune version n'a encore été publiée** (cas attendu : ni le build 6 ni le build 8 ne sont
sortis de TestFlight). La 1.0.2 est alors la **première version publiée** et le texte de la 1.0.0
est repris tel quel — rien de ce qui s'est ajouté depuis n'est une fonctionnalité qu'on annonce à
quelqu'un qui découvre l'app.

```
Première version de StatOwrel.

Une question par jour, la même pour tout le monde. Elle tombe à 7h du matin. Tu réponds en deux taps, tu découvres dans quel pourcentage tu tombes, puis ce que tes potes ont répondu.

Ta série monte tant que tu ne rates pas un jour. Ton calendrier garde toutes les questions déjà posées, y compris celles d'avant ton arrivée : tu peux y répondre après coup pour compléter ta collection.

Tes potes s'ajoutent par leur nom d'utilisateur exact. Pas de recherche, pas d'annuaire, pas de profils publics. Quand l'un d'eux répond à une journée, une pastille apparaît sur la case du calendrier.

Et aussi : un rappel le soir si tu n'as pas encore joué, une découverte du jour si tu as déjà répondu, et la suppression de ton compte depuis les réglages, en deux taps.

Une question, une réponse, une statistique, tes potes. Moins de trente secondes par jour.

Un souci, une idée, une question à proposer : écris-nous.
```

**B. Une 1.0.x est déjà en ligne.** Le texte cumule alors ce que la 1.0.1 apportait et le mot de
passe oublié :

```
Tu peux enfin récupérer ton mot de passe.

Un lien sous le bouton de connexion, tu tapes ton adresse, tu reçois le mail, tu choisis un nouveau mot de passe. Plus besoin de recréer un compte parce qu'on a oublié le sien.

La question du jour s'ouvre en grand, sur toute la hauteur de l'écran, et défile à l'intérieur : plus rien ne passe sous la barre du téléphone.

Un jour que tu as raté porte un bouton sur sa case du calendrier. Tu le touches, la question s'ouvre, tu réponds après coup. Ta collection se complète — ta série, elle, ne repart pas pour autant.

Et aussi : l'app démarre plus vite et lit beaucoup moins, les mois déjà consultés s'affichent même sans réseau, l'écran de lancement ne reste plus bloqué, et la journée bascule bien à minuit quand l'app est restée ouverte.

Un souci, une idée, une question à proposer : écris-nous.
```

Ton : tutoiement, aucun emoji, aucun markdown, paragraphes courts — conformément à
`docs/store-listing.md` §6.

> ⚠️ **Ne rien ajouter ici sur le partage du résultat ni sur la proposition de questions.** Ni l'un
> ni l'autre n'existe dans le binaire (`docs/production-checklist.md` §1.3 et §1.4) ; le bouton de
> proposition est visible mais n'ouvre rien. Décrire une fonctionnalité absente est le motif de
> rejet 2.3.1.

> ⚠️ **Ne rien annoncer sur la console de modération.** Elle n'est pas dans l'app, elle est réservée
> à l'éditeur, et un utilisateur n'a aucun moyen de l'atteindre.

### Description complète — 4000 caractères max

Inchangée depuis la 1.0.0 : `docs/store-listing.md` §1.4 augmenté du bloc `LA NOTIFICATION DE 7H`.
Le mot de passe oublié ne s'y décrit pas — une description de fiche ne raconte pas une procédure de
récupération de compte.

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

**Réserve — à ne pas publier pour la 1.0.** Aucune localisation anglaise n'est prévue : les questions
elles-mêmes sont en français, une fiche anglaise attirerait un public que l'app ne sert pas
(`docs/store-listing.md`, en-tête).

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

**B. Update over a published 1.0.x**

```
You can finally reset your password.

A link under the sign-in button, you type your address, you get the mail, you pick a new password. No more creating a second account because you forgot the first one.

The daily question opens full height and scrolls inside: nothing hides under your phone's system bar any more.

A day you missed carries a button on its calendar cell. Tap it, the question opens, you answer after the fact. Your collection fills up — your streak, on the other hand, does not restart.

Also: the app starts faster and reads far less, months you've already opened show up even with no network, the launch screen no longer gets stuck, and the day rolls over properly at midnight when the app was left open.

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

MOT DE PASSE OUBLIÉ
Le lien « Mot de passe oublié ? » sous le bouton de connexion ouvre un écran qui demande une adresse e-mail. Firebase Authentication envoie le lien de réinitialisation ; le nouveau mot de passe est choisi sur la page que ce lien ouvre. La confirmation affichée est volontairement la même que l'adresse corresponde à un compte ou non — ne pas révéler qu'une adresse est inscrite est une précaution, pas un bug.

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

**Ce qui a changé par rapport aux notes de la 1.0.1, et pourquoi :**

- Un bloc **MOT DE PASSE OUBLIÉ** est ajouté : c'est la seule nouveauté visible du binaire, et un
  reviewer qui tape le lien doit savoir que la confirmation est la même dans les deux cas — sans
  quoi elle ressemble à un faux positif.
- Le reste est identique. La table de modération est hors de l'app, et le message d'erreur Google
  Android ne se rencontre pas sur un parcours qui aboutit.
- Le compte de démonstration reste **à compléter** — inchangé depuis la 1.0.0.

**Permissions demandées par l'app**

| Permission | Quand | Refus |
|---|---|---|
| Notifications | Dernier écran du carrousel d'accueil, après une phrase qui dit à quoi elles servent ; redemandable depuis le Menu | Sans conséquence — l'app fonctionne entièrement sans |

L'app ne demande **ni** la localisation, **ni** les contacts, **ni** l'appareil photo, **ni** le
suivi publicitaire (aucun appel à `AppTrackingTransparency`, aucun SDK publicitaire).

---

## Plan de test QA interne

À exécuter sur le build iOS et le build Android tirés de cette rc, profil `production`, sur
**appareil physique** — pas sur simulateur : les notifications push et la connexion Apple ne
fonctionnent pas autrement.

> La 1.0.1 changeait de SDK Firebase et imposait une régression complète. La 1.0.2 ne touche que
> trois endroits : le **delta** ci-dessous est ce qui doit être passé en priorité, la régression
> complète reste conseillée mais n'est plus le test d'une migration.

### Delta de la 1.0.2 — à passer en priorité

**Mot de passe oublié** (`fd9c664`)

- [ ] Le lien « Mot de passe oublié ? » est visible sous le bouton de connexion, iOS et Android
- [ ] Adresse d'un compte e-mail existant : le mail arrive, le lien ouvre la page Firebase, le
      nouveau mot de passe est accepté, la connexion passe avec
- [ ] Adresse inconnue : **la même confirmation** s'affiche (`auth/user-not-found` est avalé) — c'est
      voulu, ce n'est pas un bug à rouvrir
- [ ] Adresse malformée : l'erreur est en français, aucun code `auth/*` brut à l'écran
- [ ] Le pied de page légal (CGU / confidentialité / mentions légales) reste **collé en bas**, sans
      monter avec le clavier ni suivre le bloc centré
- [ ] Retour arrière depuis l'écran : on retombe sur la connexion, le champ e-mail n'est pas perdu
- [ ] Un compte créé via Google ou Apple n'a pas de mot de passe : demander une réinitialisation sur
      son adresse affiche la même confirmation et ne débloque rien — comportement attendu

**Connexion Google sur Android** (`c107cfd`)

- [ ] **Pré-requis** : le SHA-1 de la clé de signature Play est enregistré dans la console Firebase
      et `google-services.json` a été re-téléchargé **puis re-poussé à EAS** (`apps/app/firebase/README.md`)
- [ ] Build installé **depuis Play** (piste interne) : la connexion Google aboutit
- [ ] Build installé **à la main depuis EAS** : la connexion Google aboutit aussi (les deux
      empreintes sont enregistrées, pas une seule)
- [ ] Tant qu'une empreinte manque : le message nomme la cause au lieu de proposer une relance
      inutile, et la console porte une trace exploitable
- [ ] iOS non affecté : aucune régression de la connexion Google

**Console de modération** (`f03575a` → `3575e2e`) — hors binaire

- [ ] `npm run deploy:functions:production` passé (le tirage quotidien estampille `updated_at`)
- [ ] `npm run deploy:admin:production` passé, puis en navigation privée sur `/admin/`
- [ ] La table s'ouvre triée sur la **date de création**, la plus récente en haut, sans réordonner
      les lignes après le premier rendu
- [ ] Les six colonnes s'affichent, la page tient en 1280 px sans écraser la colonne question
- [ ] Le filtre par statut fonctionne, au clavier comme au doigt (c'est un `<select>` natif)
- [ ] Tri sur l'auteur et sur les deux dates
- [ ] La colonne auteur résout le pseudo derrière `author_id` ; un auteur introuvable n'est pas
      relu à chaque snapshot
- [ ] Actions par statut : `pending` → Approuver / Rejeter / Éditer ; `approved` → Rejeter /
      Éditer ; `rejected` → Approuver (en ghost noir) / Éditer ; `used` et `demo` → Éditer seul
- [ ] Le « ⋮ » est présent sur **chaque** ligne, aligné à droite, et son panneau n'est pas rogné par
      le défilement horizontal de la table
- [ ] Un bouton `ghost` ne devient pas jaune plein au survol
- [ ] « Rejeter » ouvre son modal, le motif est obligatoire, et re-rejeter une question refusée
      rouvre le champ **sur le motif déjà enregistré**
- [ ] Éditer une question conserve l'ULID de chaque option (ne jamais en régénérer un)
- [ ] Une question antérieure à `updated_at` affiche `created_at` en « dernière modification »
- [ ] Une question tirée par le scheduler voit sa « dernière modification » bouger
- [ ] Il n'y a **plus** d'action de suppression — sortir une question du pot, c'est la refuser

### Régression complète

Inchangée depuis la 1.0.1 — voir `release-notes-1.0.1.md` § « Régression complète » : onboarding et
question de démonstration, authentification et compte, question du jour et résultat, série /
calendrier / stats, potes, notifications, robustesse. Rien de ce que la 1.0.2 touche n'y ajoute de
case, sauf celles du delta ci-dessus.

- [ ] `npm run typecheck` et `npm run lint` verts (aucune CI sur ce dépôt)

---

## Mots-clés

### App Store — français, 100 caractères max, séparés par des virgules sans espace

```
question,jour,potes,amis,stat,statistique,sondage,quiz,vote,serie,streak,quotidien,matin,entre
```
94 caractères. Inchangés depuis la 1.0.0.

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

- [ ] **SHA-1 de la clé de signature Play enregistré dans Firebase** — sans lui, la connexion Google
      échoue (`DEVELOPER_ERROR`) sur **tout** build installé depuis Play, piste interne comprise.
      Les deux empreintes sont à enregistrer (clé de téléversement EAS *et* clé de signature Play),
      puis `google-services.json` re-téléchargé et re-poussé à EAS. Procédure complète dans
      `apps/app/firebase/README.md` § « Android SHA-1 ». **Nouveau bloquant nommé en 1.0.2.**
- [ ] **Signalement d'un utilisateur dans l'app** — guideline 1.2, `docs/production-checklist.md`
      §2.3. Aucune collection `v1_user_reports`, aucune action « Signaler ce pote ». Le contact
      éditeur de `/legal/assistance` couvre l'exigence « traitement sous 24 h », mais **pas** le
      mécanisme de signalement lui-même. **Le seul bloquant dur qui reste côté code.**
- [ ] Page web de demande de suppression de compte (exigée par Play, hors de l'app)
- [ ] URLs de confidentialité et de support renseignées dans App Store Connect **et** dans la Play
      Console ; URL des normes de sécurité des enfants (`/legal/protection-des-enfants`) renseignée
      dans la Play Console
- [ ] Compte de démonstration créé sur la production, avec des journées répondues et deux amis
      acceptés, puis renseigné dans les deux consoles
- [ ] Capability « Sign in with Apple » activée sur l'App ID `fr.quentinmachard.statowrel`
- [ ] Relecture juridique des cinq pages légales

### Acquis dans le code à cette version

- [x] **Mot de passe oublié** depuis l'écran de connexion *(nouveau en 1.0.2)*
- [x] **`DEVELOPER_ERROR` Android nommé** plutôt qu'avalé dans un « réessaie » *(nouveau en 1.0.2)*
- [x] **Pot de modération en table filtrable et triable**, verdicts par statut, colonne auteur, modal
      de refus portant son motif *(nouveau en 1.0.2)*
- [x] App sur React Native Firebase — SDK natifs, résolution CocoaPods sur iOS *(acquis en 1.0.1)*
- [x] Site racine = page de présentation, console sous `/admin/` *(acquis en 1.0.1)*
- [x] Portrait verrouillé sur iOS et Android *(acquis en 1.0.1)*
- [x] Rattrapage visible — les jours manqués du calendrier sont des boutons *(acquis en 1.0.1)*
- [x] Normes de sécurité des enfants (CSAE) publiées sur `/legal/protection-des-enfants`
      (+ alias `/legal/child-safety`) *(acquis en 1.0.0)*
- [x] Âge minimum 16 ans dans les CGU *(acquis en 1.0.0)*
- [x] Réponse de démonstration acceptée sur le seul statut `demo` *(acquis en 1.0.0)*
- [x] Politique de confidentialité et page d'assistance servies sous `/legal/`
- [x] Identité de l'éditeur complète — Quentin Machard SAS, RCS Laval 891 303 893
- [x] Permission de notification redemandable
- [x] Suppression de compte depuis l'app (`users-deleteAccount`)
- [x] Connexion avec Apple au même niveau que Google et l'e-mail
- [x] Aucun SDK d'analytics ni de publicité

### Déploiements que cette version exige

- [ ] `npm run deploy:functions:production` — `scheduleDailyQuestion` estampille `updated_at`
- [ ] `npm run deploy:admin:production` — sans lui, la table de modération n'est pas en ligne
- [ ] Firestore : **rien à déployer**, ni les règles ni les index n'ont bougé

### Infrastructure

- [ ] Projet Firebase de développement séparé de la production (`.firebaserc` pointe les deux alias
      sur `statowrel-app` — `docs/production-checklist.md` §3.1)
- [ ] `eas env:list --environment production` : aucun `EXPO_PUBLIC_FIREBASE_*` résiduel, et les
      fichiers `google-services.json` / `GoogleService-Info.plist` de production fournis à EAS —
      **re-poussés après l'ajout du SHA-1**
- [ ] `firebase functions:list` montre les deux schedulers et les deux triggers
- [ ] Alerte de budget et sauvegardes Firestore programmées
- [ ] Bloc `submit.production` d'`eas.json` rempli (iOS : `appleId`, `ascAppId`, `appleTeamId` ;
      Android : clé de compte de service, `track: internal`)
- [ ] Domaine tranché — `statowrel-app.web.app` ou un domaine propre (`docs/store-listing.md` §4)

### Contenu

- [ ] **Au moins 90 questions approuvées** dans le pot — un jour sans question casse la série de
      tout le monde. La nouvelle table rend le compte lisible : filtrer sur `approved`
- [ ] `npm run seed-daily-questions` passé sur la production
- [ ] `npm run seed-demo-question` passé sur la production — sans lui, le carrousel d'accueil ouvre
      sur une question introuvable
- [ ] Rôle admin accordé (`npm run set-admin -- <email> --production`)

### Visuels

- [ ] Captures 1 à 3 de `docs/store-listing.md` §3.1 aux deux formats iOS et au format Play
- [ ] Capture 4 : utiliser la variante de repli (« TA SÉRIE NE TIENT QU'À TOI. ») — la proposition
      de questions n'existe pas
- [ ] Bannière Play 1024×500
- [ ] Icônes 1024×1024 (iOS) et 512×512 (Play)

### Recette

- [ ] Delta de la 1.0.2 ci-dessus passé en entier
- [ ] Plan de test QA passé sur iOS **et** Android, sur appareil physique
- [ ] TestFlight interne : au moins une semaine d'usage quotidien réel
- [ ] Piste de test interne Play lancée en parallèle — **c'est le seul endroit où le bloquant SHA-1
      se vérifie**
