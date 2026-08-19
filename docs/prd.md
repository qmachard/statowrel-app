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
- La question expire à **minuit**. Passé ce délai, on ne peut plus répondre — la journée est perdue.
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
- **0** dès qu'une journée est manquée. Pas de joker, pas de rattrapage en v1.
- Streak visible sur son profil et à côté de son nom dans la liste des amis.
- Rappel push à 21h si la question du jour n'a pas été répondue et que le streak est en cours.

### 4.7 Proposition de questions

- N'importe quel utilisateur peut proposer une question : intitulé + **2 à 6** options, chacune avec son « tu es un.e ... ».
- La question part en file de modération (statut `pending`).
- Le modérateur valide, édite ou rejette depuis le backoffice FireCMS. Une raison de rejet est renvoyée à l'auteur.
- Une question validée rejoint le **pot commun** et devient éligible au tirage au sort.
- L'auteur est notifié quand sa question est validée, puis quand elle est effectivement tirée. Son pseudo est crédité sur l'écran de la question.
- Une question déjà tirée ne peut pas ressortir (v1 : jamais de rediffusion).

## 5. Modèle de données (esquisse)

Conventions : collections préfixées `v1_`, champs en `snake_case`, champs optionnels toujours à `null`, timestamps en `UniversalTimestamp`. Voir `CLAUDE.md`.

| Collection | Contenu |
|---|---|
| `v1_users` | `display_name`, `avatar_url`, `email`, `auth_providers[]` (`password` / `google.com` / `facebook.com` / `apple.com`), `streak_count`, `streak_last_answered_on`, `invite_code` |
| `v1_users/{id}/friends` | une entrée par ami (écrite des deux côtés à l'acceptation) |
| `v1_questions` | `label`, `options[]` (`{ key, label, stat_label }`), `status` (`pending` / `approved` / `rejected` / `used`), `author_id`, `rejection_reason` |
| `v1_daily_questions` | une par jour : `date`, `question_id`, `published_at`, `closes_at`, `answer_counts` (map option → total) |
| `v1_daily_questions/{id}/answers` | une par utilisateur : `user_id`, `option_key`, `answered_at` |

**Backend :**

- Un scheduler quotidien tire la question du lendemain et son heure de publication, puis programme la publication (Cloud Tasks).
- Un trigger sur création de réponse incrémente `answer_counts` et met à jour le streak de l'auteur.
- Un scheduler à minuit clôture la journée et remet à zéro les streaks des utilisateurs sans réponse.

## 6. Hors périmètre (v1)

- Feed, likes, commentaires, messagerie.
- Questions à texte libre, à photo, à réponses multiples (cocher plusieurs options), ou à plus de 6 options.
- Groupes / cercles d'amis multiples.
- Historique des questions passées et de ses propres stats dans le temps.
- Classements, badges, monétisation.
- Multi-fuseau horaire (tout le monde sur Europe/Paris).

## 7. Indicateurs de succès

| Indicateur | Cible |
|---|---|
| Taux de réponse quotidien (DAU / utilisateurs actifs) | > 60% |
| Streak médian à J+30 | > 7 jours |
| Amis médians par utilisateur | > 5 |
| Questions proposées / 100 utilisateurs / semaine | > 10 |
| Partages de StatOwrel / réponse | > 5% |

## 8. Questions ouvertes

- Que se passe-t-il quand le pot commun de questions validées est vide ? (Réserve rédigée en interne, ou rediffusion d'une ancienne question ?)
- Doit-on afficher la StatOwrel restreinte à ses amis en plus de la stat globale ?
- Le rappel de 21h est-il perçu comme utile ou comme du harcèlement ? À tester.
- Faut-il une modération automatique (LLM) en amont de la modération humaine pour absorber le volume ?
