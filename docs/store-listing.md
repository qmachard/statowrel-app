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

## 0. La baseline

```
Les questions que personne ne pose. Les réponses que tout le monde veut.
```
72 caractères.

C'est la phrase de marque : **une seule**, recopiée partout, jamais reformulée d'un support à
l'autre. Elle dit ce que le mécanisme ne dit pas — pourquoi on ouvre l'app, et pas seulement ce
qu'on y fait.

**Ce qu'elle tient.** Une tension en deux temps, dans l'ordre où elle se lit : le premier membre
disqualifie la question (personne ne la pose, elle ne sert à rien), le second la rend irrésistible
(tout le monde veut quand même savoir). C'est exactement la promesse du produit — « une question
personnelle, absurde, que personne ne pense à poser » (`docs/prd.md` §1) — et c'est ce que la
description ne peut pas dire en décrivant le double tap ou le calendrier.

**Les arbitrages de rédaction**, pour qu'ils ne se reperdent pas à la prochaine itération :

- **Le pluriel plutôt que le singulier.** « La question que personne ne pose » désigne celle du
  jour ; le pluriel désigne le produit. La baseline parle de l'app, pas de la journée.
- **Le parallélisme.** « Les questions… / Les réponses… » : deux membres de même longueur, même
  construction, la bascule au milieu. C'est ce qui la rend citable, et ce qui la fait tenir sur
  deux lignes d'une bannière.
- **« Tout le monde » plutôt que « tu ».** Le reste de la fiche tutoie (§6), et la baseline est la
  seule exception assumée : la promesse est statistique — la réponse qu'on veut est celle *des
  autres*, pas la sienne. « Tout le monde » est déjà la stat.
- **La compulsion, coupée.** « Que tu ne pourrais pas t'empêcher de connaître » la dit mieux mais
  la dit long (90 caractères contre 72), et une baseline se lit d'un œil. « Veut » suffit : le
  premier membre a déjà installé le fait qu'on ne devrait pas.

### Variantes, si celle-ci s'use

| Variante | Car. | Ce qu'elle change |
|---|---|---|
| `Les questions que personne ne pose. Les réponses que tout le monde veut.` | 72 | **Retenue** |
| `Personne ne pose la question. Tout le monde veut la réponse.` | 60 | Plus sèche, plus punchy ; perd le pluriel de produit |
| `Les questions que personne ne pose, et dont tout le monde veut la réponse.` | 74 | Une seule phrase : plus fluide à lire, moins frappante à citer |
| `Des questions que personne ne pose. Des réponses que tu ne peux pas t'empêcher de vouloir.` | 90 | La formulation d'origine, gardée entière — trop longue pour une bannière, juste pour un texte promotionnel |
| `Personne ne pose la question. Toi, tu veux la réponse.` | 54 | Tutoie, comme le reste de la fiche ; perd la promesse statistique |

### Où elle sert

| Support | Usage |
|---|---|
| Description courte Play (§2.2) | **Le champ lui-même** — 72 des 80 caractères |
| Texte promotionnel App Store (§1.3) | Première phrase |
| Description longue, iOS et Play (§1.4) | Première ligne, avant tout le reste |
| Bannière Play 1024×500 (§3.2) | Sur le jaune de marque, sous l'étoile |

Elle ne va **pas** sur les captures d'écran : celles-ci portent leur propre jeu de légendes (§3.1),
dont la première est la déclinaison au singulier de la baseline — « Une question que personne n'ose
poser. » La baseline dit le produit, la capture dit la journée. C'est un écho, pas une reformulation.

Elle ne va **pas** dans le sous-titre App Store : voir §1.2, l'arbitrage y est différent.

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
| `Personne ne pose la question` | 28 |
| `La question du jour, à 7h` | 25 |
| `Une question. Tous les jours.` | 29 |

**Pourquoi le mécanisme et non la baseline ici.** Le sous-titre est le seul champ court d'iOS qui
soit **indexé** : « question », « jour » et « potes » y sont trois mots que les gens tapent
réellement. « Personne ne pose la question » (28 caractères) tient et sonne mieux, mais ne contient
aucun terme de recherche et n'apprend rien à qui découvre la fiche. La baseline a déjà quatre
autres supports (§0) ; le sous-titre est le seul endroit où le mécanisme doit passer.

