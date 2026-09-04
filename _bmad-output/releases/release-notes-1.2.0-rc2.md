# StatOwrel 1.2.0-rc2 — notes de version

| Champ | Valeur |
|---|---|
| Version | **1.2.0-rc2** (`version` applicative : `1.2.0` dans `apps/app/package.json` et `apps/app/app.config.ts` — **déjà bumpée par la rc1**, rien à changer) |
| Build iOS | *non attribué* — la rc précède le build TestFlight ; `eas.json` auto-incrémente (`appVersionSource: remote`) |
| Build Android | *non attribué* — idem |
| Date | 2026-09-04 |
| Nature | **pre-release** — deuxième rc de la 1.2.0 |
| Version précédente | **1.2.0-rc1**, taggée le 2026-09-04 sur `82f9234` — `release-notes-1.2.0-rc1.md` |
| Dernière version publiée | **1.1.0** (builds iOS 10 / Android 9) |
| Fiche store | **français (France) uniquement** (`docs/store-listing.md`) ; la section anglaise ci-dessous est une réserve, à ne pas publier |

Cette note est un **complément à `release-notes-1.2.0-rc1.md`**, qui reste la note de référence pour
tout ce que la 1.2.0 apporte depuis la 1.1.0 — le joker, les StatFlouzz, la dotation de bienvenue,
l'en-tête redessiné et Firebase Analytics. La rc2 ajoute deux choses, et une seule est dans le
binaire.

> ✅ **La rc2 débloque la soumission Android.** La rc1 n'aurait pas pu être uploadée sur la Play
> Console : Firebase Analytics tirait la permission `AD_ID` dans l'AAB, en contradiction directe
> avec la déclaration « n'utilise pas l'identifiant publicitaire ». Google refuse l'upload sur
> cette contradiction, et le refus arrive **au moment de l'upload**, pas à l'examen — c'est-à-dire
> après le build. Corrigé par `b28902c`.

> 🔴 **Le bloquant du consentement RGPD / CNIL n'a pas bougé.** Firebase Analytics collecte toujours
> dès le premier lancement, sans mécanisme de recueil du consentement. Voir
> `release-notes-1.2.0-rc1.md` § « Bloquants » et `docs/production-checklist.md` §6. Rien dans cette
> rc ne le referme.

---

## Ce qui change depuis la rc1

### Dans le binaire

| # | Changement | Effet sur la soumission |
|---|---|---|
| 1 | **`AD_ID` retirée du manifeste Android** (`b28902c`) — `android.blockedPermissions`, qu'Expo traduit en `tools:node="remove"` sur l'élément `uses-permission` | **Débloque l'upload sur la Play Console.** Aucune perte fonctionnelle : `google_analytics_adid_collection_enabled: false` empêchait déjà la lecture de l'AdID ; c'est la permission qui mentait, pas la déclaration |

C'est un changement **natif** : il prend un build, jamais une mise à jour OTA. Un AAB produit avant
`b28902c` porte encore la permission et sera refusé.

### Hors binaire — le site

| # | Changement | Conséquence |
|---|---|---|
| 2 | **La page de présentation devient une vraie page marketing** (`481fc14`) — `apps/admin/index.html` reconstruite autour du carrousel d'onboarding : son texte, ses visuels portés en HTML/CSS (carte StatOwrel inclinée, avatars superposés), une bande « comment ça marche » en trois temps, et les boutons App Store / Google Play dans le héros et dans le CTA de fin | `npm run deploy:admin:production` — **ce qui contredit la rc1**, dont la checklist disait « rien à déployer côté console » |
| 3 | **Section « On te prévient » retirée** (`2cc4243`) — demander la permission de notification est une étape du premier lancement, pas une raison de télécharger. Emporte sa maquette de cloche et le `--radius-2xl` devenu inutile, ce qui ramène la page aux **quatre sections** que son propre chapô annonce | Idem, même déploiement |
| 4 | **Métadonnées OpenGraph / Twitter et URL canonique** (`481fc14`) — un lien partagé ne s'affiche plus nu | Idem, même déploiement |
| 5 | **Repli `prefers-reduced-motion`** sur les maquettes inclinées (`481fc14`) | Accessibilité, hors store |

