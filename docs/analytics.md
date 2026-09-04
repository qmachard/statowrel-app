# Plan de taggage StatOwrel

Ce document est la **source unique** du taggage produit de l'app mobile. Chaque
ligne du tableau ci-dessous mappe 1:1 à une variante de `AnalyticsEvent` dans
`apps/app/src/analytics/events.ts`. Un diff qui ajoute un événement à l'un sans
l'autre est un diff incomplet.

---

## 1. Stack

- **SDK** : `@react-native-firebase/analytics` v26.3.2 (Firebase Analytics, alias GA4).
- **Backend** : Google Analytics 4, projet Firebase `statowrel-app` (dev et prod
  partagent le même projet — voir `.firebaserc` et `apps/app/CLAUDE.md`
  § Environments).
- **Configuration native** : `apps/app/firebase.json` — voir §7.
- **Wrapper** : `apps/app/src/analytics/analytics.ts`. Les écrans n'importent
  **jamais** `@react-native-firebase/analytics` directement.

---

## 2. Modèle de consentement

**Opt-out silencieux, activé par défaut.**

- Aucune donnée personnelle (pseudo, e-mail, texte libre) n'est envoyée.
- Aucun identifiant publicitaire n'est collecté (`google_analytics_adid_collection_enabled: false`).
- Aucun partage avec un courtier ni recoupement avec des données tierces à des
  fins publicitaires.
- Finalité produit stricte : mesurer l'usage réel du parcours, orienter les
  itérations, détecter les régressions de conversion.

Le toggle « Statistiques d'usage » du Menu (`AnalyticsOptOutRow`) permet à
n'importe qui de couper la collecte sur son téléphone. La bascule appelle
`setAnalyticsCollectionEnabled(false)` — plus rien n'est envoyé, y compris ce
que le SDK collecterait de lui-même (`app_open`, `first_open`).

Ce modèle est adapté à la portée fonctionnelle actuelle. Le jour où l'app
intègre un SDK publicitaire, un SDK de recoupement, ou partage avec un tiers,
il faut passer à **opt-in explicite** — voir `docs/production-checklist.md` §6.

---

## 3. Environnements & filtres

Le SDK n'envoie **rien** en `__DEV__` sauf si `EXPO_PUBLIC_ANALYTICS_FORCE_ENABLED=true`
est défini dans `.env.local`. C'est ce qui empêche les sessions Metro de polluer
DebugView avec de la donnée bidon.