À rebasculer sur la baseline le jour où la marque est connue et où la recherche par nom dépasse la
recherche générique.

### 1.3 Texte promotionnel — 170 caractères max

Modifiable **sans nouvelle soumission** : c'est le champ à faire vivre (question du jour marquante,
palier d'utilisateurs, saison).

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Une par jour, la même pour tous : tu réponds, tu découvres ta stat, puis celles de tes potes.
```
166 caractères.

Rotation prête à l'emploi :

```
Des questions que personne ne pose. Des réponses que tu ne peux pas t'empêcher de vouloir. Une par jour, la même pour tout le monde, et tes potes y passent aussi.
```
162 caractères.

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
Les questions que personne ne pose. Les réponses que tout le monde veut.

Une par jour. La même pour tout le monde.

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

2531 caractères — de la marge pour ajouter les blocs de la §7 au fil des versions.

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
| URL de la politique de confidentialité | **bloquant** | écrite, `/legal/confidentialite` — reste à déployer |
| URL d'assistance | **bloquant** | écrite, `/legal/assistance` — reste à déployer |
| URL marketing | facultatif | — |

Ces deux URLs sont des blocages durs : App Store Connect refuse la soumission sans la politique de
confidentialité, et Play exige en plus une URL de **suppression de compte** accessible hors de
l'app — la seule des trois qui reste à écrire. Les pages légales sont dans
`apps/admin/public/legal/` ; il ne reste qu'à choisir le domaine et à déployer.
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
Les questions que personne ne pose. Les réponses que tout le monde veut.
```
72 caractères — la baseline (§0), telle quelle.

C'est le champ où elle sert le mieux : Play affiche le titre et la description courte **collés**,
et le titre porte déjà le mécanisme (« question du jour »). Le mécanisme dit ce que l'app fait, la
baseline dit pourquoi on l'ouvre — les deux lignes ne se répètent pas.

Variantes :

| Variante | Car. |
|---|---|
| `Les questions que personne ne pose. Les réponses que tout le monde veut.` | 72 |
| `Une question par jour, de celles que personne ne pose. Et sa réponse.` | 69 |
| `Une question par jour. Ta réponse dans la stat, et celles de tes potes.` | 71 |
| `1 question par jour, entre potes. Sans feed, sans likes, sans pub.` | 66 |

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

Quatre captures, dans cet ordre, chacune avec sa légende incrustée en deux niveaux : **un titre en
capitales**, qui est ce qui se lit dans la vignette, et **une ligne dessous**, qui dit le mécanisme.
La capture, elle, prouve.

| # | Écran | Titre incrusté | Ligne sous le titre |
|---|---|---|---|
| 1 | La question du jour, plein écran, une option sélectionnée sur le second tap | **UNE QUESTION QUE PERSONNE N'OSE POSER.** | Tous les matins. Deux taps pour être honnête. |
| 2 | Le résultat : « Comme 10% des gens, tu es un.e BORDÉLIQUE » | **LA STAT QUI DIT QUI TU ES.** | Chaque réponse te donne ta StatOwrel. Rare ou banal, c'est écrit. |
| 3 | Les réponses des amis sous la carte de récap | **TES POTES VONT TE SURPRENDRE.** | Vois ce qu'ils ont vraiment répondu. Sujet de conversation garanti. |
| 4 | L'écran Stats : série, compteurs, calendrier, et le bouton de proposition en bas | **DEVIENS CELUI QUI POSE LES QUESTIONS.** | Enchaîne les réponses. Débloque le droit de poser la question du jour. |

**La 1 et la 2 sont les seules que la plupart des gens verront** — l'App Store en affiche trois dans
les résultats de recherche, Play une seule — donc chacune doit tenir seule, sans la précédente.

**Les quatre titres racontent une montée**, et c'est l'ordre qui la porte : on te pose la question →
tu découvres qui tu es → tu découvres qui ils sont → c'est toi qui poses la question. Ne pas
réordonner les captures sans refaire les titres.

