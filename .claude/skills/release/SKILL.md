---
name: release
description: Crée une release ou pre-release CheckPack — note de version App Store (FR/EN), commit, tag, GitHub release au format projet. Utiliser quand l'utilisateur dit "créé une release X.Y.Z", "release notes", "tag X.Y.Z", "pre-release X.Y.Z-rcN".
---

# Skill — CheckPack Release

Crée une release (ou pre-release) CheckPack de bout en bout :
1. Bump de la version applicative dans `package.json` + `app.config.ts`
2. Note de version App Store dans `_bmad-output/releases/release-notes-<version>.md` (FR + EN + reviewer + QA)
3. Commit `🔖 Release <version>` poussé sur `main`
4. Tag annoté poussé
5. Release GitHub avec changelog structuré par epic

## Inputs

- **Version** (obligatoire) — ex : `3.3.0`, `3.4.0-rc1`
- **Date** — par défaut, aujourd'hui (ISO `YYYY-MM-DD`)
- **Build iOS** — Obligatoire pour les releases finales (`X.Y.Z`), optionnel pour les pre-releases (`X.Y.Z-rcN`).
  - Si l'utilisateur l'a explicitement fourni dans la commande (ex : `/release 3.4.0-rc3 build 61`), l'inclure dans les notes et la release GitHub.
  - Sinon, pour les releases finales, le demander via `AskUserQuestion`.
  - Sinon, pour les rc sans build fourni, l'omettre — la rc précède alors le build TestFlight.

### Détection rc vs finale

Une version est une **pre-release** si elle contient `-rc`, `-beta`, `-alpha`. Sinon c'est une **release finale**.

## Étape 0 — Collecter le contexte

Toujours faire ces lectures avant de proposer un draft :

```bash
git tag --list | tail -10                          # versions précédentes
git log --oneline <previous-tag>..HEAD             # commits depuis la dernière release
git log --format='%s' <previous-tag>..HEAD         # tous les sujets pour grouper par epic
cat package.json | grep version                    # version courante
grep version: app.config.ts                        # version iOS
```

**Build number** :
- Si l'utilisateur l'a fourni dans la commande (ex : `build 61`), l'utiliser tel quel — ne pas redemander.
- Sinon, pour une release finale, demander :

```
AskUserQuestion : "Quel est le numéro de build iOS pour cette release ?"
```

- Sinon, pour une rc, omettre.

Pour référence, le dernier build connu peut être récupéré via :
```bash
gh release view <previous-final-tag> | grep -i build
```
ou en relisant `_bmad-output/releases/release-notes-<previous-final-version>.md`.

**Ne jamais** inférer ou incrémenter automatiquement le build — toujours le demander.

Identifie les épics impliqués via les préfixes `Story XX.Y` dans les commits, puis lis `docs/epics.md` pour récupérer les titres exacts.

**Cold start** : si la note de version App Store existe déjà (`_bmad-output/releases/release-notes-<version>.md`), saute l'étape 2. Vérifie quand même l'étape 1 — le bump de version n'est jamais optionnel — puis reprends à l'étape 3, ou directement à l'étape 4 si le tag est déjà poussé.

## Étape 1 — Bump de la version applicative

**Obligatoire, à faire avant d'écrire la note.** Deux fichiers, une seule source de vérité :

```bash
grep '"version"' package.json      # doit valoir <version-sans-suffixe>
grep 'version:' app.config.ts      # idem
```

