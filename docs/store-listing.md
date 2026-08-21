# StatOwrel — Fiches App Store & Google Play

Statut : **prêt à copier-coller**, sous une réserve. Tous les textes ci-dessous décrivent
**uniquement ce que la version 1.0 fait réellement** — voir `docs/prd.md` pour le produit visé et
la §7 de ce document pour les phrases à réactiver quand les fonctionnalités manquantes arriveront.

> Règle qui a présidé à toute la rédaction : **une fiche ne promet rien que l'examinateur ne
> puisse voir à l'écran.** Une capture ou une phrase qui décrit une fonctionnalité absente est un
> motif de rejet App Store (guideline 2.3.1, « Accurate Metadata ») et un motif de suspension
> Play (« Trompeuse »). C'est pourquoi ni la notification du matin, ni le partage d'image, ni la
> proposition de questions n'apparaissent dans les textes ci-dessous : rien de tout cela n'est
> branché dans l'app aujourd'hui (`docs/production-checklist.md` §1).

Langue de la fiche : **français (France)**, langue principale. Aucune localisation anglaise n'est
prévue pour la 1.0 — les questions elles-mêmes sont en français, une fiche anglaise attirerait un
public que l'app ne sert pas.

---

## 1. App Store (iOS)

### 1.1 Nom de l'app — 30 caractères max

```
StatOwrel — question du jour
```
28 caractères.

Variantes, si celle-ci est déjà prise ou si l'ASO en décide autrement :

| Variante | Car. |
|---|---|
| `StatOwrel — question du jour` | 28 |
| `StatOwrel : 1 question par jour` | 31 ❌ |
| `StatOwrel : 1 question/jour` | 27 |
| `StatOwrel` | 9 |