Toujours **un seul fichier statique** avec sa propre copie des tokens : aucun bundle, servi par le
catch-all de Hosting. La console de modération reste sous `/admin/` et n'a pas bougé.

### Effets de bord à ne pas manquer

- **Les deux boutons de store pointent des fiches qui n'existent pas encore.**
  `apps.apple.com/fr/app/statowrel/id6803561031` et le listing Play `fr.quentinmachard.statowrel`
  répondent 404 tant que l'app n'est pas publiée. Déployer la page avant la publication met deux
  liens morts en évidence, dans le héros et dans le CTA de fin — à trancher : déployer après la
  mise en ligne, ou masquer les boutons d'ici là.
- **Il n'y a pas d'`og:image`.** `twitter:card` est `summary`, ce qui est cohérent, mais un lien
  partagé n'affiche aucun visuel. Une image de partage est le genre de manque qui ne se voit qu'une
  fois le lien posté.
- **`AD_ID` n'est pas une case à retourner dans la Play Console.** La déclaration « n'utilise pas
  l'identifiant publicitaire » est la moitié vraie : elle est cohérente avec
  `docs/store-listing.md` §1.11, `docs/privacy-policy.md` §3.8 et `docs/analytics.md` §7. Faire
  passer un build en cochant l'inverse rendrait fausses trois déclarations pour en sauver une.

---

## Français

### Texte promotionnel — 170 caractères max

**Inchangé depuis la rc1.** Aucune des deux nouveautés de cette rc n'est visible d'un utilisateur.

