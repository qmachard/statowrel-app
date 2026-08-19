# StatOwrel — PRD

Status: **draft initial**. Ce document décrit le produit visé. Aucune fonctionnalité décrite ici n'est encore implémentée — voir `docs/architecture.md` pour l'état technique réel.

## 1. Vision

StatOwrel est un réseau social entre amis, sans feed ni likes.

Chaque jour, à une heure aléatoire entre 8h et 20h, **une seule question** est posée à tout le monde en même temps. Une question personnelle, absurde, que personne ne pense à poser. Tu réponds, et tu découvres deux choses :

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
- **Le modérateur** — équipe StatOwrel, via le backoffice FireCMS. Valide ou rejette les questions proposées.

## 3. Boucle produit

```
   Heure aléatoire (8h–20h)
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
  - **Email + mot de passe** (email vérifié obligatoire avant d'accéder à l'app)
  - **Google**
  - **Facebook**
  - **Apple** (obligatoire sur iOS dès qu'un autre provider social est proposé — règle App Store)
- Après la première connexion, quel que soit le provider : choix du **pseudo** (unique) et d'un **avatar**. Le pseudo et l'avatar sont pré-remplis depuis le provider quand il les fournit.
- Un même email ne crée qu'un seul compte : si un utilisateur inscrit par email se connecte ensuite via Google avec la même adresse, les identités sont **liées** au même compte (`linkWithCredential`), pas dupliquées.
- Suppression de compte disponible dans les réglages (exigée par les stores) : supprime le profil, les amitiés et anonymise les réponses passées (elles restent dans les compteurs agrégés).
- **Pas de recherche publique d'utilisateurs.** On ajoute un ami par lien d'invitation ou par code à 6 caractères.
- Une invitation acceptée crée une amitié **réciproque** (pas de follow asymétrique).
- On peut retirer un ami ; l'amitié disparaît des deux côtés.

**Règle :** un utilisateur ne voit jamais que les réponses de ses amis. Il n'y a aucun contenu public.

### 4.2 Question du jour

- **Une** question par jour, la même pour tous les utilisateurs.
- Heure de publication tirée au hasard chaque jour entre **08:00 et 20:00** (fuseau de l'utilisateur, v1 : Europe/Paris pour tout le monde).
- Push notification à la publication.
- Format v1 : **choix unique parmi N options** — de **2 à 6** options selon la question. Une question peut donc être binaire (« moins de 2 min / plus de 10 min ») ou à choix multiple (« par le bout / au milieu / je l'écrase »).
- L'utilisateur ne choisit **qu'une seule** option, quel que soit le nombre proposé. Pas de réponses multiples, pas de texte libre, pas de photo.
- L'ordre des options est **fixe** (celui défini à la création), identique pour tous — c'est ce qui rend les captures d'écran comparables entre potes.
- La question **ferme à minuit** : passé ce délai elle ne compte plus pour le streak (§4.6) et n'est plus poussée en modale bloquante.
- Une journée manquée reste **rattrapable** depuis le calendrier de l'écran Stats (§5.2) : on peut répondre après coup pour compléter sa collection de cartes et voir les réponses de ses amis. Le rattrapage **ne restaure jamais le streak** — le streak récompense la régularité, la carte récompense la collection.
- Une réponse de rattrapage compte dans les compteurs agrégés (`answer_counts`) au même titre qu'une réponse à l'heure ; elle est marquée `late: true` pour pouvoir distinguer les deux plus tard.
- Réponse **définitive** : pas de modification après validation (c'est ce qui rend la stat crédible).

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
- Liste des amis : avatar, pseudo, réponse choisie, heure de réponse.
- Les amis qui n'ont pas encore répondu apparaissent en attente (« n'a pas encore répondu »), sans notion de retard ou de temps de réaction en v1.

### 4.6 Streak

- +1 à chaque journée où l'on a répondu avant minuit.
- **0** dès qu'une journée est manquée. Pas de joker : répondre en retard depuis le calendrier (§4.2) complète la journée dans le calendrier et débloque la carte, mais ne rallume pas le streak cassé.
- Streak visible sur son profil et à côté de son nom dans la liste des amis.
- Rappel push à 21h si la question du jour n'a pas été répondue et que le streak est en cours.

### 4.7 Proposition de questions

- N'importe quel utilisateur peut proposer une question : intitulé + **2 à 6** options, chacune avec son « tu es un.e ... ».
- La question part en file de modération (statut `pending`).
- Le modérateur valide, édite ou rejette depuis le backoffice FireCMS. Une raison de rejet est renvoyée à l'auteur.
- Une question validée rejoint le **pot commun** et devient éligible au tirage au sort.
- L'auteur est notifié quand sa question est validée, puis quand elle est effectivement tirée. Son pseudo est crédité sur l'écran de la question.
- Une question déjà tirée ne peut pas ressortir (v1 : jamais de rediffusion).

## 5. Navigation & écrans

L'app est en **neobrutalisme / sticker** : aplats de couleur francs, bordures noires épaisses, ombres portées dures et décalées (jamais de flou), `radius: 0` partout, titres en `font-head` (Archivo Black) et textes en `font-sans` (Space Grotesk).

Quatre encres, pas une de plus : papier crème (`background`), jaune doré (`primary`), rose bubblegum (`pop`), noir pour tous les contours. Le rose ne décore pas : il marque ce qui n'est pas un jour comme les autres — la flamme du streak, le record, la case d'aujourd'hui, l'invitation.

**Aucune icône de librairie, aucun emoji.** Les pictogrammes sont des **stickers** dessinés à la main : forme fermée, aplat de couleur, contour noir épais, copie noire décalée en guise d'ombre — comme toutes les autres surfaces. Un jeu d'icônes standard est tracé en traits fins uniformes : il disparaît à côté d'une bordure de 2px, et un emoji ne se colore pas et change de dessin sur chaque plateforme.

Les tokens sont dans `apps/app/src/theme/colors.js`, lu à la fois par `tailwind.config.js` et par l'app — aucun écran ne définit sa propre palette.

Toute l'app tient en **un écran d'accueil, un écran Profil, une modale et une carte**. Il n'y a pas de troisième niveau de navigation.

### 5.1 Navigation

**Pas de tabbar.** L'écran Stats (§5.2) est la racine de l'app : on y arrive au lancement et on y revient toujours. Une barre d'onglets pour deux écrans dont un seul se consulte quotidiennement coûterait une bande permanente en bas de l'écran pour rien.

L'accès au Profil se fait par **deux boutons-icônes en haut à droite** de l'écran Stats, alignés sur la ligne de salutation : disque plein, bordure noire épaisse, ombre dure décalée, glyphe noir au centre.

| Bouton | Pastille | Destination |
|---|---|---|
| **Inviter un pote** | `pop` (rose), glyphe « + » | Le partage du lien + code à 6 caractères (§4.1) |
| **Modifier le profil** | `primary` (jaune), glyphe crayon | L'écran Profil (§5.3) |

- L'invitation a son propre bouton plutôt que d'être enterrée dans le Profil : c'est l'action qui fait vivre le produit (§4.1), elle ne doit jamais être à deux taps.
- Pas de badge numérique ; l'état « question du jour non répondue » se signale par la modale (§5.4), pas par une pastille.

### 5.2 Écran Stats

L'écran d'accueil. De haut en bas :

**1. En-tête.** À gauche, « Salut {pseudo} » en `font-head` et une ligne de sous-titre en `font-sans`. À droite, les deux boutons-icônes de §5.1.

**2. Bloc streak.** Une carte `primary` bordée, ombre `lg`, occupant toute la largeur : le nombre de jours en très gros (`font-head`), le mot « jours d'affilée » en dessous, et un sticker flamme `pop`. Quand le streak est à 0, la carte passe en `muted` et la flamme s'éteint (aplat `muted`), avec « Réponds aujourd'hui pour repartir ».

**3. Calendrier mensuel.** Une grille de cases carrées, une par jour, bordure noire, `radius: 0`, séparées par une gouttière régulière. Quatre états :

| État | Rendu | Tap |
|---|---|---|
| **Répondu** | Case `primary`, ombre dure, le `stat_label` du jour en micro-texte (tronqué) | Ouvre la carte StatOwrel de ce jour (§5.5), en lecture seule |
| **Raté** (jour passé sans réponse) | Case `background`, bordure noire, petit sticker « ? » central | Ouvre la modale question de ce jour en **rattrapage** (§5.4) |
| **Aujourd'hui, pas encore répondu** | Case `pop` (rose), bordure doublée, légère pulsation | Ouvre la modale question du jour (§5.4) |
| **Futur, ou antérieur à l'inscription** | Case `muted`, sans bordure | Inerte |

- Navigation mois par mois (chevrons gauche/droite), bornée à la date d'inscription d'un côté et au mois courant de l'autre.
- Le calendrier **est** l'historique : c'est le seul endroit où l'on retrouve les questions passées et ses propres cartes.
- Un jour sans question diffusée (avant le lancement, ou incident de publication) est rendu comme « futur » : inerte, non rattrapable.

### 5.3 Écran Profil

- **En-tête carte** : avatar (cadre noir épais, ombre dure), pseudo en `font-head`, streak courant et meilleur streak.
- **Mes amis** : liste avatar + pseudo + streak, avec l'action « Retirer ». En tête de liste, un bouton plein `primary` « Inviter un pote » (partage du lien + code à 6 caractères, §4.1). Si la liste est vide, l'état vide occupe la place de la liste : « Sans potes, StatOwrel c'est juste des chiffres. »
- **Mes questions** : proposer une question (§4.7) et suivre le statut de celles déjà envoyées (`en attente` / `validée` / `rejetée` + raison / `tirée le JJ/MM`).
- **Réglages** : notifications, déconnexion, suppression de compte.

### 5.4 Modale question (bottom sheet)

La question n'a **jamais** son propre écran : c'est toujours une **bottom sheet** posée par-dessus l'écran Stats.

- **Question du jour non répondue** → la sheet s'ouvre **automatiquement** au lancement de l'app (ou à l'ouverture de la notification) et **reste ouverte tant qu'on n'a pas répondu** : pas de poignée de fermeture, pas de tap sur le fond, retour Android intercepté. On ne peut pas consulter l'app en évitant la question. Hauteur pleine, coins droits (`radius: 0`), bordure haute noire épaisse, ombre dure vers le haut.
- **Rattrapage depuis le calendrier** → même sheet, mais **fermable** (poignée + tap sur le fond) : on a le droit de regarder une vieille question et de repartir sans répondre.

Contenu, de haut en bas :

1. La **date** en micro-texte (« Aujourd'hui » ou « Mardi 12 août »).
2. Le **titre de la question**, très gros, en `font-head`, cadré à gauche sur 2 à 4 lignes — c'est l'élément dominant de l'écran, façon carton de quizz.
3. Les **options**, empilées verticalement, une par ligne, pleine largeur : carte `card`, bordure noire, ombre dure, label en `font-sans` gras. De 2 à 6 selon la question, dans leur ordre fixe (§4.2). Au-delà de 4 options, la liste défile — le titre reste épinglé en haut.
4. Le **crédit auteur** en bas (« proposée par @pseudo ») quand la question vient d'un utilisateur.

L'interaction est le **double tap** décrit en §4.3 : premier tap = sélection (l'option se soulève, les autres s'estompent), deuxième tap = validation. Après validation, la sheet ne se ferme pas : son contenu **bascule** sur la carte StatOwrel (§5.5), sans changement d'écran ni retour au calendrier.

### 5.5 Écran résultat — la carte StatOwrel

L'écran de récompense. Il reprend délibérément les codes d'une **carte Pokémon** : c'est un objet qu'on collectionne, qu'on compare et qu'on screenshote.

Anatomie de la carte, dans l'ordre vertical :

| Zone | Contenu | Traitement carte |
|---|---|---|
| **Cadre** | — | Double encadrement : bordure noire épaisse + liseré intérieur `primary`, ombre `2xl`, proportions portrait ~2:3 |
| **Bandeau haut** | Le `stat_label` en très gros (« Efficace ») à gauche, le **pourcentage** à droite | Le pourcentage tient la place des PV d'une carte Pokémon |
| **Illustration** | Encart carré bordé : l'emoji/visuel de l'option choisie sur aplat de couleur | La « fenêtre d'illustration » de la carte |
| **Phrase** | « Comme **68%** des utilisateurs, tu es un.e **efficace**. » | Corps de texte de la carte |
| **Encart question** | La question du jour + l'option choisie, sur fond `muted` | L'équivalent du bloc « attaque » |
| **Barre de stats** | La répartition complète des options en barres horizontales bordées, la sienne mise en avant | Le bas de carte, chiffré |
| **Pied** | Date, numéro du jour (« #142 »), pseudo de l'auteur de la question | Le pied d'une carte : édition + illustrateur |

- **Rareté.** Plus l'option choisie est minoritaire, plus la carte est rare : au-delà de 50% la carte est `common` (aplat `primary`), sous 25% elle passe `rare` (liseré doré), sous 10% `ultra rare` (fond holographique animé au tilt de l'appareil). C'est ce qui rend intéressant de répondre honnêtement plutôt que comme tout le monde. La rareté est calculée à l'affichage depuis `answer_counts`, elle n'est pas figée : elle bouge tant que les réponses arrivent, et se stabilise à la clôture.
- **Bouton « Partager »** sous la carte : génère l'image de la carte seule (sans les amis) — §4.4.
- **Les amis, sous la carte** (§4.5) : hors du cadre, en liste simple — avatar, pseudo, l'option choisie et l'heure. Les amis qui ont répondu comme moi sont regroupés en tête sous « Comme toi », les autres suivent, les non-répondants ferment la liste en `muted`.
- Cette carte est **rejouable à volonté** : tap sur un jour répondu dans le calendrier (§5.2) la rouvre à l'identique, avec les stats à jour et les réponses des amis arrivées depuis.

### 5.6 Ce qui n'existe pas

Pas de feed, pas d'écran « amis » séparé, pas d'écran de recherche, pas de menu latéral, pas de tabbar, pas de réglages sur l'écran Stats. Pas non plus d'encart « la question tombe entre 8h et 20h » : l'heure est aléatoire (§4.2), un rappel permanent de cette fenêtre n'apprend rien et encombre l'accueil. Un accueil, un Profil, une modale, une carte.

## 6. Modèle de données (esquisse)

Conventions : collections préfixées `v1_`, champs en `snake_case`, champs optionnels toujours à `null`, timestamps en `UniversalTimestamp`. Voir `CLAUDE.md`.

| Collection | Contenu |
|---|---|
| `v1_users` | `display_name`, `photo_url`, `created_at`, `updated_at`, `email`, `auth_providers[]` (`password` / `google.com` / `facebook.com` / `apple.com`), `streak_count`, `streak_best` (meilleur streak, §5.3), `streak_last_answered_on`, `invite_code` |
| `v1_users/{id}/friends` | une entrée par ami (écrite des deux côtés à l'acceptation) |
| `v1_questions` | `label`, `options` (**tableau ordonné** de `{ id: ULID, label, stat_label }`), `status` (`pending` / `approved` / `rejected` / `used`), `author_id`, `rejection_reason`, `broadcast_at` (jour + heure de diffusion, `null` tant que non programmée) |
| `v1_daily_questions` | une par jour, **id de document = `date`** au format `AAAA-MM-JJ` (fuseau Europe/Paris), pas un ULID : `date`, `question_id`, `published_at`, `closes_at`, `answer_counts` (map `option_id` → total ; pas de total scalaire, il se somme depuis la map) |
| `v1_daily_questions/{id}/v1_daily_question_answers` | une par utilisateur, **id de document = UID de l'auteur** (rend « une réponse par personne et par jour » structurel) : `user_id`, `date` (recopié du parent), `option_id`, `answered_at`, `late` (réponse de rattrapage, §4.2) |

Le calendrier de l'écran Stats (§5.2) lit un mois de réponses **de l'utilisateur courant** : grâce au `date` recopié dans la réponse, c'est une seule requête de groupe de collections sur `v1_daily_question_answers` filtrée par `user_id` et `date`, sans croisement avec `v1_daily_questions`. L'index composite correspondant (`v1_daily_question_answers`, `user_id ASC, date ASC`, portée groupe de collections) existe désormais dans `packages/firestore-config`. Le nom de la sous-collection reprend le préfixe `v1_` et celui de son parent : un groupe de collections est global à la base et ne connaît que le dernier segment du chemin, un simple `answers` entrerait donc en collision avec toute autre sous-collection du même nom.

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
