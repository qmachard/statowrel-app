# StatOwrel — PRD

Status: **draft initial**. Ce document décrit le produit visé, pas l'état du code. Cinq sections sont partiellement implémentées : le §4.1 (connexion Google / Apple / e-mail + mot de passe et création du profil), les §5.1–5.2 (l'écran Stats, branché sur Firestore), le §5.4 (la sheet question, dismissable au lieu d'être bloquante, mais qui bascule bien sur la carte après validation), le §4.3 (le double tap, complet), le §5.5 (le résultat d'une journée répondue — la phrase, la carte de récap et les réponses des amis du §4.5 — sans l'illustration de l'option ni le bouton de partage) et l'ajout d'ami par handle du §4.1 (la sheet d'invitation, sans la liste d'amis qui répond à l'invitation) — tout le reste est à faire, voir `docs/architecture.md` pour l'état technique réel.

## 1. Vision

StatOwrel est un réseau social entre amis, sans feed ni likes.

Chaque jour à 7h du matin, **une seule question** est posée à tout le monde en même temps, et la journée entière pour y répondre. Une question personnelle, absurde, que personne ne pense à poser. Tu réponds, et tu découvres deux choses :

1. **Ta StatOwrel** — ta réponse replacée dans la statistique globale : _« Comme 68% des utilisateurs, tu es un.e efficace. »_
2. **Les réponses de tes potes** — débloquées uniquement si tu as répondu toi-même.

Le produit tient en une boucle quotidienne de moins de 30 secondes.

### Exemples de questions

| Question | Options | StatOwrel associées |
|---|---|---|
| Caca : combien de temps ? | Moins de 2 min / Plus de 10 min | **efficace** / **résident.e** |
| Tes plantes ? | Je les arrose / Je les tue | **arroseur.euse** / **killer.euse** |
| Ton dentifrice, tu le presses… | Par le bout / Au milieu / Je l'écrase n'importe comment | **méthodique** / **sauvage** / **anarchiste** |
| Ta serviette après la douche ? | Sur le radiateur / Sur la porte / Par terre / Je n'en ai qu'une, partout | **rangé.e** / **pragmatique** / **libre** / **survivaliste** |

Chaque option porte sa propre StatOwrel : deux options pour une question binaire, jusqu'à six pour un QCM.

Le ton est central : WTF, intime mais pas gênant, jamais moralisateur. Une question réussie est une question qu'on a envie de screenshoter.

## 2. Utilisateurs

- **Le joueur** — 16-35 ans, déjà sur BeReal / Snap. Vient pour la vanne quotidienne et le classement implicite avec ses potes.
- **L'auteur** — le même joueur, mais qui propose ses propres questions et veut voir la sienne tirée au sort.
- **Le modérateur** — équipe StatOwrel, via un backoffice d'administration. Valide ou rejette les questions proposées.

## 3. Boucle produit

```
   Tous les jours à 07:00
            │
            ▼
   Notification push « La question du jour est tombée »
            │
            ▼
   Question + ses options ──► Double tap sur mon choix
            │                (tap = sélection, tap = validation)
            │                              │
            │                              ▼
            │                    Ma StatOwrel : « Comme x% des
            │                    utilisateurs, tu es un.e ... »
            │                              │
            │                              ▼
            │                    Les réponses de mes potes
            │                    (débloquées car j'ai répondu)
            ▼
   Je ne réponds pas avant minuit ──► Streak remis à zéro
                                       (jour rattrapable plus tard
                                        depuis le calendrier, sans
                                        récupérer le streak)
```

## 4. Fonctionnalités

### 4.1 Compte & amis

- Inscription et connexion via **Firebase Auth**, avec quatre méthodes proposées au même niveau :
  - **Email + mot de passe** (pas de vérification de l'adresse : elle ajoutait une étape avant même que l'app ait quoi que ce soit à montrer)
  - **Google**
  - **Facebook**
  - **Apple** (obligatoire sur iOS dès qu'un autre provider social est proposé — règle App Store)
- Après la première connexion, quel que soit le provider : choix du **nom d'utilisateur** et d'un **avatar**, sur une **bottom sheet bloquante** posée par-dessus l'app — même vocabulaire visuel que la sheet question (§5.4), mais sans poignée ni fond cliquable : on n'entre pas dans l'app sans nom. Le nom d'utilisateur n'est jamais pré-rempli — ni depuis Google ou Apple, ni depuis l'adresse e-mail : il n'appartient qu'à l'utilisateur. L'avatar, lui, est repris du provider quand il en fournit un.
- Le nom d'utilisateur est un **handle à la Instagram** : minuscules, lettres, chiffres, point et tiret bas, 3 à 20 caractères, commençant et finissant par une lettre ou un chiffre. Il est **unique** dans toute l'app — une collection de réservation `v1_usernames` porte cette unicité, le document ayant le handle pour identifiant. Il s'affiche précédé d'un `@` partout où il désigne quelqu'un.
- Un même email ne crée qu'un seul compte : si un utilisateur inscrit par email se connecte ensuite via Google avec la même adresse, les identités sont **liées** au même compte (`linkWithCredential`), pas dupliquées.
- Suppression de compte disponible dans les réglages (exigée par les stores) : supprime le profil, les amitiés et anonymise les réponses passées (elles restent dans les compteurs agrégés).
- **Pas de recherche publique d'utilisateurs**, mais un handle se résout : on ajoute un ami par lien d'invitation, par code à 6 caractères, ou en tapant son **nom d'utilisateur exact**. Il n'y a ni recherche approchante, ni annuaire, ni suggestion — connaître le handle reste le prix d'entrée.
- Une invitation acceptée crée une amitié **réciproque** (pas de follow asymétrique).
- On peut retirer un ami ; l'amitié disparaît des deux côtés.

**Règle :** un utilisateur ne voit jamais que les réponses de ses amis. Il n'y a aucun contenu public.

**État d'implémentation.** Les trois méthodes de connexion Google, Apple et e-mail + mot de passe sont en place, et le profil `v1_users/{uid}` est créé à la validation de la sheet de choix du nom d'utilisateur — tant qu'il n'a pas été choisi, l'app n'est pas accessible. Le handle est unique, garanti par la réservation `v1_usernames`. Restent à faire, dans l'ordre où le produit en aura besoin :

- **Facebook** — décrit ci-dessus, pas encore branché.
- **Liaison d'identités** (`linkWithCredential`) — un même e-mail arrivant par deux providers crée aujourd'hui deux comptes distincts ; l'app affiche un message expliquant quelle méthode utiliser au lieu de lier.
- **Choix de l'avatar** — la sheet d'onboarding ne demande que le nom d'utilisateur, et il n'y a toujours aucun moyen d'en changer. En revanche personne n'est plus sans visage : à défaut de photo de provider, l'avatar est un patchwork DiceBear **généré à partir du handle** — déterministe, aux couleurs de l'app, jamais stocké — avec les initiales en dernier recours hors ligne.
- **Changement de nom d'utilisateur** — impossible aujourd'hui : libérer une réservation demande un passage côté backend. Ce passage existe désormais — `users-deleteAccount` libère la sienne en partant — mais renommer demande son propre callable : il faut libérer l'ancienne réservation, en prendre une nouvelle et rattraper les copies `friend_username` portées par les deux moitiés de chaque amitié.
- **Ajout d'ami par handle** — fait : le bouton « Inviter un pote » de l'en-tête Stats (§5.1) ouvre une sheet où l'on tape le nom d'utilisateur exact du pote. Elle appelle le callable `friends-inviteFriend`, qui résout le handle contre `v1_usernames` et écrit les deux moitiés de l'amitié en `pending` ; un handle inconnu répond « Utilisateur introuvable. » sous le champ. La **liste d'amis** de §5.3 est en place sur le Menu (§5.1) : elle lit `v1_user_friends` et montre les amitiés acceptées, les invitations reçues et les invitations envoyées, avec le bouton « Inviter un pote » en tête. **Répondre** à une invitation est en place aussi : accepter passe les deux moitiés en `accepted`, refuser, annuler et retirer les suppriment toutes les deux — écrit par l'app, sous les règles Firestore, sans callable puisqu'il n'y a rien à résoudre. L'invité est **notifié** : le trigger `friends-onFriendCreated` pousse « Nouvelle invitation » / « @handle veut devenir ton pote. » sur ses appareils, sur son propre canal Android, et le tap ouvre le Menu où l'invitation attend déjà. Restent à faire : le **lien d'invitation** et le **code à 6 caractères**.
- **Suppression de compte** — faite : le bouton `ghost` « Supprimer mon compte » du Menu (§5.3), derrière une confirmation native, appelle le callable `users-deleteAccount`. Un callable et rien d'autre : `firestore.rules` interdit à tout client de supprimer un profil, une réservation de pseudo ou une réponse, et libérer un handle comme retirer la moitié miroir d'une amitié *chez l'autre* sont des écritures qu'aucune règle ne saurait cadrer. Partent, dans cet ordre : les réponses, les mois de calendrier, les tokens push de l'appareil — une sous-collection survit à la suppression de son parent, sans quoi la question du jour continuerait d'être poussée vers un téléphone dont le compte n'existe plus —, les deux moitiés de chaque amitié, la réservation de pseudo — le handle redevient libre —, le profil, puis le compte Auth. Les `answer_counts` des questions ne sont pas décrémentés : c'est exactement ce que demande la ligne plus haut, les réponses cessent d'appartenir à quelqu'un et continuent de compter dans l'agrégat. L'identifiant du document *est* l'UID de son auteur, donc c'est la suppression qui anonymise — il n'y a pas de champ à blanchir.

### 4.2 Question du jour

- **Une** question par jour, la même pour tous les utilisateurs.
- Publication **tous les jours à 07:00** (fuseau de l'utilisateur, v1 : Europe/Paris pour tout le monde) — même heure pour tout le monde, tous les jours.
- Push notification à la publication.
- Format v1 : **choix unique parmi N options** — de **2 à 6** options selon la question. Une question peut donc être binaire (« moins de 2 min / plus de 10 min ») ou à choix multiple (« par le bout / au milieu / je l'écrase »).
- L'utilisateur ne choisit **qu'une seule** option, quel que soit le nombre proposé. Pas de réponses multiples, pas de texte libre, pas de photo.
- L'ordre des options est **fixe** (celui défini à la création), identique pour tous — c'est ce qui rend les captures d'écran comparables entre potes.
- La question **ferme à minuit** : passé ce délai elle ne compte plus pour le streak (§4.6) et n'est plus poussée en modale bloquante.
- Une journée manquée reste **rattrapable** depuis le calendrier de l'écran Stats (§5.2) : on peut répondre après coup pour compléter sa collection de cartes et voir les réponses de ses amis. Le rattrapage **ne restaure jamais le streak** — le streak récompense la régularité, la carte récompense la collection.
- Le rattrapage n'est **pas borné par la date d'inscription** : un utilisateur qui arrive aujourd'hui voit l'intégralité des questions déjà posées et peut y répondre. L'archive appartient aux questions, pas au compte — c'est ce qui donne à un nouvel arrivant une collection à construire dès le premier jour, sans jamais lui offrir de streak rétroactif.
- Une réponse de rattrapage compte dans les compteurs agrégés (`answer_counts`) au même titre qu'une réponse à l'heure ; elle est marquée `late: true` pour pouvoir distinguer les deux plus tard.
- Réponse **définitive** : pas de modification après validation (c'est ce qui rend la stat crédible).

**État d'implémentation (notification).** Le backend envoie réellement le push de 07:00 : la tâche `dailyQuestions-notifyDailyQuestion` lit tous les jetons enregistrés, poste à Expo par lots de 100 et supprime au passage ceux que l'appareil a révoqués. Le titre est celui du §3 — « La question du jour est tombée » — et le corps est la question elle-même. Il ne part encore chez personne : l'app ne demande pas la permission et n'enregistre aucun jeton, ce qui est la tranche suivante. Le reste du §4.2 est en place hors la **fermeture à minuit**, qui n'a toujours pas son planificateur.

### 4.3 Le double tap

La micro-interaction signature de l'app : **répondre se fait en deux taps sur la même option**.

1. **Premier tap** — l'option est *sélectionnée*. Elle se soulève (ombre portée nette, style neobrutalism), les autres options s'estompent. Retour haptique **léger** (`ImpactFeedbackStyle.Light`).
2. **Deuxième tap sur la même option** — la réponse est *validée* et envoyée. L'option s'enfonce, puis l'écran bascule sur la StatOwrel. Retour haptique **franc et satisfaisant** (`ImpactFeedbackStyle.Heavy`, suivi de `NotificationFeedbackType.Success`).

Règles :

- Taper une **autre** option pendant l'état sélectionné déplace simplement la sélection (haptique léger de nouveau) — on ne valide jamais par erreur en changeant d'avis.
- Il n'y a **aucun bouton « Valider »**. Le deuxième tap *est* le bouton. Le libellé de l'option affiche « Tape encore pour valider » en micro-texte tant qu'elle est sélectionnée.
- Le deuxième tap n'est accepté qu'après un court délai (~150 ms) pour éviter qu'un double tap involontaire ne verrouille une réponse. La réponse étant définitive (§4.2), ce garde-fou est essentiel.
- L'état sélectionné n'expire pas : on peut rester dessus aussi longtemps qu'on veut avant de valider.
- Si l'haptique est désactivé au niveau système, la validation reste possible — le retour est alors purement visuel.

Le double tap est ce qui rend l'app satisfaisante à utiliser tous les jours. Il doit être soigné avant tout le reste de l'UI.

### 4.4 StatOwrel

Immédiatement après avoir répondu :

> **Comme 68% des utilisateurs, tu es un.e efficace.**

- Le pourcentage porte sur **tous** les utilisateurs ayant répondu à cette question, pas seulement les amis.
- Compteurs agrégés maintenus en temps réel côté backend (trigger Firestore à chaque réponse), pas de calcul à la lecture.
- Écran partageable (image générée) — le principal levier d'acquisition.

### 4.5 Réponses des amis

- Accessibles **uniquement** après avoir répondu soi-même (mécanique BeReal).
- Liste des amis : avatar, nom d'utilisateur, la StatOwrel que leur réponse leur vaut, heure de réponse.
- Les amis qui n'ont pas encore répondu apparaissent en attente (« n'a pas encore répondu »), sans notion de retard ou de temps de réaction en v1.
- **Relance push à 18h** : « x de tes potes ont répondu à la question du jour. Et toi ? », pour qui n'a pas encore répondu.

**État d'implémentation (relance de 18h).** Elle part vraiment, sur le même chemin que le tir de 07:00 : `dailyQuestions-scheduleFriendsAnswersReminder` résout la question du jour dans son mois et met en file `dailyQuestions-notifyFriendsAnswers`, qui compte et envoie. Le compte est parcouru depuis **ceux qui ont répondu** — une amitié est écrite des deux côtés, donc lire les amis des répondants donne d'un coup tous ceux qui ont un nombre à recevoir, et ce nombre. Tout le monde est relancé sauf les répondants, avec ou sans potes : « Un de tes potes a répondu… » au singulier, « 4 de tes potes ont répondu… » au-delà, et « Ne perds pas ta série : tu as jusqu'à minuit pour répondre. » quand aucun pote n'a encore répondu — « 0 de tes potes » se lit comme un bug. Le tap ouvre le jour, exactement comme celui de 07:00 : même canal, même charge utile, donc l'app n'a rien eu à apprendre.

**État d'implémentation.** La liste existe, sous la carte de récap du §5.5 : avatar, `@handle`, leur StatOwrel (le `stat_label` de l'option choisie, pas son libellé) en puce et l'heure, ceux qui ont répondu comme moi en tête, ceux qui n'ont pas encore répondu en fin de liste. C'est la ligne de la liste d'amis du §5.3, à l'identique — même avatar DiceBear semé sur le handle, même carte découpée par des séparateurs — pour qu'un pote se reconnaisse du même coup d'œil où qu'il apparaisse. Seules les amitiés `accepted` y figurent, et aucune réponse n'est lue tant qu'on n'a pas répondu soi-même — c'est la mécanique, pas une optimisation. Sans aucun pote, la section se réduit à une ligne sur la sheet, sans carte.

### 4.6 Streak

- +1 à chaque journée où l'on a répondu avant minuit.
- **0** dès qu'une journée est manquée. Pas de joker : répondre en retard depuis le calendrier (§4.2) complète la journée dans le calendrier et débloque la carte, mais ne rallume pas le streak cassé.
- Streak visible sur son profil et à côté de son nom dans la liste des amis.
- Rappel push à 21h si la question du jour n'a pas été répondue et que le streak est en cours.
  **Pas encore fait** — mais la relance de 18h (§4.5) couvre déjà l'essentiel : elle part à qui n'a pas répondu, et son message de repli est justement la série. Celui de 21h est le second coup, à trancher avec la question du §9 (« utile ou harcèlement ? ») et avec les réglages de notifications du §5.3, qui n'existent pas non plus.


### 4.7 Proposition de questions

- N'importe quel utilisateur peut proposer une question : intitulé + **2 à 6** options, chacune avec son « tu es un.e ... ».
- La question part en file de modération (statut `pending`).
- Le modérateur valide, édite ou rejette depuis le backoffice d'administration. Une raison de rejet est renvoyée à l'auteur.
- Une question validée rejoint le **pot commun** et devient éligible au tirage au sort.
- L'auteur est notifié quand sa question est validée, puis quand elle est effectivement tirée. Son nom d'utilisateur est crédité sur l'écran de la question.
- Une question déjà tirée ne peut pas ressortir (v1 : jamais de rediffusion).

## 5. Navigation & écrans

L'app est en **neobrutalisme** : aplats de couleur francs, bordures noires épaisses, ombres portées dures et décalées (jamais de flou), coins franchement arrondis (`sm` = 8px sur les boutons, `DEFAULT` = 12px, jusqu'à 32px — jamais carrés), titres en `font-head` (Archivo Black) et textes en `font-sans` (Space Grotesk). Tous les tokens (palette, rayons, ombres, typo, bordures, espacements) sont déjà dans `apps/app/src/design/tokens.ts` — aucun écran ne définit sa propre palette.

Toute l'app tient en **un écran, une modale et une carte**, plus le Menu qui s'ouvre par-dessus. Il n'y a ni barre d'onglets ni troisième niveau de navigation.

### 5.1 Racine de l'app

Pas de tabbar. L'écran **Stats** (§5.2) *est* l'app : il s'ouvre au lancement, et rien ne se pose à côté de lui. Ce qui n'y tient pas s'ouvre **par-dessus**, depuis les deux boutons-icônes de son en-tête, en haut à droite :

| Bouton | Ouvre |
|---|---|
| **Inviter un pote** | La sheet d'invitation par nom d'utilisateur (§4.1) — le lien d'invitation et le code à 6 caractères s'y ajouteront |
| **Menu** | Le Menu — identité et profil (§5.3), amis, questions proposées, réglages |

- Les deux boutons sont carrés, bordure noire épaisse, ombre dure décalée. Le bouton d'invitation est plein `primary`, celui du menu sur fond `card` : inviter est l'action qu'on veut voir en premier.
- Le Menu se pose **en pile** au-dessus de Stats et porte son propre bouton retour. On n'y navigue jamais latéralement : on l'ouvre, on le referme.
- Pas de badge numérique ; l'état « question du jour non répondue » se signale par la modale (§5.4), pas par une pastille.

### 5.2 Écran Stats

La racine de l'app. De haut en bas :

**1. En-tête.** La date du jour en micro-texte et la salutation (« Salut Lou ») en `font-head`, à gauche ; à droite les deux boutons-icônes de §5.1.

**2. Invitations reçues.** Tant qu'une invitation attend une réponse, elle est reprise en haut de l'écran Stats : une carte par invitation, sans titre au-dessus — une invitation dit d'elle-même ce qu'elle est — avec « Accepter » et « Refuser » sous la mention. À plusieurs, les cartes tiennent sur une ligne à défilement horizontal, comme la ligne de stats plus bas : l'écran n'y perd que la hauteur d'une carte. Sans invitation en attente, rien ne s'affiche.

**3. Bandeau question du jour.** Tant que la question du jour est ouverte et sans réponse, un bandeau `accent` pleine largeur — bordure noire, ombre dure, texte blanc — annonce son intitulé, précédé d'un pictogramme de bulle interrogative, et ouvre la modale question (§5.4). C'est le même token `accent` que la case d'aujourd'hui dans le calendrier : la journée en cours porte une seule couleur. Une fois la journée répondue, le bandeau ne disparaît pas : il bascule en `primary` — le jaune que la case du jour vient elle-même de prendre —, un check et « Prochaine question à 7h » au-dessus de « RDV demain », et il ouvre le résultat de la journée (§5.5). Il ne s'efface que les jours où aucune question n'est tombée.

**4. Ligne de stats.** Le streak et ses compteurs tiennent sur **une seule ligne**, à défilement horizontal, débordant jusqu'aux deux bords de l'écran. En tête, la carte streak, large de 70% de l'écran — ce qui dépasse est l'amorce de la tuile suivante, et c'est elle qui dit que la ligne défile : `primary` bordée, la même ombre dure que les tuiles qui la suivent, le libellé puis le nombre de jours en `font-head` et « jours d'affilée » à gauche, un grand pictogramme de flamme à droite. Quand le streak est à 0, elle passe en `muted` avec « Réponds aujourd'hui pour repartir ». Suivent deux tuiles `card` plus étroites, bordure noire, ombre dure : le meilleur streak jamais atteint (`streak_best`) et le nombre total de jours répondus depuis l'inscription. Les trois chiffres sont sur la même échelle typographique — le streak tient sa place par sa surface, sa couleur et sa largeur, pas par la taille de son chiffre — et la ligne rend sa hauteur au calendrier.

**5. Calendrier mensuel.** Une grille de cases carrées, une par jour, bordure noire, coins arrondis (`rounded`), séparées par une gouttière régulière. Quatre états :

| État | Rendu | Tap |
|---|---|---|
| **Répondu** | Case `primary`, ombre dure, un **check** central à la place du numéro du jour | Ouvre le résultat StatOwrel de ce jour (§5.5), en lecture seule |
| **Raté** (jour passé sans réponse) | Case `background` hachurée, bordure noire, petit « ? » central | Ouvre la modale question de ce jour en **rattrapage** (§5.4) |
| **Aujourd'hui** | Case `accent` — le même traitement qu'un jour répondu, bordure, ombre dure et check compris une fois la journée jouée : seule la couleur change. Aujourd'hui reste `accent` quoi qu'il arrive, répondu ou non — c'est le jour dont l'écran parle, et le voir virer au jaune comme les autres le dissolvait dans le mois | Ouvre la modale question du jour (§5.4), ou le résultat StatOwrel (§5.5) une fois répondu |
| **Futur, ou sans question** | Case `muted`, sans bordure | Inerte |

- Navigation mois par mois (chevrons gauche/droite), bornée au **premier mois où une question a été diffusée** d'un côté et au mois courant de l'autre. La borne basse est la même pour tout le monde : les jours antérieurs à l'inscription sont des jours ratés comme les autres, rattrapables en mode late (§4.2).
- Le calendrier **est** l'historique : c'est le seul endroit où l'on retrouve les questions passées et ses propres cartes.
- Un jour sans question diffusée (avant le lancement, ou incident de publication) est rendu comme « futur » : inerte, non rattrapable.

### 5.3 Écran Profil

- **En-tête carte** : avatar (cadre noir épais, ombre dure), `@handle` en `font-head`, streak courant et meilleur streak.
- **Mes amis** : liste avatar + `@handle` + streak, avec l'action « Retirer ». En tête de liste, un bouton plein `primary` « Inviter un pote » (partage du lien + code à 6 caractères, §4.1). Si la liste est vide, l'état vide occupe la place de la liste : « Sans potes, StatOwrel c'est juste des chiffres. »
  **Implémenté**, à deux écarts près : le **streak** n'est pas affiché — il n'est pas recopié sur l'amitié, et une valeur qui bouge tous les jours serait périmée à l'affichage ; et les **invitations en attente** sont des lignes de cette même liste, placées en tête, parce que les deux moitiés d'une amitié existent dès l'envoi — les cacher perdrait l'invitation reçue. La liste est une carte découpée en lignes par des séparateurs, le bouton d'invitation est une icône posée à côté du titre, une invitation porte ses deux réponses en boutons **sous** la mention « T’a envoyé une invitation. » — « Accepter » et « Refuser » sur une invitation reçue, « Annuler » sur une invitation envoyée — la réponse sous ce qu’elle répond ; les invitations reçues sont reprises en tête de l’écran Stats (§5.2). Le menu de la ligne, lui, ne reste que sur les amitiés acceptées, en `ghost` : « Retirer ce pote » y est la seule action, et rien n’y attend de réponse.
- **Mes questions** : proposer une question (§4.7) et suivre le statut de celles déjà envoyées (`en attente` / `validée` / `rejetée` + raison / `tirée le JJ/MM`).
- **Réglages** : notifications, déconnexion, suppression de compte.
  **Partiellement implémenté.** Le bas de l'écran est un bloc : « Se déconnecter » en `secondary`, « Supprimer mon compte » en `ghost` sous elle — la suppression est définitive, donc elle est demandée deux fois, par l'alerte native que les deux systèmes ont appris à faire lire —, et sous les deux, en petit et en gris, les liens vers les **CGU** et les **mentions légales** (pages statiques servies par le même site Hosting que la console, `apps/admin/public/legal/`). Les réglages de **notifications** restent à faire.

### 5.4 Modale question (bottom sheet)

La question ne vit **jamais** dans un écran à elle : c'est toujours une **bottom sheet** posée par-dessus l'écran Stats.

- **Question du jour non répondue** → la sheet s'ouvre **automatiquement** au lancement de l'app (ou à l'ouverture de la notification) et **reste ouverte tant qu'on n'a pas répondu** : pas de poignée de fermeture, pas de tap sur le fond, retour Android intercepté. On ne peut pas consulter l'app en évitant la question. Hauteur pleine, coins supérieurs arrondis (`rounded`), bordure haute noire épaisse, ombre dure vers le haut.
- **Rattrapage depuis le calendrier** → même sheet, mais **fermable** (poignée + tap sur le fond) : on a le droit de regarder une vieille question et de repartir sans répondre.

Contenu, de haut en bas :

1. La **date** en micro-texte (« Aujourd'hui » ou « Mardi 12 août »).
2. Le **titre de la question**, très gros, en `font-head`, cadré à gauche sur 2 à 4 lignes — c'est l'élément dominant de l'écran, façon carton de quizz.
3. Les **options**, empilées verticalement, une par ligne, pleine largeur : carte `card`, bordure noire, ombre dure, label en `font-sans` gras. De 2 à 6 selon la question, dans leur ordre fixe (§4.2). Au-delà de 4 options, la liste défile — le titre reste épinglé en haut.
4. Le **crédit auteur** en bas (« proposée par @handle ») quand la question vient d'un utilisateur.

L'interaction est le **double tap** décrit en §4.3 : premier tap = sélection (l'option se soulève, les autres s'estompent), deuxième tap = validation. Après validation, la sheet ne se ferme pas : son contenu **bascule** sur le résultat (§5.5), sans changement d'écran ni retour au calendrier.

### 5.5 Écran résultat — la StatOwrel

L'écran de récompense. **La phrase est la récompense** : elle se lit à plat sur la sheet, pas dans un cadre. Le cadre à codes « carte Pokémon » a été essayé et retiré — encadrée, la phrase se battait avec la récap sous elle au lieu de la porter.

Anatomie, dans l'ordre vertical :

| Zone | Contenu | Traitement |
|---|---|---|
| **Ligne du jour** | La date en micro-texte à gauche, la mention de rareté à droite quand il y en a une | À même la sheet, au-dessus de la phrase |
| **Phrase** | « Comme **10%** des gens, tu es un.e » puis le `stat_label` en très gros (« Bordélique ») | À même la sheet : le pourcentage dans la phrase, la StatOwrel sur sa propre ligne, dans le plus gros corps de l'app |
| **Illustration** | Encart carré bordé : l'emoji/visuel de l'option choisie sur aplat de couleur | Sous la phrase |
| **Carte de récap** | La question du jour, puis **chaque option avec son pourcentage** — son libellé, pas sa StatOwrel : la récap rappelle ce qui a été répondu —, la sienne en `primary` derrière un tick | La seule surface encadrée de l'écran : bordure noire, ombre dure, remplissage proportionnel derrière chaque libellé |
| **Amis** | Les réponses des amis (§4.5) | Sous la récap, hors cadre |
| **Pied** | Nom d'utilisateur de l'auteur de la question | Ligne de crédit centrée, en bas de la sheet |

- **Rareté.** Plus l'option choisie est minoritaire, plus le résultat est rare : au-delà de 25% il est `common` et ne dit rien, sous 25% il passe `rare` (mention dorée), sous 10% `ultra rare` (mention violette, fond holographique animé au tilt de l'appareil). C'est ce qui rend intéressant de répondre honnêtement plutôt que comme tout le monde. La rareté est calculée à l'affichage depuis `answer_counts`, elle n'est pas figée : elle bouge tant que les réponses arrivent, et se stabilise à la clôture.
- **Bouton « Partager »** sous la récap : génère l'image du résultat seul (sans les amis) — §4.4.
- **Les amis, sous la récap** (§4.5) : hors du cadre, en liste simple — avatar, `@handle`, leur StatOwrel et l'heure. Les amis qui ont répondu comme moi ouvrent la liste, les autres suivent, les non-répondants la ferment en `muted` — l'ordre et la puce jaune disent « comme toi » sans qu'un intitulé ait à le faire.
- Ce résultat est **rejouable à volonté** : tap sur un jour répondu dans le calendrier (§5.2) le rouvre à l'identique, avec les stats à jour et les réponses des amis arrivées depuis.

**État d'implémentation.** Le résultat existe et remplace le contenu de la sheet dès que la réponse est écrite : la ligne du jour, la phrase « Comme x% des gens, tu es un.e … » suivie du `stat_label` en très gros, la carte de récap (question + une ligne par option, la sienne en jaune derrière son tick) et les réponses des amis dessous. La rareté est calculée à l'affichage depuis `answer_counts`, en trois paliers (`commune` sans mention, `rare` doré, `ultra rare` violet) et se lit désormais comme une mention à côté de la date, le cadre qui la portait n'existant plus. Un jour déjà répondu, rouvert depuis le calendrier, ouvre directement le résultat au lieu de la question. Restent à faire : l'**encart illustration** (le modèle d'option ne porte ni emoji ni visuel), le **numéro d'édition** « #142 » (rien ne compte les jours depuis le lancement), le **bouton Partager** et son image générée (§4.4), l'**avatar** des amis (§4.5) et le **fond holographique animé au tilt** de l'ultra rare.

### 5.6 Ce qui n'existe pas

Pas de feed, pas de tabbar, pas d'onglet « amis » séparé, pas d'écran de recherche, pas de menu latéral, pas de réglages sur l'écran Stats. Un écran racine, deux boutons-icônes, une modale, une carte.

## 6. Modèle de données (esquisse)

Conventions : collections préfixées `v1_`, champs en `snake_case`, champs optionnels toujours à `null`, timestamps en `UniversalTimestamp`. Voir `CLAUDE.md`.

| Collection | Contenu |
|---|---|
| `v1_users` | `username`, `photo_url`, `created_at`, `updated_at`, `email`, `auth_providers[]` (`password` / `google.com` / `facebook.com` / `apple.com`), `streak_count`, `streak_best` (meilleur streak, §5.3), `streak_last_answered_on`, `invite_code` |
| `v1_usernames` | une par nom d'utilisateur pris, **id de document = le handle lui-même** : `user_id`, `created_at`. C'est cette collection qui porte l'unicité (§4.1) et qui résout un `@handle` vers un compte |
| `v1_users/{id}/v1_user_friends` | une entrée par ami, **id de document = l'UID de l'ami** (rend « au plus une amitié par paire » structurel) : `user_id`, `friend_id`, `friend_username` (recopié de `v1_users`, pour qu'une liste d'amis ne coûte pas une lecture de profil par ligne), `status` (`pending` / `accepted`), `requested_by`, `created_at`, `accepted_at`. Écrite **des deux côtés dès l'invitation**, pas seulement à l'acceptation : c'est ce qui met l'invitation en attente dans la liste de l'invité sans requête de groupe. `requested_by` porte le sens de la relation et vaut la même chose des deux côtés, donc les deux miroirs ne peuvent pas se contredire. Un refus, une annulation et un retrait sont la même suppression, des deux moitiés |
| `v1_questions` | le pot de modération **et** le journal de diffusion : `label`, `options` (**tableau ordonné** de `{ id: ULID, label, stat_label }`), `status` (`pending` / `approved` / `rejected` / `used`), `author_id`, `rejection_reason`, `broadcast_at` (instant de diffusion, `null` tant que non tirée), `broadcast_on` (jour Paris `AAAA-MM-JJ` correspondant), `closes_at` (minuit à Paris), `answer_counts` (map `option_id` → total ; pas de total scalaire, il se somme depuis la map) |
| `v1_questions/{id}/v1_daily_question_answers` | une par utilisateur, **id de document = UID de l'auteur** (rend « une réponse par personne et par jour » structurel) : `user_id`, `question_id` (recopié du parent), `date` (le `broadcast_on` du parent), `option_id`, `answered_at`, `late` (réponse de rattrapage, §4.2) |

**Il n'y a pas de document « question du jour ».** Une question tirée *est* le jour : elle porte son heure de diffusion, sa clôture, le décompte des réponses, et les réponses en sous-collection. Ce qui relie un jour du calendrier à sa question, c'est l'index mensuel `v1_daily_question_months` (§5.2) — une lecture par mois plutôt qu'un document par jour — et `broadcast_on` est le pointeur inverse. Il fait doublon avec `broadcast_at` à dessein : rien de ce qui lit ce document ne sait transformer un timestamp en jour Paris, `firestore.rules` en premier, et ce sont les règles qui épinglent le `date` d'une réponse au jour réellement diffusé.

Le calendrier de l'écran Stats (§5.2) lit un mois de réponses **de l'utilisateur courant** : grâce au `date` recopié dans la réponse, c'est une seule requête de groupe de collections sur `v1_daily_question_answers` filtrée par `user_id` et `date`, sans jointure. L'index composite correspondant (`v1_daily_question_answers`, `user_id ASC, date ASC`, portée groupe de collections) existe désormais dans `packages/firestore-config`. Le nom de la sous-collection garde le préfixe `v1_` et reste globalement unique : un groupe de collections est global à la base et ne connaît que le dernier segment du chemin, un simple `answers` entrerait donc en collision avec toute autre sous-collection du même nom.

### Les options d'une question

`options` est un **tableau ordonné**, où chaque option porte son propre **ULID** :

```json
{
  "label": "Ton dentifrice, tu le presses…",
  "options": [
    { "id": "01JBQZ8K3M4N5P6Q7R8S9T0V1W", "label": "Par le bout", "stat_label": "méthodique" },
    { "id": "01JBQZ8K3M4N5P6Q7R8S9T0V2X", "label": "Au milieu",   "stat_label": "sauvage" },
    { "id": "01JBQZ8K3M4N5P6Q7R8S9T0V3Y", "label": "Je l'écrase", "stat_label": "anarchiste" }
  ]
}
```

L'ordre du tableau **est** l'ordre d'affichage — le même pour tous les utilisateurs, c'est ce qui rend les captures d'écran comparables entre potes.

Pourquoi un `id` explicite plutôt qu'un simple index :

- **Identité stable.** Une réponse pointe sur un `option_id`, jamais sur une position. Un modérateur peut réordonner ou reformuler une option sans invalider les réponses déjà enregistrées ni fausser les compteurs.
- **ULID plutôt qu'UUID** : triable lexicographiquement par date de création, plus court, lisible dans le backoffice. Les ids de documents suivent la même convention.

Les ULID sont **générés côté client** (app ou backoffice) au moment de la saisie de la question — c'est justement l'intérêt du format : pas d'aller-retour serveur pour obtenir un identifiant. Un ULID d'option n'est jamais réutilisé, et supprimer une option d'une question déjà diffusée est interdit — on rejette la question et on en crée une nouvelle.

`answer_counts`, lui, **reste une map** indexée par `option_id` : il s'incrémente par `FieldValue.increment()` sur `answer_counts.{option_id}`, un chemin fixe. Avec un tableau, incrémenter `answer_counts[2]` demanderait de réécrire tout le tableau, et deux réponses simultanées s'écraseraient. `options` n'a pas ce problème : seul un modérateur l'écrit, jamais deux à la fois.

**Backend :**

- Un scheduler quotidien tire la question du lendemain et son heure de publication, puis programme la publication (Cloud Tasks).
- Un trigger sur création de réponse incrémente `answer_counts.{option_id}` (`FieldValue.increment(1)`) et met à jour le streak de l'auteur.
- Un scheduler à minuit clôture la journée et remet à zéro les streaks des utilisateurs sans réponse.

## 7. Hors périmètre (v1)

- Feed, likes, commentaires, messagerie.
- Questions à texte libre, à photo, à réponses multiples (cocher plusieurs options), ou à plus de 6 options.
- Groupes / cercles d'amis multiples.
- Statistiques agrégées de ses propres réponses dans le temps (l'historique jour par jour existe, lui, via le calendrier — §5.2).
- Classements, badges, monétisation.
- Multi-fuseau horaire (tout le monde sur Europe/Paris).

## 8. Indicateurs de succès

| Indicateur | Cible |
|---|---|
| Taux de réponse quotidien (DAU / utilisateurs actifs) | > 60% |
| Streak médian à J+30 | > 7 jours |
| Amis médians par utilisateur | > 5 |
| Questions proposées / 100 utilisateurs / semaine | > 10 |
| Partages de StatOwrel / réponse | > 5% |

## 9. Questions ouvertes

- Que se passe-t-il quand le pot commun de questions validées est vide ? (Réserve rédigée en interne, ou rediffusion d'une ancienne question ?)
- Doit-on afficher la StatOwrel restreinte à ses amis en plus de la stat globale ?
- Le rappel de 21h est-il perçu comme utile ou comme du harcèlement ? À tester.
- Faut-il une modération automatique (LLM) en amont de la modération humaine pour absorber le volume ?
- Le rattrapage illimité (§4.2) dévalue-t-il la réponse à l'heure ? Faut-il le borner (7 derniers jours ?) ou marquer visuellement les cartes obtenues en retard ?
- La rareté de la carte (§5.5) bouge tant que les réponses arrivent : faut-il la figer à la clôture de minuit pour que la carte partagée reste vraie ?
