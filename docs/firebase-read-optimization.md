# StatOwrel — Audit des lectures Firestore

Ce document recense **toutes** les lectures de documents Firestore du dépôt — app mobile, console
d'admin, Cloud Functions — chiffre ce qu'elles coûteront à grande échelle, et propose les
optimisations qui réduisent la facture sans changer le produit.

Écrit à partir du code réellement présent. Chaque constat pointe le fichier et la ligne.

> **Révision** — relu contre `main` après le passage à React Native Firebase, le badge des potes et
> le passage de la question du jour en lecture unique. #2, #4 et #6a sont corrigés ; #3 l'est à
> moitié. Deux constats s'ajoutent : le fan-out d'écritures du badge dans la transaction de réponse
> (#13) et le handle de l'auteur relu à chaque ouverture du jour (#14). Le correctif de #5 est
> réécrit : la dénormalisation qu'il proposait existe désormais, il n'y a plus qu'à la lire.

## Modèle de coût utilisé

Firestore facture **par document renvoyé**, jamais par requête. Trois conséquences qui structurent
tout ce qui suit :

- Un `onSnapshot` facture 1 lecture par document du snapshot initial, puis 1 lecture par document
  **modifié** ensuite. Un écran ouvert pendant qu'un compteur bouge paie chaque mouvement.
- Grouper N `getDoc` en une requête `in` ne fait **pas** baisser la facture (mêmes N documents) —
  ça ne gagne que de la latence. Le seul levier sur le nombre de lectures est le cache et la
  dénormalisation.
- Les `get()` écrits **dans `firestore.rules`** sont facturés comme des lectures.

Le projet déploie en `europe-west1` (`apps/functions/src/libs/firebase-admin.ts:163`), donc
tarification régionale : **0,036 $ / 100 k lectures** (≈ 0,36 $ le million), 0,108 $ / 100 k
écritures, 0,012 $ / 100 k suppressions. Quota gratuit : 50 k lectures et 20 k écritures par jour.
Si la base a été créée en multi-région (`eur3`), multiplier par ~1,7 — à vérifier dans la console,
l'emplacement n'est pas dans le dépôt.

### Hypothèses du chiffrage

Un scénario unique sert de référence dans tout le document :

| Paramètre | Valeur |
|---|---|
| Utilisateurs actifs / jour | 100 000 |
| Ouvertures d'app / utilisateur / jour | 3 |
| Amis acceptés en moyenne | 20 |
| Taux de réponse quotidien | 50 % (50 000 réponses) |
| Appareils enregistrés | ~1 par utilisateur |

Ce sont des ordres de grandeur, pas des mesures : personne n'a encore instrumenté la production.
Ils servent à **classer** les problèmes, pas à prédire une facture au centime.

### Le cache disque du SDK : ce qu'il donne, ce qu'il ne donne pas

> Cette section a été réécrite après le passage de l'app à **React Native Firebase** (`aae045b`).
> Elle disait auparavant qu'il n'y avait « pas de cache disque côté app », le SDK JS n'ayant de
> persistance que via IndexedDB, indisponible en React Native. Ce n'est plus vrai, et plusieurs
> recommandations ci-dessous en dépendaient.

`apps/app/src/lib/firebase.ts` s'appuie désormais sur les SDK **natifs**, dont la persistance
Firestore est **activée par défaut** et **durable d'un lancement à l'autre** (il faudrait un
`initializeFirestore(app, { persistence: false })` explicite pour la couper ; le dépôt n'en a pas).

Ce que ça change réellement, et il faut être précis, parce que la conclusion intuitive est fausse :

- **Ça ne supprime aucune lecture facturée sur un `getDoc`.** Un `getDoc` part sur
  `Source.DEFAULT` : serveur d'abord, cache seulement en repli quand le réseau manque. Tous les
  `getDoc` recensés ci-dessous sont donc toujours facturés, exactement comme avant la migration.
- **Ça rend `Source.CACHE` disponible**, et c'est le vrai levier : sur un document **immuable**, une
  lecture `getDocFromCache` ne coûte rien et survit au relancement. C'est ce que fait
  `getFrozenDoc` (`apps/app/src/lib/firestore.ts`), avec deux garde-fous — un défaut de cache
  retombe sur le serveur, et une **absence** en cache n'est jamais crue (un ami qui n'avait pas
  encore répondu, un jour pas encore tiré).
- **Ça rend un `onSnapshot` réétabli moins cher**, le SDK repartant d'un resume token plutôt que
  d'un snapshot initial complet — au moins tant que la déconnexion est courte. Les chiffres des
  postes à listener (#1, #6a, #12) sont donc des majorants depuis la migration ; ils n'ont pas été
  remesurés.
- **Ça ne s'applique pas à un document qui bouge** : un profil `v1_users` (#2, avant que la lecture
  ne soit supprimée), un mois de calendrier de
  l'utilisateur (#3), le compteur `answer_counts` (#6). Pour ceux-là, un cache écrit à la main avec
  sa propre politique de fraîcheur reste la seule réponse.

Autrement dit : un store module comme `calendarCache` **n'est pas
rendu inutile par la migration** — il dédoublonne les lectures d'une même session, ce que le
cache disque ne fait pas. La migration ajoute une couche *sous* lui, pour les seuls documents figés.

---

## Synthèse

Coût quotidien estimé au scénario de référence, avant / après.

| # | Poste | Lectures/jour (avant) | Après | Gravité |
|---|---|---:|---:|---|
| 1 | Liste d'amis — 3 abonnements concurrents | 13 200 000 | 2 000 000 | 🔴 |
| 2 | Avatars des amis — lecture de profil par ami | 6 000 000 | 0 | ✅ *fait* |
| 3 | Calendrier — rechargement forcé à chaque focus | 1 800 000 | 200 000 | 🔴 *(moitié faite)* |
| 4 | Réponses des amis — aucun cache entre ouvertures | 2 000 000 | 700 000 | ✅ *fait* |
| 5 | Nudge 18:00 — 1 requête par répondeur | 1 050 000 | 150 000 | 🔴 |
| 6 | `onSnapshot` sur la question du jour | 500 000 – 100 M | 300 000 | ✅ *fait (6a)* · 🔴 *(6b)* |
| 7 | Enregistrement device à chaque lancement | 300 000 (+300 k écritures) | ~10 000 | 🟠 |
| 8 | `readArchiveStart()` à chaque session | 300 000 | 0 | 🟡 |
| 9 | `syncUserProfile` doublonne l'abonnement profil | 300 000 | 0 | 🟡 |
| 10 | Mois de la question relu par l'écran du jour | 200 000 | 0 | 🟡 |
| 11 | Fan-out push — collection group entière ×2 | 200 000 | 200 000 | 🟠 (latence) |
| 12 | Console d'admin — tout le pot, sans filtre | variable | variable | ⚪ |
| 13 | Badge des potes — fan-out d'écritures dans la transaction de réponse | 1 000 000 (+1 M écritures) | 1 000 000 | 🔴 *(nouveau)* |
| 14 | Handle de l'auteur relu à chaque ouverture du jour | 150 000 | ~5 000 | 🟡 *(nouveau)* |

**Total ≈ 25 M lectures/jour → ~5 M** — de l'ordre de **270 $/mois → 55 $/mois**, et surtout deux
murs de scalabilité levés (#5 et #6) qui cassent avant de coûter cher.

Légende : 🔴 bloquant à 100 k utilisateurs · 🟠 à traiter avant d'ouvrir les vannes · 🟡 gain facile
· ⚪ après le lancement · ✅ corrigé.

Les chiffres sont ceux d'avant le passage à React Native Firebase et n'ont pas été remesurés depuis.
Les postes à `onSnapshot` (#1, #6a, #12) sont désormais des **majorants** — voir la section sur le
cache disque du SDK ci-dessus.

---

## 1. 🔴 La liste d'amis est abonnée trois fois en parallèle

**Où** — `apps/app/src/friends/data/useFriends.ts:70`

`useFriends()` ouvre son propre `onSnapshot` sur `v1_users/{uid}/v1_user_friends` **à chaque
montage**. Or le hook est monté depuis trois endroits :

- `InvitationsCard` (`apps/app/src/friends/components/InvitationsCard.tsx:58`) — sur l'écran Stats,
  qui est la racine de l'app, donc monté en permanence ;
- `FriendsCard` (`apps/app/src/friends/components/FriendsCard.tsx:89`) — écran Menu ;
- `useFriendAnswers` (`apps/app/src/daily-question/data/useFriendAnswers.ts:67`) — écran du jour.

Ouvrir la question du jour depuis les Stats donne donc **deux abonnements simultanés sur la même
collection**, chacun facturant son snapshot initial complet. Ouvrir le Menu en donne un troisième.

**Coût** — 20 documents × ~2,2 montages × 3 sessions × 100 000 = **13,2 M lectures/jour**, soit le
premier poste du dépôt.

**Correctif** — sortir l'abonnement du hook et le mettre dans un store module, sur le modèle exact
de `calendarCache.ts` : une souscription unique, partagée par tous les consommateurs via
`useSyncExternalStore`, avec un compteur de références qui ferme le listener quand plus personne
n'écoute. Un provider React monté dans `App.tsx` ferait aussi l'affaire, mais le store module est
plus proche de ce que le dépôt fait déjà ailleurs.

En complément : persister le dernier snapshot dans `AsyncStorage` et le rendre en attendant le
premier snapshot serveur. La liste d'amis change très rarement — l'affichage instantané est un
bonus, l'économie vient surtout du fait qu'on n'a plus besoin d'un listener pour les écrans qui ne
font que lire (`InvitationsCard` peut se contenter du cache jusqu'au montage du Menu).

**Gain** — 13,2 M → ~6 M avec la déduplication seule, ~2 M avec le cache disque.

---

## 2. ✅ Les avatars des amis étaient relus à chaque lancement

**Où** — `apps/app/src/friends/data/useFriendAvatars.ts` *(supprimé)*

Une lecture de profil (`v1_users/{friend_id}`) par ami, mise en cache dans une `Map` **au niveau
module** — donc perdue à chaque fermeture de l'app. Vingt amis = 20 lectures au premier affichage
de la liste, à chaque lancement.

**Coût** — 20 × 3 sessions × 100 000 = **6 M lectures/jour**.

**Correctif** — **Fait**, et plus radicalement que le cache `AsyncStorage` + TTL envisagé ici : la
lecture est **supprimée**. Le produit n'a pas encore de système de photo de profil — le visage d'un
ami est l'avatar DiceBear généré depuis son handle (`src/lib/avatars.ts`), et `friend_username` est
déjà porté par la moitié d'amitié. `useFriendAvatars` lisait donc un `photo_url` par ami pour un
étage d'`Avatar` que rien n'alimente vraiment ; le hook est supprimé et les lignes d'amis rendent
l'avatar généré directement. Dans la foulée, `photo_url` a été **retiré du modèle `v1_users`**
lui-même : l'écran Menu affiche la photo du provider en la lisant directement sur Firebase Auth
(`user.photoURL`), sans miroir Firestore — plus rien à synchroniser dans `syncUserProfile` non
plus.

Le jour où un vrai système de photo de profil arrive, la suite est déjà décidée : **dénormaliser
`photo_url` sur `v1_user_friends`**, écrit par le backend (callable d'invitation + fan-out sur
changement de photo) comme `friend_username` l'est déjà — jamais une lecture de profil par ami.

**Gain** — 6 M → **0**.

---

## 3. 🔴 Le calendrier est rechargé de force à chaque retour sur l'écran

**Où** — `apps/app/src/stats/data/useStatsData.ts` (`useFocusEffect`, appel `latestReload.current(true)`)

`calendarCache` est bien conçu — deux documents par mois, une lecture partagée, invalidation sur
réponse. Mais le `useFocusEffect` appelle `reload(true)`, et `force: true`
(`apps/app/src/stats/data/calendarCache.ts:134`) court-circuite à la fois le cache **et** le
marqueur `stale`. Chaque retour sur l'écran Stats relit donc 2 documents, 4 quand un mois passé est
affiché — même si rien n'a pu changer entre-temps.

Une session avec 4 aller-retours Stats ↔ question ↔ Menu coûte 8 à 16 lectures.

**Coût** — ~6 lectures × 3 sessions × 100 000 = **1,8 M lectures/jour**.

**Correctif** — trois choses, indépendantes :

1. **Ne plus forcer au focus.** Relire seulement si (a) le mois est `stale`, (b) la date locale a
   changé depuis la dernière lecture, ou (c) la dernière lecture date de plus de N minutes. Garder
   `force: true` pour le seul *pull to refresh*, qui est le geste explicite de l'utilisateur.
2. ~~**Persister `v1_daily_question_months/{YYYY-MM}` sur disque.**~~ **Fait.** Ce document est
   **global** — le même pour tous les utilisateurs — et n'est écrit qu'une fois par jour, à 07:00,
   par le planificateur (`scheduleDailyQuestion.ts`). Un mois passé est donc **immuable**, et
   `calendarCache.ts` le lit maintenant par `getFrozenDoc` : le cache disque du SDK le sert, sans
   `AsyncStorage` ni sérialisation à écrire. Le mois courant reste un `getDoc` — il gagne un jour à
   chaque tirage, y compris un tombé pendant que l'app dormait.
3. **Persister `v1_users/{uid}/v1_user_calendar_months/{YYYY-MM}` sur disque.** Ce document ne bouge
   que quand *cet* utilisateur répond, ce que l'app sait déjà (`invalidateCalendarMonth`). Un mois
   passé est immuable dès lors que la journée est close, sauf réponse en retard — que l'utilisateur
   fait lui-même, donc détectable localement.

**Gain** — 1,8 M → ~0,2 M lectures/jour. La moitié figée est acquise ; il reste (1) et (3), c'est-à-dire
le focus qui force et la persistance du mois de l'utilisateur — qui ne peut pas être un
`getFrozenDoc`, un mois personnel bougeant sur une réponse en retard et sur `friend_answer_counts`.

---

## 4. 🟠 Les réponses des amis n'ont aucun cache entre deux ouvertures

**Où** — `apps/app/src/daily-question/data/useFriendAnswers.ts:91`

Un `getDoc` par ami accepté sur
`v1_questions/{question_id}/v1_daily_question_answers/{friend_id}`, refait **intégralement** à
chaque ouverture de la feuille de résultat. Le produit permet explicitement de rouvrir le résultat
d'un jour à volonté (PRD §5.5), donc ce coût est payé plusieurs fois par jour.

**Coût** — 20 lectures × ~1 ouverture × 100 000 = **2 M lectures/jour**, davantage si le résultat
est rouvert.

**Correctif** —

- ~~Mettre en cache par `(questionId, friendId)`.~~ **Fait.** **Une réponse d'ami déjà lue est
  immuable** : les règles refusent toute mise à jour d'une réponse (`firestore.rules`), donc un ami
  trouvé comme ayant répondu ne sera jamais relu. `useFriendAnswers` lit désormais par
  `getFrozenDoc`, dont c'est exactement le contrat — un document existant sort du cache disque, une
  absence repart au serveur. Seuls les amis encore silencieux sont donc relus, et rouvrir un jour
  passé converge vers zéro lecture sans qu'aucune date n'ait à être testée.

À noter : regrouper les N `getDoc` en une requête `where(documentId(), 'in', […])` (plafonnée à 30)
ne changerait **rien** à la facture — Firestore facture les documents renvoyés. Ça n'améliorerait
que la latence. Le levier ici est bien le cache.

**Gain** — 2 M → ~0,7 M lectures/jour (les amis qui n'avaient pas encore répondu).

---

## 5. 🔴 Le nudge de 18:00 fait une requête par répondeur — et va casser avant de coûter cher

**Où** — `apps/functions/src/domains/daily-questions/helpers/friendsAnswers.ts:67`

`friendsAnswersDigest` lit toutes les réponses du jour (A documents), puis lance **une requête par
répondeur** pour récupérer ses amis acceptés (A requêtes renvoyant ~F documents chacune), par lots
de 20 en parallèle.

**Coût** — 50 000 + (50 000 × 20) = **1,05 M lectures/jour**, soit ~11 $/mois. Le problème n'est pas
là.

**Le vrai problème est la latence.** 50 000 requêtes séquencées par lots de 20 font ~2 500
aller-retours Firestore. À ~50 ms l'aller-retour, la fonction met **plus de deux minutes** — alors
que `notifyFriendsAnswers` (`tasks/notifyFriendsAnswers.ts:102`) ne fixe aucun `timeoutSeconds` et
tourne donc sur le défaut de 60 s des fonctions v2. Le nudge de 18:00 **échouera par timeout** bien
avant, autour de 10 à 20 k répondeurs — et ses 3 tentatives Cloud Tasks échoueront de la même façon,
en refacturant le coût à chaque essai.

**Correctif** — *réécrit : la donnée qu'il fallait dénormaliser existe désormais.*

> Ce paragraphe proposait initialement de maintenir un index `accepted_ids: string[]` par
> utilisateur, et écartait l'alternative « push » — le trigger de réponse incrémentant un compteur
> chez chacun des F amis — au motif qu'elle coûte F écritures par réponse. Cette alternative a été
> implémentée depuis, pour le badge du calendrier (#13). Le nudge ne l'utilise pas encore, et paie
> donc les deux : la dénormalisation *et* le recalcul.

Le trigger de réponse écrit maintenant `friend_answer_counts.{DD}` dans le mois de calendrier de
chaque ami accepté (`onAnswerCreated.ts`). Le mois d'un utilisateur porte donc déjà, pour chaque
jour, **les deux valeurs dont le nudge a besoin** :

- `days.{DD}` présent ⇒ cet utilisateur a répondu (l'ensemble `answered`) ;
- `friend_answer_counts.{DD}` ⇒ combien de ses potes ont répondu (la `Map` `friendsAnswered`).

Le digest se réduit alors à **une lecture par utilisateur destinataire** de
`v1_users/{uid}/v1_user_calendar_months/{YYYY-MM}` — les mêmes UID que `sendPushToUsers` obtient
déjà en lisant les appareils, récupérés par `getAll()` du SDK admin (facturé au document, mais un
seul RPC par lot de ~500). Le balayage des réponses du jour et la requête d'amis par répondeur
disparaissent tous les deux.

- Lectures : 1,05 M → **~100 k/jour** (une par destinataire, plus rien qui dépende de F).
- Aller-retours : ~2 500 → **~200**. Le timeout disparaît.
- Prix à payer : **aucun** — ni modèle ni écriture supplémentaires, la donnée est déjà écrite.

Cas limites à vérifier à l'implémentation : un utilisateur sans document de mois (il n'a rien
répondu et aucun pote n'a répondu) lit comme absent, donc « pas répondu, 0 pote » — ce qui est la
bonne ligne (« Ne perds pas ta série… »). Et une réponse de rattrapage sur un jour passé incrémente
le compteur de ce jour-là, pas celui du jour courant, donc elle ne pollue pas le nudge du soir.

L'index `accepted_ids` reste la bonne réponse si le fan-out de #13 est retiré au profit d'un
recalcul — les deux corrections sont exclusives, il ne faut pas les faire toutes les deux.

**Étape suivante, quand 100 k sera dépassé** — découper le fan-out en tâches Cloud Tasks paginées
(une tâche par tranche de N utilisateurs) plutôt qu'une seule fonction qui tient tout en mémoire.
Le même découpage règle #11.

---

## 6. 🔴 L'abonnement à la question du jour est quadratique — et le compteur est un point chaud

**Où** — `apps/app/src/daily-question/data/useDailyQuestion.ts:181` (`onSnapshot` sur
`v1_questions/{id}`)

Deux problèmes distincts, sur le même document.

### 6a. Le coût de lecture

Chaque réponse écrite par **n'importe qui** incrémente `answer_counts` sur le document de la
question (`triggers/steps/onAnswerCreated.ts`). Chaque incrément pousse un snapshot à **tous** les
écrans abonnés, facturé 1 lecture chacun. Le coût est le produit `viewers × answers`, pas leur
somme.

Avec 5 000 écrans ouverts pendant la ruée de 07:05–07:20 et 50 000 réponses dans la journée, le pire
cas théorique est de l'ordre de 10⁸ lectures. Firestore regroupe les rafales, ce qui ramène le
réalisme vers ~1 snapshot/seconde/listener — soit tout de même quelques millions de lectures par
jour, pour une information dont personne n'a besoin à la seconde.

### 6b. La contention en écriture

Firestore tient environ **1 écriture soutenue par seconde et par document**. `answer_counts` reçoit
un incrément par réponse de toute la base : 50 000 réponses concentrées sur quelques heures, c'est
5 à 10 écritures/seconde sur un seul document. Au-delà, les transactions du trigger entrent en
contention, réessaient, et finissent par échouer — ce qui fait perdre non seulement le compteur mais
aussi la projection calendrier et la série, écrites dans la même transaction.

**C'est un mur produit avant d'être un mur de coût**, et il arrive bien avant 100 k utilisateurs.

**Et la transaction s'est allongée depuis.** Elle porte maintenant, en plus, une requête sur les
amis acceptés et jusqu'à 400 écritures de fan-out (#13). Plus une transaction tient longtemps ses
verrous, plus la fenêtre de collision sur le document chaud est large — les deux problèmes se
multiplient au lieu de s'additionner. Sortir `answer_counts` du document que tout le monde lit est
donc plus urgent qu'à la rédaction de ce paragraphe, pas moins.

**Correctif, en deux temps**

1. ✅ **Fait** — l'abonnement est remplacé par un `getDoc` porté par `useFocusEffect` : la question
   est lue à chaque ouverture du jour et à chaque retour dessus, et à ces moments-là seulement.
   Répondre ne la relit pas : ça ne rattraperait que les réponses tombées entre l'ouverture du jour
   et le tap — quelques secondes pour qui arrive par la notification — au prix d'une lecture et
   d'un second aller-retour tenus devant le seul écran qu'on ne doit pas faire attendre. La
   bascule de la feuille vers le résultat ne passe plus par Firestore du tout : `answerStore`
   tenait déjà la réponse de la session pour l'écran Stats, la feuille la relit de là — mais elle
   n'a lieu qu'une fois la relecture de la réponse rentrée (`resultSettled`), sans quoi les
   pourcentages bougeraient sous les yeux de celui qui vient de répondre, de la réponse même qu'il
   vient d'écrire. L'animation de confirmation couvre ce battement et sa fin sert d'échéance. Et
   l'abonnement à sa propre réponse est devenu un `getFrozenDoc` — aucun client ne réécrit une
   réponse, donc un jour déjà ouvert sur cet appareil ne coûte plus rien à rouvrir, le marqueur
   ci-dessous étant la seule écriture qu'elle reçoive et la condition pour croire un exemplaire en
   cache.

   **Le décompte de sa propre réponse.** Le trigger étant asynchrone, le tally en main
   ne contient pas encore la réponse qui vient d'être écrite, et rien ne
   vient plus la corriger puisqu'il n'y a plus d'abonnement. Le trigger stampe
   donc `counted_at` sur la réponse **dans la transaction même qui incrémente**
   — le marqueur n'existait que pour la démo, il est généralisé — et l'écran
   lit la question d'abord, sa réponse ensuite : un marqueur absent sur une
   lecture *chaînée à ce tally* prouve que le tally a été pris sans cette
   réponse, et la carte l'ajoute elle-même. La preuve ne marche que dans un
   sens — une lecture appartenant à un tally plus ancien, une réponse d'une
   session antérieure, un marqueur déjà posé se lisent tous « comptée » — donc
   le décompte peut retarder d'une réponse le temps d'un aller-retour, jamais
   compter deux fois la même.

   L'alternative envisagée, comparer `answered_at` à un `updated_at` du tally, a
   été écartée : `answered_at` est écrit par le téléphone et les rules ne
   l'épinglent pas à `request.time` — un appareil en avance se serait ajouté en
   permanence. Coût du marqueur : 1 écriture par réponse (≈ 0,05 $/jour au
   scénario de référence) et 1 lecture dans la seule session qui vient de
   répondre. En contrepartie la réponse cesse d'être immuable, donc
   `getFrozenDoc` ne croit un exemplaire en cache que s'il porte son marqueur.

   **Ce qui a été écarté, et pourquoi.** Geler le document à la clôture — la fin du §6b « naturelle »,
   qui rendrait toute l'archive lisible depuis le cache disque à zéro lecture — suppose qu'une
   réponse tardive ne compte plus dans les parts. Arbitrage produit : **elle compte**, les stats
   d'un jour bougent tant qu'on peut y répondre. Il n'existe donc aucun instant où le document est
   figé, et la seule chose que le produit demande est la fraîcheur **à l'ouverture**, pas le temps
   réel — ce que le correctif ci-dessus donne exactement, pour 1 lecture par ouverture au lieu d'une
   lecture par réponse de toute l'app.
2. **Structurel** — sortir l'agrégat du document que tout le monde lit. Soit un **compteur
   distribué** (`v1_questions/{id}/v1_answer_count_shards/{0..9}`, incrément sur un shard tiré au
   hasard, somme à la lecture — 10 lectures au lieu d'1, mais 10× le débit d'écriture), soit un
   document de lecture séparé `v1_daily_question_stats/{question_id}` recalculé périodiquement.

Les requêtes d'agrégation `count()` (facturées 1 lecture par tranche de 1 000 entrées d'index)
sembleraient idéales pour recalculer le total, mais une par option et par lecteur reviendrait plus
cher que le compteur : les réserver à un recalcul planifié, pas au chemin d'affichage.

---

## 7. 🟠 Chaque lancement relit et réécrit le document d'appareil

**Où** — `apps/app/src/notifications/data/deviceRegistration.ts` (`registerDeviceForPush`)

À chaque lancement d'une session connectée : un `getDoc` — uniquement pour récupérer `created_at` et
ne pas le réestamper — suivi d'un `setDoc` complet.

**Coût** — 3 × 100 000 = 300 k lectures **et 300 k écritures** par jour. Les écritures coûtant 3×
les lectures, c'est le poste où l'écriture domine : ~0,32 $/jour, ~10 $/mois, pour ne rien changer
dans 99 % des cas.

**Correctif** — mémoriser dans `AsyncStorage` le triplet `(uid, token, date du dernier écrit)` et
sauter entièrement l'aller-retour Firestore si le token et l'uid n'ont pas bougé et que l'écriture
date de moins de 24 h. Le document doit rester frais pour que `updated_at` serve à purger les
appareils morts — une fois par jour suffit largement.

**Gain** — 300 k → ~10 k lectures/jour, et autant d'écritures.

---

## 8. 🟡 `readArchiveStart()` relit à chaque session une valeur qui ne bouge jamais

**Où** — `apps/app/src/stats/data/useStatsData.ts:34`

Une requête `orderBy('month')` + `limit(1)` sur `v1_daily_question_months` pour trouver le premier
mois publié — la borne basse de l'archive. Le commentaire dit « une lecture, une fois par session ».
C'est exact, et c'est déjà trop : ce mois ne changera **plus jamais** une fois la première question
diffusée.

**Coût** — 3 × 100 000 = 300 k lectures/jour.

**Correctif** — le mettre en cache dans `AsyncStorage` sans expiration (au pire, revalider une fois
par mois). Encore plus simple : c'est une constante du produit — la date de lancement — qui peut
vivre dans `@statowrel/models` au même titre que `DEMO_QUESTION_ID`, et retomber sur la lecture
seulement si elle est absente.

**Surtout pas `getDocsFromCache` ici**, malgré l'immuabilité : c'est une *requête*
(`orderBy('month')` + `limit(1)`), et le cache disque n'en contient que les documents que cet
appareil a déjà lus. Il rendrait le plus ancien mois **connu de l'appareil**, pas le plus ancien
mois publié — une borne d'archive fausse, et fausse silencieusement. La règle générale :
`Source.CACHE` sur un document dont on connaît l'identité, jamais sur une requête dont la
complétude est l'information cherchée.

**Gain** — 300 k → 0.

---

## 9. 🟡 `syncUserProfile` refait la lecture que `AuthContext` a déjà abonnée

**Où** — `apps/app/src/auth/profile.ts:47` et `apps/app/src/auth/AuthContext.tsx:77`

`onAuthStateChanged` appelle `syncUserProfile(user)`, qui fait un `getDoc` sur `v1_users/{uid}` pour
décider s'il y a quelque chose à resynchroniser. Le même document est, deux lignes plus bas, la
cible d'un `onSnapshot` permanent dans le même contexte.

**Coût** — 1 lecture inutile par lancement : 300 k/jour.

**Correctif** — déclencher la synchro depuis le **premier snapshot** de l'abonnement plutôt que
depuis `onAuthStateChanged` : le profil est déjà en main, la comparaison avec Auth est purement
locale, et il ne reste que l'`updateDoc` quand quelque chose diffère réellement.

**Gain** — 300 k → 0.

---

## 10. 🟡 L'écran du jour relit un mois que `calendarCache` détient déjà

**Où** — `apps/app/src/daily-question/data/useDailyQuestion.ts:150`

`useDailyQuestion` fait son propre `getDoc` sur `v1_daily_question_months/{YYYY-MM}` pour résoudre
quelle question a tourné ce jour-là. C'est exactement le document que l'écran Stats vient de lire et
qu'il garde dans `calendarCache` — la navigation vers la question du jour se fait *depuis* cet
écran.

**Coût** — ~200 k lectures/jour, entièrement redondantes.

**Correctif** — router cette lecture par `calendarCache.loadCalendarMonth` / `readCalendarMonth`, ce
qui la rend gratuite dans le cas nominal et la partage avec le correctif #3.

**Gain** — 200 k → 0.

---

## 11. 🟠 Le fan-out push lit toute la collection group, deux fois par jour

**Où** — `apps/functions/src/domains/notifications/helpers/deviceTokens.ts:82`

`listRegisteredDevices()` lit `v1_user_devices` en collection group, intégralement, à 07:00 puis à
18:00.

**Coût** — 200 k lectures/jour, soit ~2 $/mois. Négligeable en argent.

**Le mur est ailleurs** : tout est tenu en mémoire (100 k × ~300 octets ≈ 30 Mo, acceptable ; 1 M
d'utilisateurs, beaucoup moins), et surtout `sendExpoPushMessages`
(`notifications/helpers/expoPush.ts:121`) poste les lots de 100 messages **séquentiellement**. 100 k
appareils = 1 000 requêtes HTTP à la file, ce qui dépasse le timeout de 60 s de la même façon que
#5.

**Correctif** — découper le fan-out en tâches Cloud Tasks : le planificateur pagine
`v1_user_devices` par tranches (curseur `startAfter`) et enfile une tâche par tranche de ~5 000
appareils. Chaque tâche lit sa tranche, envoie ses lots, et réessaie indépendamment — ce qui rend
aussi les reprises beaucoup moins chères qu'aujourd'hui, où un échec en fin de fan-out refait tout
le travail.

Le nombre de lectures ne baisse pas (il est irréductible : un push par appareil suppose de connaître
chaque appareil), mais la fonction cesse d'être une bombe à retardement.

---

## 12. ⚪ La console d'admin lit tout le pot, en direct, sans filtre

**Où** — `apps/admin/src/questions/data/useQuestions.ts:32`

`onSnapshot` sur `v1_questions` entier, trié par `created_at`, sans `limit`. La collection ne
décroît jamais — une question `used` y reste pour toujours — donc le coût d'un chargement de page
croît linéairement avec l'âge du produit.

**Coût** — faible aujourd'hui (peu d'admins), mais à 50 k questions accumulées c'est 50 k lectures
par ouverture d'onglet.

**Correctif** — filtrer par `status` (la modération ne s'intéresse qu'aux `pending`), paginer avec
`limit` + `startAfter`, et ne garder l'abonnement en direct que sur la page courante.

---

## 13. 🔴 Le badge des potes met un fan-out d'écritures dans la transaction de réponse

*Nouveau — apparu avec le badge du calendrier (docs/prd.md §5.2), postérieur à la première
rédaction de ce document.*

**Où** — `apps/functions/src/domains/daily-questions/triggers/steps/onAnswerCreated.ts` (le bloc
`countedFriendIds.forEach`), et `apps/functions/src/domains/daily-questions/helpers/friendsAnswers.ts`
(`acceptedFriendsQuery`)

À chaque réponse, la transaction du trigger lit la liste des amis acceptés de l'auteur, puis écrit
`friend_answer_counts.{DD}` dans le mois de calendrier de **chacun** d'eux — plafonnée à 400 amis
pour ne pas dépasser les 500 écritures d'une transaction.

Le choix est bon sur le fond, et il faut le dire clairement : compter côté client coûterait une
lecture par ami et par jour affiché, contre la lecture unique que le mois coûte aujourd'hui — les
règles n'autorisant à lire les réponses d'un ami qu'une question à la fois. Le badge n'était pas
gratuitement finançable autrement. Ce qui pose problème, c'est **où** ces écritures sont faites.

**Coût** — à 50 000 réponses et 20 amis : ~1 M lectures **et ~1 M écritures** par jour, soit
~43 $/mois (les écritures coûtant 3× les lectures, elles dominent). C'est de l'argent, pas un mur.

**Le mur est la contention.** La transaction touche désormais 1 + 3 + F documents, dont deux
catégories chaudes :

- Le document de la question, qui reçoit un incrément par réponse de toute la base (#6b).
- Les mois de calendrier des amis — et une amitié étant réciproque, deux potes qui répondent en même
  temps écrivent chacun dans le document que l'autre est en train de lire-écrire. En pleine ruée du
  matin, avec 20 amis, la probabilité qu'au moins un document de la transaction soit en conflit
  n'est plus marginale. Firestore réessaie, puis abandonne — et un abandon ici ne perd pas qu'un
  badge : la projection calendrier, la série et `answer_counts` sont dans la même transaction.

**Correctif** — sortir le fan-out de la transaction, sans le supprimer.

1. La transaction garde ce qui doit être atomique et ce dont dépend l'app : la projection du jour,
   les compteurs, l'incrément `answer_counts` et son marqueur `counted_at` — ce dernier couple étant
   explicitement indissociable (`useDailyQuestion` en dépend pour savoir si le tally qu'il tient
   porte déjà la réponse qui vient d'être écrite).
2. Le fan-out part **après**, en `BulkWriter` ou en lots de 500, et seulement sur l'exécution qui a
   réellement créé l'entrée de calendrier — l'idempotence est déjà portée par ce marqueur, donc une
   relivraison du trigger ne recompte rien.
3. Le prix à payer, à assumer explicitement : un crash entre la transaction et le fan-out perd le
   badge de cette réponse-là, définitivement (la relivraison abandonnera sur le marqueur). C'est un
   compteur d'affichage, contre le risque actuel de perdre une série. Le bon sens du compromis.

**Étape suivante** — si le badge devient chaud à son tour (des groupes d'amis très larges), le
sortir du mois de calendrier vers un document par jour et par utilisateur, ou l'agréger dans le même
mouvement que #5.

---

## 14. 🟡 Le handle de l'auteur est relu à chaque ouverture du jour

*Nouveau — la lecture existait déjà, elle n'était pas relevée.*

**Où** — `apps/app/src/daily-question/data/useDailyQuestion.ts` (`readAuthorName`)

Un `getDoc` sur `v1_users/{author_id}` pour la ligne de crédit de docs/prd.md §5.4. L'effet est
keyé sur `authorId`, mais l'état vit dans le composant : chaque navigation vers l'écran du jour le
remonte et refait la lecture. C'est exactement la forme qu'avait le problème des avatars (#2), à un
document par jour ouvert au lieu d'un par ami.

**Coût** — ~150 k lectures/jour au scénario de référence.

**Correctif** — un cache module keyé par UID, comme celui que `useFriendAvatars` avait, sans son
défaut : lu une fois par auteur et par lancement au lieu d'une fois par montage. Un `getFrozenDoc`
ne convient pas ici — un profil n'est pas figé, même si un handle ne bouge en pratique jamais.

La vraie réponse, le jour où les questions proposées par les utilisateurs existeront pour de bon
(docs/prd.md §4.7), est de porter `author_username` sur `v1_questions` au tirage — la console
d'admin fait la même lecture de son côté (`apps/admin/src/questions/data/useQuestionAuthors.ts`) et
en profiterait. Comme pour `friend_username` sur l'amitié, la copie se backfille côté backend.

---

## Ce qui est déjà bien fait

Autant le dire, pour ne pas défaire ce qui va :

- **`calendarCache`** (`apps/app/src/stats/data/calendarCache.ts`) — deux documents par mois au lieu
  d'une lecture par jour répondu, déduplication des requêtes en vol, store externe partagé entre
  écrans. C'est le bon modèle ; il manque juste un focus moins agressif et la persistance du mois de
  l'utilisateur (#3). **La persistance native de React Native Firebase ne le remplace pas** : elle ne
  dédoublonne rien à l'intérieur d'une session, et un `getDoc` reste facturé. Elle lui donne en
  revanche sa moitié gratuite, le mois global passé, par `getFrozenDoc`.
- **`getFrozenDoc`** (`apps/app/src/lib/firestore.ts`) — la lecture `Source.CACHE` des seuls
  documents figés, avec repli serveur au défaut de cache et refus de croire une absence en cache.
  Les deux collections qui y ont droit aujourd'hui : `v1_daily_question_months` d'un mois passé, et
  une entrée de `v1_daily_question_answers`.
- **Les modèles de lecture mensuels** — `v1_daily_question_months` et `v1_user_calendar_months`
  évitent le pattern « une lecture par jour affiché », qui aurait été le premier poste du dépôt.
- **L'identité des documents** — une réponse a pour id l'UID de son auteur, une amitié a pour id
  l'UID de l'autre, un appareil a pour id son token. « A-t-il déjà répondu ? », « sont-ils déjà
  amis ? » sont des lectures de document, jamais des requêtes.
- **La double moitié d'amitié** — écrite dès l'invitation, elle évite toute requête collection group
  sur les amis des autres, que les règles refuseraient de toute façon.
- **`friend_username` porté sur l'amitié** — une liste de N amis coûte 1 lecture, pas N lectures de
  profil. C'est aussi ce qui rend les avatars gratuits depuis #2 : le visage d'un ami est généré
  depuis ce handle-là.
- **`sendPushToUser`** — sous-collection plutôt que collection group filtrée : coûte les documents
  renvoyés et aucun index.
- **Les `get()` dans les règles** — le commentaire de `firestore.rules:135` note qu'une règle coûte
  un `get()` quel que soit le nombre de champs vérifiés, et le code en tire les conséquences. Le coût
  résiduel (1 lecture facturée par création de réponse, de profil, de moitié d'amitié) est
  proportionnel aux écritures et minimal.

---

## Ordre d'attaque suggéré

**Avant d'ouvrir les vannes** — les deux murs de scalabilité, qui cassent le produit et pas
seulement la facture :

1. ~~#6a — abonnement question → lecture unique.~~ *Fait.*
2. **#13 — sortir le fan-out du badge de la transaction de réponse.** Le plus urgent des trois
   restants : c'est celui qui peut faire échouer une série, et il aggrave #6b.
3. #6b — compteur `answer_counts` shardé ou déporté hors du document que tout le monde lit.
4. #5 — nudge de 18:00 : lire les mois de calendrier des destinataires plutôt que recalculer.
   Le correctif a été réécrit — la donnée est déjà là depuis #13, il n'y a plus rien à
   dénormaliser.
5. #11 — fan-out push paginé en Cloud Tasks.

**Ensuite, par ratio gain/effort** — tout est côté app et sans risque produit :

6. #1 — abonnement unique à la liste d'amis.
7. ~~#2 — cache disque des avatars.~~ *Fait — la lecture de profil par ami est supprimée, l'avatar
   est généré depuis le handle porté par l'amitié.*
8. #3 — calendrier : ne plus forcer au focus *(la moitié globale est faite : `getFrozenDoc` sur les
   mois passés)*. Le mois de l'utilisateur ne peut pas être figé — le badge #13 l'écrit depuis
   l'extérieur — donc c'est la politique de focus qui porte tout le gain restant.
9. #8, #9, #10, #14 — quatre lectures redondantes, quelques lignes chacune.
10. #7 — enregistrement d'appareil au plus une fois par jour.
11. ~~#4 — cache des réponses d'amis.~~ *Fait — `getFrozenDoc`.*

**Après le lancement** : #12.

## Avant tout ça : mesurer

Rien ici n'a été mesuré en production. Deux choses à mettre en place en parallèle du premier
correctif, sans quoi on optimisera à l'aveugle :

- Activer **Cloud Monitoring** sur `firestore.googleapis.com/document/read_count` avec une ventilation
  par collection, et poser une alerte de budget.
- Faire une passe **Firebase Performance / journalisation** sur une session type de l'app pour
  compter les lectures réelles par ouverture — le modèle ci-dessus suppose 3 sessions et 20 amis, et
  la vraie distribution décidera de l'ordre d'attaque mieux que ce document.