**Option 1 — la baseline** (166 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Une par jour, la même pour tous : tu réponds, tu découvres ta stat, puis celles de tes potes.
```

**Option 2 — le joker** (149 caractères)

```
Les questions que personne ne pose. Les réponses que tout le monde veut. Une journée sans envie ? Passe-la avec un joker : ta série tient quand même.
```

**Option 3 — la boucle** (153 caractères)

```
Une question par jour à 7h. Ta série monte, elle te paie en StatFlouzz. Dépense-les pour poser ta question — ou pour passer un jour sans casser ta série.
```

### Nouveautés de cette version — 4000 caractères max

**Inchangées depuis la rc1.** Les deux textes A et B de `release-notes-1.2.0-rc1.md` sont à reprendre
tels quels : la permission `AD_ID` et la page marketing n'ont rien à faire dans un texte de store.

> ⚠️ **Ne pas ajouter une ligne « Et aussi » sur la correction Android.** Retirer une permission que
> l'utilisateur n'a jamais vue apparaître ne se raconte pas — et l'annoncer attirerait l'attention
> sur une permission publicitaire dans une app qui n'en a pas.

### Description complète — 4000 caractères max

**Inchangée depuis la rc1** (3 490 caractères) — voir `release-notes-1.2.0-rc1.md`. La correction
obligatoire reste celle du bloc `TA SÉRIE`, qui disait « pas de joker ».

Champs courts, inchangés depuis `docs/store-listing.md` :

| Champ | Valeur | Car. |
|---|---|---|
| Nom de l'app (iOS) / Titre (Play) | `StatOwrel — question du jour` | 28 |
| Sous-titre (iOS, 30) | `1 question/jour entre potes` | 27 |
| Description courte (Play, 80) | `Les questions que personne ne pose. Les réponses que tout le monde veut.` | 72 |

---

## English

**Réserve — à ne pas publier.** Inchangé depuis la rc1 — voir `release-notes-1.2.0-rc1.md`
§ English pour le Promotional Text et les deux What's New.

---

## Notes pour le reviewer Apple

**Inchangées depuis la rc1** — voir `release-notes-1.2.0-rc1.md` § « Notes pour le reviewer Apple »,
à reprendre intégralement. Rien dans cette rc ne change le parcours, les permissions, la monnaie
interne, le joker ni la mesure d'usage.

Un seul point à garder en tête pour le côté Android : la déclaration de la Play Console reste
**« l'app n'utilise pas d'identifiant publicitaire »**. C'est ce que le binaire dit désormais aussi.

> ⚠️ Rappel des deux champs à compléter avant soumission : les identifiants du compte de
> démonstration, et le fait que ce compte doit porter **au moins 120 StatFlouzz** (100 pour la
> proposition, 20 pour un joker).

---

## Plan de test QA interne

Le plan complet de la 1.2.0 est dans `release-notes-1.2.0-rc1.md` — joker, dotation de bienvenue,
StatFlouzz, en-tête, Analytics, backend, émulateurs, régression. **Il est à repasser en entier sur
les builds tirés de cette rc**, le changement `AD_ID` étant natif.

### Delta de la rc2 — à passer en priorité

**Permission `AD_ID`** (`b28902c`)

- [ ] `npx expo prebuild --platform android` : le manifeste généré porte bien
      `com.google.android.gms.permission.AD_ID` avec `tools:node="remove"` sous le namespace `tools`
- [ ] Sur l'AAB produit par EAS, la permission **n'apparaît pas** dans le manifeste final
      (`bundletool dump manifest`, ou l'onglet des permissions de la Play Console après upload)
- [ ] **L'upload sur la piste interne Play passe** — c'est le seul test qui compte vraiment, et il
      ne peut se faire qu'avec un vrai AAB
- [ ] La déclaration de la Play Console est restée sur « n'utilise pas l'identifiant publicitaire »
- [ ] Firebase Analytics remonte toujours dans DebugView **après** le blocage de la permission — la
      mesure ne dépend pas de l'AdID, il faut le vérifier plutôt que le supposer
- [ ] iOS non affecté : aucun changement de manifeste, aucun appel à `AppTrackingTransparency`

**Page marketing** (`481fc14`)

- [ ] `npm run deploy:admin:production` passé, puis la racine du site en navigation privée
- [ ] Les **quatre** sections annoncées par le chapô s'affichent, visuels compris (carte StatOwrel
      inclinée, avatars superposés) — et **plus** de section « On te prévient » ni de cloche
- [ ] La bande « comment ça marche » en trois temps est lisible sur mobile étroit
- [ ] Les boutons App Store et Google Play sont présents dans le héros **et** dans le CTA de fin —
      et **on a tranché ce qu'ils font tant que les fiches n'existent pas**
- [ ] `prefers-reduced-motion` : les maquettes inclinées se posent à plat, rien ne bouge
- [ ] Un lien partagé (Slack, iMessage, WhatsApp) affiche bien titre et description — et **on a
      constaté l'absence de visuel**, faute d'`og:image`
- [ ] `/admin/` ouvre toujours la console de modération, et le catch-all sert bien la page marketing
      sur toute autre URL
- [ ] Les cinq pages légales répondent toujours : `/legal/cgu`, `/legal/mentions-legales`,
      `/legal/confidentialite`, `/legal/assistance`, `/legal/protection-des-enfants`

---

## Mots-clés

**Inchangés depuis la 1.0.0.** FR (94 caractères) et EN de réserve (91 caractères) — voir
`release-notes-1.2.0-rc1.md` § Mots-clés.

---

## Checklist publication

Reprend celle de la rc1, avec un bloquant en moins et un déploiement en plus.

### Bloquants store encore ouverts

- [ ] 🔴 **Consentement RGPD / CNIL pour Firebase Analytics** — *inchangé*. Livrer le bandeau + le
      drapeau persisté + le gate autour de `setEnabled(bool)`, **ou** contraindre la release
      production à ne rien envoyer. `docs/production-checklist.md` §6
- [ ] 🔴 **Déclarations de collecte de données à re-répondre dans les deux consoles** — *inchangé*.
      « Diagnostics / analyse d'usage » passe de **Non** à **Oui** ; « identifiant publicitaire »
      reste **Non**, et le binaire le dit enfin aussi
- [x] ~~🔴 Upload Play refusé sur la permission `AD_ID`~~ — **corrigé par `b28902c`**
- [ ] **Signalement dans l'app** — guideline 1.2, `docs/production-checklist.md` §2.3. Inchangé,
      toujours le seul bloquant dur côté code produit
- [ ] **La fiche en ligne dit « pas de joker »** — à corriger dans les deux stores en même temps que
      la mise à jour
- [ ] **Les deux boutons de store de la page marketing pointent des fiches inexistantes** —
      *nouveau*. Déployer après la publication, ou masquer les boutons d'ici là
- [ ] **SHA-1 de la clé de signature Play enregistré dans Firebase**, et vérifié avec
      `npm run check-google-signin`
- [ ] Page web de demande de suppression de compte (exigée par Play, hors de l'app)
- [ ] URLs de confidentialité, de support et des normes de sécurité des enfants renseignées dans les
      deux consoles
- [ ] Compte de démonstration créé sur la production, avec **au moins 120 StatFlouzz**
- [ ] Capability « Sign in with Apple » activée sur l'App ID `fr.quentinmachard.statowrel`
- [ ] Relecture juridique des cinq pages légales, politique de confidentialité §3.8 comprise

### Acquis dans le code à cette rc

- [x] **`AD_ID` bloquée dans le manifeste Android** — le binaire dit ce que la fiche déclare
      *(nouveau en rc2)*
- [x] **Page marketing** à la racine du site, avec métadonnées de partage *(nouveau en rc2)*
- [x] Tout l'acquis de la rc1 — joker, dotation de 50§, StatFlouzz, solde dans l'en-tête, bouton de
      proposition explicatif, Firebase Analytics, `is_joker` refusé aux clients

### Déploiements que cette version exige — dans cet ordre

L'ordre de la rc1 est inchangé pour le backend ; l'étape console cesse d'être vide.

1. - [ ] `npm run deploy:firestore:production` — **les règles d'abord** :
        `startsWithInitialBalance()` et `hasAnswerShape()`
2. - [ ] `npm run deploy:functions:production` — `questions-useJoker`, `users-onUserCreated`,
        `onAnswerCreated` branché sur `is_joker`
3. - [ ] `npm run backfill-initial-balance -- --production` (après un `--dry-run`)
4. - [ ] `npm run deploy:admin:production` — **plus vide qu'en rc1** : la page marketing. À caler
        selon ce qu'on décide des boutons de store
5. - [ ] Trancher le **bloquant consentement**
6. - [ ] Re-répondre les **deux déclarations de collecte de données**
7. - [ ] Seulement ensuite : `npm run build:prod:ios` / `build:prod:android`, puis `submit:prod` —
        et **un AAB antérieur à `b28902c` est à jeter**, il porte encore `AD_ID`

### Infrastructure, contenu, visuels

**Inchangés depuis la rc1** — voir `release-notes-1.2.0-rc1.md`. Rappel du point le plus coûteux :
les captures de l'écran d'accueil sont **périmées**, l'en-tête ayant changé et la carte « Deviens
acteur de StatOwrel » n'existant plus.

Un point s'ajoute :

- [ ] **Image de partage (`og:image`)** pour la page marketing — 1200×630, aux couleurs de la
      marque. Sans elle, tout lien partagé reste une vignette de texte

### Recette

- [ ] Plan de test QA de la rc1 **repassé en entier** — le changement de manifeste impose de
      nouveaux binaires des deux côtés
- [ ] Delta de la rc2 ci-dessus passé
- [ ] **Upload réel sur la piste interne Play** — le seul endroit où le correctif `AD_ID` se prouve
- [ ] TestFlight interne : au moins une semaine d'usage quotidien réel, dont un jour joué au joker