Le nom **doit** correspondre au `name` de la variante `production` dans `apps/app/app.config.ts`
(aujourd'hui `StatOwrel`) au moins dans sa racine : le nom affiché sous l'icône et le nom de la
fiche peuvent différer, mais un écart trop large se fait remarquer à l'examen.

### 1.2 Sous-titre — 30 caractères max

```
1 question/jour entre potes
```
27 caractères.

Variantes :

| Variante | Car. |
|---|---|
| `1 question/jour entre potes` | 27 |
| `La question du jour, à 7h` | 25 |
| `Une question. Tous les jours.` | 29 |

### 1.3 Texte promotionnel — 170 caractères max

Modifiable **sans nouvelle soumission** : c'est le champ à faire vivre (question du jour marquante,
palier d'utilisateurs, saison).

```
Chaque jour, une question que personne ne pense à poser. Tu réponds, tu découvres dans quel pourcentage tu tombes — et ce que tes potes ont répondu.
```
148 caractères.

Rotation prête à l'emploi :

```
« Ton dentifrice, tu le presses par le bout ou au milieu ? » Réponds, découvre si tu es méthodique ou anarchiste, et compare avec tes potes.
```
140 caractères.

```
Pas de feed. Pas de likes. Une question par jour, ta réponse dans la statistique, et celles de tes potes une fois que tu as joué.
```
129 caractères.

### 1.4 Description — 4000 caractères max

```
Une question. Une par jour. La même pour tout le monde.

StatOwrel est un réseau social entre potes sans feed, sans likes et sans commentaires. Une question personnelle, absurde, celle que personne ne pense à poser. Tu as la journée pour y répondre, et ça te prend dix secondes.

TU RÉPONDS, TU DÉCOUVRES DEUX CHOSES

1. Ta StatOwrel — ta réponse replacée dans la statistique de tous les autres. « Comme 68% des gens, tu es un.e efficace. » Plus ta réponse est minoritaire, plus le résultat est rare : au-dessous de 25% il passe rare, au-dessous de 10% ultra rare.

2. Les réponses de tes potes — débloquées seulement une fois que tu as répondu toi-même. Pas de voyeurisme, pas de triche : on ne regarde pas les autres sans avoir joué.

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

2471 caractères — de la marge pour ajouter les blocs de la §7 au fil des versions.

### 1.5 Mots-clés — 100 caractères max, séparés par des virgules, **sans espace**

```
question,jour,potes,amis,stat,statistique,sondage,quiz,vote,serie,streak,quotidien,matin,entre
```
94 caractères.

Trois règles respectées ici, et qui doivent l'être à chaque itération :

- **Aucune marque concurrente** (BeReal, Snap, Gas…). Apple rejette pour utilisation de marque
  tierce dans les mots-clés — c'est un rejet fréquent et évitable.
- **Pas de répétition du nom ni du sous-titre.** « StatOwrel » et les mots déjà présents dans le
  nom et le sous-titre sont indexés d'office ; les remettre ici gaspille des caractères.
- **Singulier, sans accent, sans espace après la virgule.** Apple découpe sur la virgule seule ;
  un espace consomme un caractère utile. Les accents sont normalisés par l'indexation, autant
  écrire `serie` et récupérer le caractère.

### 1.6 Nouveautés de cette version — 4000 caractères max

Pour la **1.0** :

```
Première version de StatOwrel.

Une question par jour, la même pour tout le monde. Tu réponds en deux taps, tu découvres dans quel pourcentage tu tombes, puis ce que tes potes ont répondu. Ta série monte tant que tu ne rates pas un jour, et ton calendrier garde toutes les questions déjà posées — y compris celles d'avant ton arrivée.

Bon appétit.
```

### 1.7 URLs — obligatoires

| Champ | Statut | Valeur |
|---|---|---|
| URL de la politique de confidentialité | **bloquant** | à publier — voir `docs/privacy-policy.md` |
| URL d'assistance | **bloquant** | à publier (page ou `mailto:` sur un domaine maîtrisé) |
| URL marketing | facultatif | — |

Ces deux URLs sont des blocages durs : App Store Connect refuse la soumission sans la politique de
confidentialité, et Play exige en plus une URL de **suppression de compte** accessible hors de
l'app. Le contenu à publier est rédigé dans `docs/privacy-policy.md` ; il ne reste qu'à l'héberger.
Le plus court chemin : le déployer sur le Firebase Hosting qui sert déjà `apps/admin`
(`firebase.json` → `hosting`), sur `/confidentialite` et `/suppression-compte`.

### 1.8 Catégories

- **Principale : Réseaux sociaux.** C'est ce que l'app est, et c'est la catégorie où l'usage
  « entre potes » se cherche.
- **Secondaire : Divertissement.**

« Style de vie » a été écarté : la boucle est sociale avant d'être introspective.

### 1.9 Classification par âge

Réponses au questionnaire App Store Connect, à partir du contenu réel :

| Question | Réponse | Pourquoi |
|---|---|---|
| Thèmes sexuels ou nudité | Aucun | — |
| Violence (réaliste ou de dessin animé) | Aucune | — |
| Blasphème ou humour grossier | **Peu fréquent / modéré** | Le ton assumé du produit (`docs/prd.md` §1) : « Caca : combien de temps ? » est une question type |
| Alcool, tabac, drogues | Aucun | — |
| Jeux d'argent | Aucun | Pas de simulation non plus |
| Contenu horrifique | Aucun | — |
| **Contenu généré par les utilisateurs** | **Oui, modéré** | Voir ci-dessous |
| Accès web illimité | Non | Aucun navigateur intégré |
| Localisation | Non | — |

Classement attendu : **12+**.

**Le point qui se défend à l'examen, c'est le contenu utilisateur.** Il existe et il faut le
déclarer, mais il est déjà encadré par la conception :

- Les questions **ne sont pas publiées par les utilisateurs** : elles passent par une file de
  modération et sont approuvées une par une dans une console d'administration
  (`apps/admin`) avant de pouvoir être tirées. En 1.0, l'app ne permet même pas d'en proposer.
- Une réponse est le **choix d'une option pré-écrite**, jamais du texte libre, jamais une photo.
- Le seul texte qu'un utilisateur écrit et qu'un autre peut voir est son **nom d'utilisateur**,
  et uniquement auprès de ses amis — il n'y a ni annuaire, ni recherche, ni profil public.
- Un utilisateur peut retirer un ami à tout moment, des deux côtés.

Ces quatre points sont à reprendre tels quels dans les notes pour l'examen : ils répondent par
avance à la guideline 1.2 (contenu généré par les utilisateurs), qui exige un filtrage, un
signalement, un blocage et un délai de traitement de 24h. Le filtrage et le blocage sont là ;
**le signalement manque et doit être ajouté** — voir `docs/production-checklist.md` §2.

### 1.10 Notes pour l'examen (App Review Information)

L'app étant **entièrement derrière une authentification**, un compte de démonstration est
obligatoire. Sans lui, rejet automatique en quelques heures.

```
L'application est intégralement derrière une connexion : merci d'utiliser le compte de démonstration ci-dessous.

Le compte fourni a déjà répondu à plusieurs journées et compte deux amis, afin que le calendrier, le résultat statistique et la liste d'amis soient tous visibles immédiatement.

PARCOURS EN 30 SECONDES
1. Connexion avec l'e-mail et le mot de passe fournis.
2. L'écran d'accueil affiche la série en cours et le calendrier du mois.
3. Toucher le bandeau de la question du jour, ou n'importe quelle case du calendrier.
4. Toucher une option une première fois : elle se sélectionne. La toucher une seconde fois : la réponse est validée. Il n'y a volontairement pas de bouton « Valider » — le second toucher est le bouton.
5. L'écran bascule sur le résultat : le pourcentage, la statistique de chaque option, et les réponses des amis.
6. Le second bouton de l'en-tête ouvre le menu : liste d'amis, invitation, réglages, suppression du compte.

CONNEXION AVEC APPLE
« Se connecter avec Apple » est proposé au même niveau que Google et l'e-mail, conformément à la guideline 4.8.

CONTENU GÉNÉRÉ PAR LES UTILISATEURS
Les questions ne sont pas publiées par les utilisateurs : elles sont approuvées une par une dans une console de modération avant de pouvoir être diffusées. Une réponse est le choix d'une option pré-écrite — jamais de texte libre, jamais de photo. Le seul texte qu'un utilisateur écrit est son nom d'utilisateur, visible uniquement de ses amis : il n'y a ni annuaire, ni recherche, ni profil public. Une amitié se retire des deux côtés à tout moment, et un utilisateur peut signaler un nom d'utilisateur inapproprié depuis la fiche de son ami.

SUPPRESSION DU COMPTE
Menu (second bouton de l'en-tête) → Réglages → Supprimer mon compte. La suppression est immédiate et définitive.
```

> Deux paragraphes de ces notes décrivent des fonctionnalités **qui n'existent pas encore** : le
> signalement d'un nom d'utilisateur et la suppression du compte. Ils sont écrits ici parce que
> les deux sont des blocages durs à traiter avant soumission (`docs/production-checklist.md` §2) —
> mais **ne soumettez pas ces notes tant que le code ne les honore pas.** Un examinateur qui suit
> un chemin décrit dans les notes et ne le trouve pas rejette immédiatement.

### 1.11 Confidentialité de l'app (App Privacy)

Renseigné à partir de ce que le code collecte réellement — inventaire complet et justifié dans
`docs/privacy-policy.md`.

| Type de donnée | Collecté | Lié à l'identité | Suivi (tracking) | Finalité |
|---|---|---|---|---|
| Adresse e-mail | Oui | Oui | Non | Fonctionnalité de l'app (authentification) |
| Nom d'utilisateur | Oui | Oui | Non | Fonctionnalité de l'app |
| Photo de profil (fournie par Google/Apple) | Oui | Oui | Non | Fonctionnalité de l'app |
| ID utilisateur (UID Firebase) | Oui | Oui | Non | Fonctionnalité de l'app |
| Contenu utilisateur (réponses aux questions) | Oui | Oui | Non | Fonctionnalité de l'app |
| Contacts | **Non** | — | — | L'app ne lit jamais le carnet d'adresses |
| Localisation | **Non** | — | — | — |
| Identifiants publicitaires | **Non** | — | — | Aucune régie, aucun SDK publicitaire |
| Diagnostics / analyse d'usage | **Non** | — | — | Aucun SDK d'analytics ni de crash reporting n'est intégré aujourd'hui |

- **Suivi (App Tracking Transparency) : non.** Aucune donnée n'est partagée avec un courtier ni
  recoupée avec des données tierces à des fins publicitaires. Aucun appel à `AppTrackingTransparency`
  n'est donc nécessaire, et il ne faut surtout pas en ajouter un « au cas où » : demander la
  permission sans en avoir l'usage est un motif de rejet à part entière.
- **À re-répondre le jour où un SDK d'analytics ou de crash reporting est ajouté.** La déclaration
  n'est pas figée à la première soumission, mais elle doit être exacte à chaque version.

---

## 2. Google Play (Android)

### 2.1 Titre — 30 caractères max

```
StatOwrel — question du jour
```
28 caractères. Identique à iOS.

### 2.2 Description courte — 80 caractères max

```
Une question par jour. Ta réponse dans la stat, et celles de tes potes.
```
71 caractères.

Variantes :

| Variante | Car. |
|---|---|
| `Une question par jour. Ta réponse dans la stat, et celles de tes potes.` | 71 |
| `1 question par jour, entre potes. Sans feed, sans likes, sans pub.` | 66 |
| `Réponds à la question du jour, découvre ta stat et celle de tes potes.` | 70 |

### 2.3 Description complète — 4000 caractères max

Reprendre **mot pour mot** la description App Store (§1.4). Elle tient dans les 4000 caractères
des deux côtés, et deux fiches divergentes finissent toujours par se contredire au fil des mises à
jour.

Une seule adaptation : Play interprète le markdown léger. Les intertitres en capitales peuvent
devenir des `<b>…</b>` si l'on veut, mais ce n'est pas nécessaire — les capitales seules tiennent
la mise en page et restent lisibles dans l'aperçu tronqué.

**Interdit par les règles Play**, à ne jamais glisser dans ce champ : « meilleur », « n°1 », toute
mention de classement, tout emoji dans le titre, tout appel à l'action de type « télécharge
maintenant », et toute marque concurrente.

### 2.4 Sécurité des données (Data safety)

Le formulaire Play est plus exigeant que celui d'Apple : il demande, pour chaque donnée, si elle
est **collectée**, **partagée**, **chiffrée en transit**, et si elle est **supprimable**.

| Donnée | Collectée | Partagée | Obligatoire | Finalité |
|---|---|---|---|---|
| Adresse e-mail | Oui | Non | Oui | Gestion du compte |
| Nom d'utilisateur | Oui | Non | Oui | Gestion du compte, fonctionnalité de l'app |
| Photo de profil | Oui | Non | Non | Fonctionnalité de l'app |
| ID utilisateur | Oui | Non | Oui | Gestion du compte |
| Autres actions dans l'app (réponses aux questions) | Oui | Non | Oui | Fonctionnalité de l'app |

Réponses transversales :

- **Chiffrement en transit : oui.** Tout passe par HTTPS (Firebase Auth, Firestore, Cloud
  Functions).
- **L'utilisateur peut demander la suppression de ses données : oui**, et c'est la case qui
  impose la fonctionnalité de suppression de compte dans l'app **et** une URL web de demande de
  suppression (`docs/production-checklist.md` §2).
- **Partage avec des tiers : non**, au sens de Play — mais attention à un détail réel : les avatars
  par défaut sont générés en appelant `api.dicebear.com` avec **le nom d'utilisateur en graine**
  (`apps/app/src/lib/avatars.ts`). Un pseudonyme sort donc de l'infrastructure. Ce n'est pas un
  « partage » au sens du formulaire (aucune donnée n'est transmise à un tiers pour son propre
  usage), mais cela doit figurer dans la politique de confidentialité, et le point est tranché
  dans `docs/production-checklist.md` §3.

### 2.5 Classification du contenu (IARC)

Mêmes réponses qu'en §1.9. Sur le questionnaire IARC, les deux questions qui décident :

- **« L'application contient-elle de l'humour grossier ou scatologique ? »** → **Oui, léger.**
  Répondre non serait faux : « Caca : combien de temps ? » est une question type du produit.
- **« Les utilisateurs peuvent-ils interagir ou partager du contenu ? »** → **Oui.** Il faut alors
  préciser que les interactions sont limitées à une liste d'amis mutuels, sans contenu libre.

Classement attendu : **PEGI 12 / Everyone 10+ à Teen** selon les territoires.

### 2.6 Public cible et contenu

- Tranche d'âge cible : **13-15, 16-17, 18 et plus.** Ne **jamais** cocher une tranche sous 13 ans :
  cela déclencherait les règles « Familles » (Designed for Families), incompatibles avec une app
  sociale à connexion.
- Application sociale : **oui**, avec la précision « interactions entre amis mutuels uniquement,
  sans messagerie ».
- Publicité : **non**, l'app ne contient aucune publicité.

---

## 3. Visuels

Les textes ne suffisent pas : les deux stores refusent une fiche sans captures aux bons formats.

### 3.1 Captures d'écran — l'ordre raconte la boucle

Six captures, dans cet ordre, chacune avec sa légende incrustée (la légende est ce qui se lit, la
capture est ce qui prouve) :

| # | Écran | Légende |
|---|---|---|
| 1 | La question du jour, plein écran, une option sélectionnée | **Une question. Tous les jours.** |
| 2 | La même, sur le second tap | **Deux taps. Pas de bouton valider.** |
| 3 | Le résultat : « Comme 10% des gens, tu es un.e BORDÉLIQUE » | **Ta réponse, dans la statistique.** |
| 4 | La carte de récap avec les pourcentages par option | **Vraiment, tout le monde fait ça ?** |
| 5 | Les réponses des amis sous la récap | **Et tes potes ? Une fois que tu as joué.** |
| 6 | L'écran Stats : série, compteurs, calendrier | **Ta série, ton calendrier, ta collection.** |

La 1 et la 3 sont les deux seules que la plupart des gens verront : elles doivent tenir seules.

### 3.2 Formats exigés

| Store | Ce qu'il faut | Note |
|---|---|---|
| App Store | 6,9" (1290×2796) et 6,5" (1242×2688) | Apple décline les autres tailles depuis la 6,9" ; fournir les deux reste le plus sûr |
| App Store | Icône 1024×1024, sans transparence, sans coins arrondis | `apps/app/assets/icon.png` est la source |
| Play | 2 captures minimum, 8 maximum, min. 1080 px sur le petit côté | Mêmes visuels que iOS |
| Play | Icône 512×512 PNG 32 bits | |
| Play | **Bannière 1024×500** | Obligatoire, et souvent oubliée : la fiche est refusée sans elle |

L'étoile de `assets/splash-icon.png` sur le jaune de marque (`#ffdc59`) fait une bannière évidente.

### 3.3 Vidéo de prévisualisation

Facultative des deux côtés, et à **écarter pour la 1.0** : le double tap se filme mal en 15
secondes, et une vidéo médiocre convertit moins bien que la capture 1 seule.

---

## 4. Ce qui reste à décider (et qui bloque la soumission)

| Décision | Pourquoi elle ne peut pas attendre |
|---|---|
| Nom du domaine qui hébergera la politique de confidentialité et le support | Champ obligatoire des deux fiches |
| Adresse e-mail de support publique | Affichée sur la fiche Play, obligatoire ; ne pas y mettre une adresse personnelle |
| Nom de l'éditeur affiché sur la fiche | Une personne physique verra son **nom et son adresse** publiés sur Play (obligation « Vérification du développeur ») ; une structure évite cela |
| Compte de démonstration pour l'examen | À créer sur le projet de production, avec des réponses et deux amis (§1.10) |

---

## 5. Cohérence entre les deux fiches

Un seul texte source par champ, recopié — jamais deux rédactions parallèles :

| Champ | iOS | Android |
|---|---|---|
| Nom / Titre | identique | identique |
| Description longue | source | copie |
| Sous-titre (30) | source | ⟶ n'existe pas côté Play |
| Description courte (80) | ⟵ n'existe pas côté Apple | source |
| Texte promotionnel (170) | source | ⟶ n'existe pas côté Play |

Les trois champs courts ne se recouvrent pas d'un store à l'autre : c'est le seul endroit où les
deux fiches divergent légitimement.

---

## 6. Ton de la fiche

Trois règles, tirées du produit lui-même (`docs/prd.md` §1) :

1. **Tutoiement.** L'app tutoie (« Salut Lou », « Réponds aujourd'hui pour repartir »), la fiche
   tutoie.
2. **Concret plutôt que promotionnel.** « Comme 68% des gens, tu es un.e efficace » vaut mieux que
   « découvrez une nouvelle façon de vous connecter ». Une phrase de la fiche doit pouvoir être
   une phrase de l'app.
3. **Ce qu'il n'y a pas est un argument.** Pas de feed, pas de likes, pas de pub : la 1.0 se vend
   autant par ses absences que par ses fonctionnalités, et c'est le seul angle qui distingue
   vraiment l'app dans sa catégorie.

Ce qu'il faut éviter : les superlatifs, les emojis dans le nom ou le titre (interdits côté Play),
et toute mention d'un concurrent — dans les textes comme dans les mots-clés.

---

## 7. Phrases à réactiver quand la fonctionnalité arrivera

Rédigées d'avance, à **ne pas publier** avant que le code correspondant soit dans le binaire
soumis. Chaque ligne référence le point de `docs/production-checklist.md` qui la débloque.

| Fonctionnalité | À ajouter dans la description | Débloqué par |
|---|---|---|
| Notification du matin | `LA NOTIFICATION DE 7H` / `Tous les matins à 7h, la question tombe. Tu as jusqu'à minuit.` | Checklist §1.1 |
| Partage du résultat | `PARTAGE TA STATOWREL` / `Une image de ton résultat, prête pour la story. Sans les réponses de tes potes — elles restent entre vous.` | Checklist §1.3 |
| Proposition de questions | `PROPOSE TES QUESTIONS` / `Une meilleure idée ? Propose-la. Validée par la modération, elle peut tomber un matin pour tout le monde, avec ton nom crédité dessous.` | Checklist §1.4 |
| Lien et code d'invitation | Remplacer `On ajoute un pote en tapant son nom d'utilisateur exact` par `On ajoute un pote par lien, par code à 6 caractères, ou en tapant son nom d'utilisateur exact.` | Checklist §1.5 |
| Rappel de 21h | `Un rappel le soir si tu as oublié — désactivable.` | Checklist §1.1 |

Le texte promotionnel (§1.3) se met à jour **sans soumission** : c'est là qu'une nouveauté
s'annonce le jour même. La description, elle, attend la version suivante.