Un build `preview` et un build `production` envoient tous les deux vers le
même projet Firebase (aujourd'hui il n'y en a qu'un). Le jour où les projets
sont séparés (`docs/production-checklist.md` §3.1), il n'y a rien à changer côté
app — la config native lit `google-services.json` / `GoogleService-Info.plist`
et un build reste tributaire du fichier bundlé.

---

## 4. Identité

- `setUserId(uid)` : l'UID Firebase Auth du user courant, poussé par
  `useAnalyticsIdentity` à chaque changement de session.
- `setUserId(null)` : appelé à la déconnexion. GA4 continue à agréger sur
  l'instance device, mais sans lier au user précédent.
- **Aucune** autre valeur poussée en User-ID : pas d'e-mail, pas de handle, pas
  d'IDFA.

---

## 5. User properties

| Propriété           | Valeurs possibles                          | Quand                                                                 |
|---------------------|--------------------------------------------|-----------------------------------------------------------------------|
| `session_state`     | `anonymous` \| `authenticated`             | À chaque changement du user Firebase Auth                             |
| `streak_bucket`     | `0` \| `1-6` \| `7-29` \| `30+`             | À chaque changement du profil `v1_users/{uid}.streak_count`           |
| `analytics_consent` | `opt_in` \| `opt_out`                      | À la résolution du flag opt-out et à chaque bascule du toggle Menu   |

`streak_bucket` est intentionnellement une bucket : GA4 plafonne à 25 valeurs
uniques par user property et une série peut dépasser 100 jours.

Toute nouvelle user property doit :
1. être ajoutée à `AnalyticsUserProperties` dans `apps/app/src/analytics/events.ts` ;
2. être documentée dans le tableau ci-dessus ;
3. ne contenir aucune PII.

---

## 6. Événements (tagging plan)

Chaque événement est envoyé via `track({ name, params })` — cf.
`apps/app/src/analytics/events.ts`. Les noms sont `snake_case`, verbe à la voix
utilisateur.

### 6.1 Screen views

**Événement GA4 réservé** : `screen_view` — un par changement de route, câblé
via `NavigationContainer.onStateChange` → `useScreenTracking()` →
`analytics.setScreen(route.name)`.

Le paramètre `screen_name` reprend la clé de `RootStackParamList` :

| Route            | `screen_name`     | Sens produit                                          |
|------------------|-------------------|-------------------------------------------------------|
| SignIn           | `SignIn`          | Écran de connexion                                    |
| SignUp           | `SignUp`          | Écran d'inscription                                   |
| ForgotPassword   | `ForgotPassword`  | Demande de reset password                              |
| Stats            | `Stats`           | Écran racine — streak, calendrier, wallet             |
| DailyQuestion    | `DailyQuestion`   | Sheet de la question du jour (ou d'un jour passé)     |
| InviteFriend     | `InviteFriend`    | Sheet d'invitation d'un pote                          |
| ProposeQuestion  | `ProposeQuestion` | Modal de proposition d'une question                    |
| Menu             | `Menu`            | Menu (compte, potes, mes questions, réglages)         |

Le report automatique du SDK est **désactivé**
(`google_analytics_automatic_screen_reporting_enabled: false`) parce qu'il
étiquette toutes les screens d'un native stack avec `RNSScreenStackHostController`.

### 6.2 Événements custom

| Événement                     | Paramètre           | Type      | Déclencheur (code)                                              | Sens produit                                                    |
|-------------------------------|---------------------|-----------|-----------------------------------------------------------------|-----------------------------------------------------------------|
| `sign_up_completed`            | `method`            | enum      | `providers.ts` — `additionalUserInfo.isNewUser === true`         | Création de compte réussie                                       |
|                                |                     |           |                                                                 | Valeurs `method` : `google` \| `apple` \| `password`             |
| `sign_in_completed`            | `method`            | enum      | `providers.ts` — credential accepté, user pas nouveau            | Retour d'un user connu                                           |
| `sign_out`                     | —                   | —         | `providers.ts.signOut()` — avant `firebaseSignOut`               | Déconnexion volontaire (avant que l'UID ne soit clear)          |
| `answer_submitted`             | `question_id`       | ULID      | `submitAnswer.ts` — après `setDoc` réussi                        | La Nord Star. Une réponse validée à la question du jour.        |
|                                | `option_id`         | ULID      |                                                                 |                                                                 |
|                                | `late`              | boolean   |                                                                 | `true` si la réponse est passée après `closes_at`                |
| `joker_used`                   | `question_id`       | ULID      | `spendJoker.ts` — après callable réussie                          | Un joker dépensé sur une question. Docs/prd.md §4.8              |
| `question_proposed`            | `options_count`     | int (2-6) | `proposeQuestion.ts` — après callable réussie                     | Proposition de question payée. Docs/prd.md §4.7                  |
| `friend_invited`               | `outcome`           | enum      | `inviteFriend.ts` — succès ou échec                              | Une invitation d'ami tentée (résultat inclus, pour le funnel)   |
|                                |                     |           |                                                                 | Valeurs : `sent` \| `not_found` \| `already_friends` \| `pending` \| `blocked` \| `error` |
| `friend_invitation_accepted`   | —                   | —         | `friendships.ts.acceptFriendship()` — après batch commit         | Acceptation d'une invitation reçue                               |

### 6.3 Événements réservés pour plus tard

Non instrumentés dans la PR d'introduction — à ouvrir en tickets follow-up
séparés selon les KPIs qu'on décide de piloter :

- `push_permission_requested` / `push_permission_granted` / `push_permission_denied`
- `push_notification_opened` (avec `type: 'daily_question' | 'friend_invitation'`)
- `onboarding_slide_viewed` (avec `slide_index`)
- `onboarding_completed`
- `demo_answer_submitted`
- `streak_milestone_reached` (avec `milestone: 10 | 20 | 30 ...`)
- `friend_invitation_declined` / `friend_removed`
- `account_deleted`

Chacun demande une petite décision produit avant d'être poussé (pertinence,
verbosité du flux). Le wrapper les accepte sans changement — il suffit
d'ajouter la variante au type union et une ligne au tableau ci-dessus.

---

## 7. Configuration native

`apps/app/firebase.json` — lu par React Native Firebase au build.

```json
{
  "react-native": {
    "analytics_auto_collection_enabled": true,
    "analytics_default_allow_ad_personalization_signals": false,
    "analytics_default_allow_ad_user_data": false,
    "google_analytics_adid_collection_enabled": false,
    "google_analytics_ssaid_collection_enabled": false,
    "google_analytics_automatic_screen_reporting_enabled": false
  }
}
```

- **`analytics_auto_collection_enabled: true`** — le SDK démarre en collecte,
  et le wrapper coupe via `setAnalyticsCollectionEnabled(false)` quand le user
  a opté out. Un `false` ici couperait tout, y compris pour les users opt-in.
- **`analytics_default_allow_ad_*: false`** — signaux GA4 Consent Mode :
  personnalisation pub et Google Signals interdits par défaut. Rien ne les
  ré-active côté app.
- **`google_analytics_adid_collection_enabled: false`** — pas d'IDFA (iOS) ni
  d'AdID (Android). C'est ce qui autorise `App Tracking Transparency: non`
  dans `docs/store-listing.md` §1.11.
- **`google_analytics_ssaid_collection_enabled: false`** — pas de Android SSAID.
- **`google_analytics_automatic_screen_reporting_enabled: false`** — voir §6.1.

Changer ces valeurs demande un **rebuild du dev client** — elles sont lues
natif, pas par le JS bundle.

`app.config.ts` liste `RNFBAnalytics` dans `forceStaticLinking` iOS, pour
rester cohérent avec `RNFBApp` / `RNFBAuth` / `RNFBFirestore` / `RNFBFunctions`
(voir le commentaire de `expo-build-properties` dans ce fichier).

---

## 8. QA & validation

**Avant chaque release**, valider dans Firebase Console → Analytics → DebugView
que les 8 événements custom + `screen_view` remontent bien depuis un dev client
(`EXPO_PUBLIC_ANALYTICS_FORCE_ENABLED=true` dans `.env.local`).

Activation DebugView selon plateforme :

- **iOS** — `xcrun simctl launch --console <UDID> fr.quentinmachard.statowrel.dev -FIRDebugEnabled`
  sur un simulateur, ou l'argument de lancement `-FIRDebugEnabled` dans le
  scheme Xcode sur un device.
- **Android** — `adb shell setprop debug.firebase.analytics.app fr.quentinmachard.statowrel.dev`.

Checklist de recette :
- [ ] `screen_view` remonte à chaque changement de route (nom = clé de `RootStackParamList`).
- [ ] `sign_up_completed` / `sign_in_completed` distingue correctement `isNewUser`.
- [ ] `answer_submitted` porte `question_id`, `option_id`, `late`.
- [ ] `joker_used` fire une seule fois par joker.
- [ ] `question_proposed` porte `options_count` cohérent avec le formulaire.
- [ ] `friend_invited` fire avec `outcome: not_found` sur un handle inexistant.
- [ ] `friend_invitation_accepted` fire chez les deux users après acceptation.
- [ ] Toggle Menu OFF : plus aucun événement ne remonte.
- [ ] Toggle Menu ON : la collecte reprend au prochain événement.
- [ ] `setUserId` est bien l'UID Firebase Auth, jamais un handle ni un e-mail.

---

## 9. Gouvernance

- **Ajout d'un événement** : modifier `events.ts`, ajouter une ligne au §6.2,
  brancher `track({...})` au bon endroit du code. Le typage TypeScript refuse
  un event dont le nom n'est pas dans l'union.
- **Retrait d'un événement** : retirer la ligne du tableau, retirer la variante
  du type union, retirer les appels. GA4 conserve l'historique.
- **Renommage** : GA4 traite un renommage comme deux événements distincts.
  Éviter — préférer déprécier + créer un nouveau nom.
- **Modification de paramètres** : idem. Un nouveau paramètre n'invalide pas
  l'historique, un changement de sémantique sur un nom existant si.

---

## 10. Références

- `apps/app/src/analytics/analytics.ts` — le wrapper unique.
- `apps/app/src/analytics/events.ts` — types + naming.
- `apps/app/src/analytics/preferences.ts` — opt-out.
- `apps/app/src/analytics/useAnalyticsIdentity.ts` — identité + user properties.
- `apps/app/src/analytics/useScreenTracking.ts` — screen tracking.
- `apps/app/firebase.json` — configuration native Firebase.
- `docs/store-listing.md` §1.11 — déclaration de confidentialité stores.
- `docs/privacy-policy.md` § Statistiques d'usage — politique de confidentialité.
- `docs/production-checklist.md` §6 — checklist observabilité.