- La valeur écrite est la version **sans suffixe rc** : `3.5.1-rc2` → `"3.5.1"`. Expo et l'App Store n'acceptent pas les suffixes pré-release dans `version` ; c'est le build number qui distingue les itérations d'une même version.
- Une rc bumpe donc déjà vers la version cible finale. Si `package.json` porte déjà la bonne valeur (cas d'une rc2+ après une rc1 déjà bumpée), ne rien changer et le dire dans le rapport final.
- Ne toucher **que** `package.json` et `app.config.ts` — pas `package-lock.json`, pas `functions/package.json` (qui reste à `1.0.0`).
- Le bump entre dans le **même commit** que la note de version (`🔖 Release <version>`), sauf si l'utilisateur demande un commit `🔖 Bump version to X.Y.Z` séparé.

**Garde-fou** : ne jamais tagger tant que `package.json` et `app.config.ts` ne portent pas la version cible. Un tag `3.5.1-rc1` posé sur un arbre où `version` vaut encore `3.5.0` produit un build TestFlight étiqueté avec la version précédente.

## Étape 2 — Note de version App Store (fichier markdown)

Crée `_bmad-output/releases/release-notes-<version>.md` en suivant **strictement** la structure de `release-notes-3.2.0.md` / `release-notes-3.3.0.md` :

1. **Header** : version, build (si fourni — toujours pour les releases finales, optionnel pour les rc), date
2. **## Français**
   - **Texte promotionnel** : 2-3 options ≤ 170 caractères, mesure le nombre de caractères et l'indique
   - **Nouveautés** (≤ 4000 caractères) : 2-3 features phares, ton tutoiement, **pas d'emoji**, **pas de markdown**, paragraphes courts. Termine par "Et aussi" (perf, bugs) + signature contact
   - **Description complète** : reprend la description de la version précédente et insère 1 nouvelle section en majuscules par feature majeure
3. **## English** : Promotional Text + What's New uniquement (pas de description complète)
4. **## Notes pour le reviewer Apple** : compte démo, notes numérotées, "Comment tester", permissions
5. **## Plan de test QA interne** : checklists par feature + régression
6. **## Mots-clés** : FR + EN
7. **## Checklist publication** : items à cocher avant submit

**Règles de style App Store** (cf. [[feedback_appstore_notes]]) :
- Tutoiement
- Aucun emoji
- Aucun markdown (gras, listes à puces autorisées dans la description complète sous forme `-`)
- Phrases courtes, ton direct

## Étape 3 — Commit + tag + push

```bash
git status --short                 # doit ne lister que les 3 fichiers ci-dessous
git add package.json app.config.ts _bmad-output/releases/release-notes-<version>.md
git commit -m "🔖 Release <version>"
git push origin main
git tag -a <version> -m "CheckPack <version>"
git push origin <version>
```

Pour une pre-release : tag `<version>-rcN` (ex : `3.4.0-rc1`).

**Avant de tagger**, revérifier que le commit contient bien le bump :
```bash
git show --stat HEAD               # package.json + app.config.ts + la note
```

Si `main` a bougé pendant la préparation (`! [rejected] ... fetch first`) : `git fetch origin main` puis `git rebase origin/main`, relire les commits arrivés entre-temps et compléter les notes si nécessaire. **Jamais** `--amend` ni `--force` (cf. CLAUDE.md projet + global git-commit rules) — un complément se fait dans un commit supplémentaire.

## Étape 4 — GitHub Release

Format obligatoire (voir release 3.2.0 et 3.3.0 sur GitHub pour référence) :

```
## ✨ Nouveautés

### <emoji> Epic NN — <titre exact depuis docs/epics.md>
- <Story NN.M : description courte de l'apport user-facing>
- <Story NN.M : ...>

### <emoji> Epic NN — <titre>
- ...

## 🐛 Correctifs

### <Domaine / feature>
- <description technique : root cause + fix, 1-2 lignes>

## 📚 Documentation
- <changements docs/, CLAUDE.md, PRD, architecture>

## 📦 App Store

- Build iOS : <N>   ← inclure si fourni (obligatoire pour les releases finales, optionnel pour les rc)
- Notes de soumission complètes : [`_bmad-output/releases/release-notes-<version>.md`](./_bmad-output/releases/release-notes-<version>.md)

**Full Changelog**: https://github.com/qmachard/checkpack-v3/compare/<previous-tag>...<version>
```

**Pour les pre-releases (rc)** : la section `📦 App Store` est optionnelle. Si un build number a été fourni par l'utilisateur, l'inclure ; sinon, omettre la ligne `Build iOS`. Le lien vers les notes de soumission reste possible si pertinent.

Emojis par convention (réutiliser les mêmes catégories qu'avant) :
- 📋 listes / duplication
- 🎯 interactions / UX
- 🌤️ météo
- 🧩 packs / templates
- 🗺️ destinations / cartes
- 📧 emails / feedback
- 🔧 divers / infra
- 🔒 paywall / sécurité

**Création** :
```bash
gh release create <version> --title "CheckPack <version>" --notes "$(cat <<'EOF'
... contenu ...
EOF
)"
```

**Pre-release** : ajouter `--prerelease` au `gh release create`.

**Mise à jour** d'une release existante : `gh release edit <version> --notes "..."`.

## Étape 5 — Rapport final

Réponds à l'utilisateur en français, en une à deux phrases :
- Confirme le bump de version, le commit et le tag poussés
- Donne l'URL `https://github.com/qmachard/checkpack-v3/releases/tag/<version>`

## Garde-fous

- **Bump de version** : `package.json` et `app.config.ts` doivent porter la version cible **sans suffixe rc** avant le tag. C'est l'oubli le plus fréquent — le vérifier explicitement par un `git show --stat HEAD` avant `git tag`.
- Toujours vérifier `git status` propre avant de tagger (sauf le bump + la note de version, qui sont dans le commit `🔖 Release ...`)
- **Build number** : si l'utilisateur l'a fourni dans la commande, l'utiliser tel quel. Sinon, pour les releases finales, TOUJOURS le demander via `AskUserQuestion` — ne jamais inférer, incrémenter, ou réutiliser une valeur précédente. Pour les rc sans build fourni, l'omettre.
- Date au format ISO, convertir les dates relatives ("aujourd'hui") en absolu