**Ces légendes ne sont pas la baseline et ne la remplacent pas.** La capture 1 en est la déclinaison
au singulier — la baseline parle du produit, la capture parle de la journée — ce qui les rend
cohérentes sans les rendre redondantes. La baseline reste sur la bannière Play (§3.2) et en tête des
deux descriptions (§1.4), où elle continue de ne jamais se reformuler (§6).

**Les trois premiers titres sont aussi ceux du carousel d'accueil** de l'app
(`apps/app/src/onboarding/copy.ts`) : la phrase qui a fait installer l'app est la phrase qui accueille
à l'ouverture. Changer l'une, c'est changer l'autre.

> ⚠️ **La capture 4 décrit une fonctionnalité que la 1.0 ne livre pas.** L'écran Stats montre bien le
> bouton et sa condition (« Valide d'abord une série de 30 j »), mais le formulaire de proposition
> n'existe pas : un examinateur qui atteint 30 jours ne trouverait rien derrière. C'est exactement le
> cas que la règle en tête de ce document interdit (guideline 2.3.1). **Deux options** :
> - **Publier la capture 4 en même temps que la fonctionnalité** (`docs/production-checklist.md` §1.4),
>   et sortir à trois captures d'ici là — trois suffisent aux deux stores.
> - **Ou la remplacer par sa variante de repli**, qui décrit la même capture d'écran sans rien
>   promettre : **TA SÉRIE NE TIENT QU'À TOI.** / *Un jour raté, elle repart à zéro. Pas de joker.*

#### Si l'on veut monter à six captures

Deux compléments, dans le même ton, à placer en 5 et 6 — jamais avant, ce sont des captures de
confirmation, pas de conversion :

| # | Écran | Titre incrusté | Ligne sous le titre |
|---|---|---|---|
| 5 | La carte de récap avec les pourcentages par option | **VRAIMENT, TOUT LE MONDE FAIT ÇA ?** | Le détail, option par option. Une fois que tu as joué. |
| 6 | Le calendrier du mois, cases cochées | **TA COLLECTION DE JOURNÉES.** | Chaque jour répondu devient une case. Même ceux d'avant toi. |

### 3.2 Formats exigés

| Store | Ce qu'il faut | Note |
|---|---|---|
| App Store | 6,9" (1290×2796) et 6,5" (1242×2688) | Apple décline les autres tailles depuis la 6,9" ; fournir les deux reste le plus sûr |
| App Store | Icône 1024×1024, sans transparence, sans coins arrondis | `apps/app/assets/icon.png` est la source |
| Play | 2 captures minimum, 8 maximum, min. 1080 px sur le petit côté | Mêmes visuels et mêmes légendes que iOS (§3.1) |
| Play | Icône 512×512 PNG 32 bits | |
| Play | **Bannière 1024×500** | Obligatoire, et souvent oubliée : la fiche est refusée sans elle |

L'étoile de `assets/splash-icon.png` sur le jaune de marque (`#ffdc59`), la baseline (§0) sous
elle : la bannière s'écrit toute seule. Elle est rognée différemment selon les surfaces de Play —
garder le texte loin des bords et centré verticalement.

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

4. **La baseline ne se reformule pas.** C'est le seul texte de la fiche qui doit être identique au
   caractère près partout où il apparaît (§0). Une phrase de marque qui varie d'un support à
   l'autre n'est plus une phrase de marque.

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
| Proposition de questions | `PROPOSE TES QUESTIONS` / `Une meilleure idée ? Propose-la. Validée par la modération, elle peut tomber un matin pour tout le monde, avec ton nom crédité dessous.` — **et la capture 4 de §3.1**, aujourd'hui à remplacer par sa variante de repli | Checklist §1.4 |
| Lien et code d'invitation | Remplacer `On ajoute un pote en tapant son nom d'utilisateur exact` par `On ajoute un pote par lien, par code à 6 caractères, ou en tapant son nom d'utilisateur exact.` | Checklist §1.5 |
| Rappel de 21h | `Un rappel le soir si tu as oublié — désactivable.` | Checklist §1.1 |

Le texte promotionnel (§1.3) se met à jour **sans soumission** : c'est là qu'une nouveauté
s'annonce le jour même. La description, elle, attend la version suivante.
