# StatOwrel — Politique de confidentialité

> **Publiée.** Le texte de référence est servi sur
> `apps/admin/public/legal/confidentialite.html`, à l'URL `/legal/confidentialite` — c'est celle
> que les deux stores reçoivent et que l'app pointe depuis son pied de page légal. Ce document est
> la source à partir de laquelle la page a été écrite : chaque affirmation est traçable à un
> fichier du dépôt, et les renvois entre crochets sont là pour la vérifier (ils ne figurent pas sur
> la page publiée).
>
> **Modifier la page, pas seulement ce fichier** : les deux doivent rester d'accord, et c'est la
> page qui fait foi. Il reste à faire relire par un juriste.
>
> Publication : voir `docs/production-checklist.md` §2.2.

---

**Dernière mise à jour : 21 août 2026**

## 1. Qui traite vos données

StatOwrel (« l'application ») est éditée par Quentin Machard SAS, société par actions simplifiée
au capital de 1 000 €, 6 rue des Prunus, 53410 Port-Brillet, RCS Laval 891 303 893, ci-après
« nous ».

Pour toute question relative à vos données : quentin.machard@gmail.com.

## 2. Le principe

StatOwrel pose une question par jour et vous montre comment les autres y ont répondu. Nous ne
collectons que ce qu'il faut pour que cela fonctionne.

Concrètement, et pour l'écarter tout de suite :

- Nous **ne vendons** aucune donnée, à personne.
- Nous **n'affichons aucune publicité** et n'intégrons aucune régie publicitaire.
- Nous **ne vous suivons pas** d'une application à l'autre ni sur le web, et n'utilisons aucun
  identifiant publicitaire.
- Nous **n'accédons pas** à votre carnet d'adresses, à votre position, à vos photos, à votre
  micro ni à votre appareil photo.
- Nous **n'utilisons aucun outil d'analyse d'audience** ni de rapport de plantage.

## 3. Ce que nous collectons, et pourquoi

### 3.1 Votre compte

| Donnée | Origine | Pourquoi |
|---|---|---|
| Adresse e-mail | Vous, ou votre fournisseur Google / Apple | Identifier votre compte et vous y reconnecter |
| Mot de passe | Vous, si vous choisissez ce mode de connexion | Stocké chiffré par Firebase Authentication ; nous n'y avons jamais accès |
| Identifiant de compte | Généré à la création | Rattacher vos réponses et vos amitiés à vous |
| Méthodes de connexion utilisées | Google, Apple ou e-mail | Vous proposer la bonne méthode à la reconnexion |

Si vous vous connectez avec Apple en choisissant **« Masquer mon adresse e-mail »**, nous ne
recevons que l'adresse relais d'Apple, et l'application fonctionne à l'identique.
*[`packages/models/src/v1_user.ts`, `apps/app/src/auth/`]*

### 3.2 Votre nom d'utilisateur

Vous le choisissez à l'inscription. Il n'est jamais pré-rempli à partir de votre e-mail ou de votre
compte Google ou Apple : il n'appartient qu'à vous.

Il est **unique** dans toute l'application, et c'est lui qui permet à un ami de vous ajouter. Il est
visible **de vos amis uniquement** : il n'existe ni annuaire, ni recherche d'utilisateurs, ni profil
public. *[`packages/models/src/v1_username.ts`]*

### 3.3 Votre photo de profil

Si vous vous connectez avec Google ou Apple et que ce service nous transmet une photo, nous la
conservons pour l'afficher. Vous pouvez ne pas en avoir : l'application dessine alors une image
géométrique à partir de votre nom d'utilisateur. Voir la §5 pour la seule conséquence de ce choix.

### 3.4 Vos réponses

Pour chaque journée à laquelle vous répondez, nous enregistrons **l'option choisie**, la date, et
si la réponse a été donnée après la clôture de la journée. Une réponse est le choix d'une option
pré-écrite : jamais du texte libre, jamais une photo.

Vos réponses servent à trois choses : vous montrer votre résultat, alimenter les **pourcentages
globaux** affichés à tout le monde, et être visibles **de vos amis** — uniquement s'ils ont
eux-mêmes répondu à la même journée. *[`packages/models/src/v1_daily_question_answer.ts`]*

### 3.5 Votre série et votre calendrier

Le nombre de jours répondus d'affilée, votre meilleur score et le résumé mensuel de vos journées
répondues. Ces informations sont **privées** : elles ne sont visibles que de vous.

### 3.6 Vos amitiés

Pour chaque ami : son identifiant, son nom d'utilisateur, l'état de la relation (invitation en
attente ou amitié acceptée), et les dates. Une amitié est réciproque et enregistrée des deux côtés.

Nous n'accédons **jamais** à votre carnet d'adresses : un ami s'ajoute uniquement en tapant son nom
d'utilisateur exact. *[`packages/models/src/v1_user_friend.ts`]*

### 3.7 Notifications

Si vous acceptez de recevoir les notifications, nous enregistrons un identifiant technique
d'envoi lié à votre appareil, pour vous prévenir quand la question du jour tombe (7 h) et, le soir,
si vous n'y avez pas encore répondu (18 h). Vous pouvez retirer cette autorisation à tout moment
depuis les réglages de votre téléphone ; l'identifiant est par ailleurs supprimé à la déconnexion et
lorsqu'il devient invalide. *[`packages/models/src/v1_user_device.ts`,
`apps/functions/src/domains/notifications/`]*

## 4. Ce que nous ne collectons pas

Position géographique, contacts, photos et vidéos de votre appareil, micro, appareil photo,
identifiant publicitaire, historique de navigation, données de santé, données bancaires.
L'application ne demande aucune de ces autorisations.

## 5. Qui d'autre voit ces données

Nous ne vendons ni ne cédons vos données. Elles sont traitées par les prestataires suivants, pour
notre compte et uniquement pour faire fonctionner l'application :

| Prestataire | Ce qu'il traite | Où |
|---|---|---|
| **Google (Firebase / Google Cloud)** | Hébergement, base de données, authentification, traitements serveur | Union européenne (`europe-west1`) |
| **Expo (Expo Push)** | L'identifiant d'envoi de votre appareil et le texte de la notification, qu'il relaie vers Apple ou Google | États-Unis, clauses contractuelles types |
| **Apple** | Uniquement si vous utilisez « Se connecter avec Apple » | Selon la politique d'Apple |
| **Google Sign-In** | Uniquement si vous utilisez « Se connecter avec Google » | Selon la politique de Google |
| **DiceBear** | Voir ci-dessous | — |

**Le point à connaître sur les avatars.** Quand vous n'avez pas de photo de profil, l'image
géométrique affichée à sa place est dessinée par le service **DiceBear**, à qui l'application
demande une image en lui transmettant **votre nom d'utilisateur** comme graine — c'est ce qui fait
que la même personne a toujours la même image. Aucune autre donnée ne lui est transmise : ni votre
e-mail, ni vos réponses, ni la liste de vos amis. *[`apps/app/src/lib/avatars.ts`]*

## 6. Ce que vos amis voient

C'est la seule circulation de données entre utilisateurs, et elle est volontairement étroite :

| Vos amis voient | Vos amis ne voient pas |
|---|---|
| Votre nom d'utilisateur et votre photo | Votre adresse e-mail |
| Vos réponses aux journées auxquelles **ils ont eux-mêmes répondu** | Vos réponses aux journées qu'ils n'ont pas jouées |
| L'heure à laquelle vous avez répondu ce jour-là | Votre série, votre calendrier, votre historique |
| | La liste de vos autres amis |

Une personne qui n'est pas votre amie ne voit **rien** de vous. Il n'y a aucun contenu public dans
StatOwrel.

## 7. Combien de temps

Vos données sont conservées tant que votre compte existe.

À sa suppression, nous effaçons votre profil, votre nom d'utilisateur, votre calendrier, vos
amitiés, vos identifiants de notification **et vos réponses**. Seuls subsistent les **compteurs
agrégés** de chaque question — le nombre de réponses par option —, qui ne comportent aucune donnée
personnelle et que plus rien ne relie à vous. Nous ne les décrémentons pas, parce que ces réponses
ont été comptées dans les pourcentages affichés à tous les autres utilisateurs : les retirer
fausserait rétroactivement des statistiques déjà vues et déjà partagées.
*[`apps/functions/src/domains/users/callables/deleteAccount.ts`]*

## 8. Vos droits

Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de
limitation, d'opposition et de portabilité.

- **Modifier votre profil** : depuis l'application.
- **Supprimer votre compte** : Menu → Supprimer mon compte. La suppression est immédiate et
  définitive. Si le compte n'est plus accessible, vous pouvez en faire la demande à
  quentin.machard@gmail.com, depuis l'adresse e-mail du compte.
- **Exercer les autres droits** : écrivez à quentin.machard@gmail.com. Nous répondons sous 30 jours.

Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).

## 9. Base légale

| Traitement | Base légale |
|---|---|
| Compte, nom d'utilisateur, réponses, amitiés | Exécution du contrat — sans elles, l'application ne fonctionne pas |
| Notifications | Votre consentement, retirable à tout moment |
| Statistiques agrégées et anonymes | Intérêt légitime — c'est l'objet même du service |

## 10. Sécurité

Les échanges entre l'application et nos serveurs sont chiffrés (HTTPS). L'accès aux données est
contrôlé au niveau de la base par des règles qui interdisent structurellement à un utilisateur de
lire les données d'un autre en dehors de ce que décrit la §6. Les mots de passe sont gérés et
stockés par Firebase Authentication ; nous n'y avons jamais accès.

## 11. Âge minimum

StatOwrel est réservée aux personnes de **16 ans et plus**. Nous ne collectons pas sciemment de
données concernant un enfant en deçà de cet âge ; si cela se produisait, écrivez-nous et nous
supprimerions le compte. Nos [normes de sécurité des enfants](/legal/protection-des-enfants)
décrivent l'interdiction des abus sexuels sur des enfants et de l'exploitation sexuelle d'enfants
(CSAE), la manière de les signaler et le point de contact dédié.

## 12. Contenus signalés

Vous pouvez signaler un utilisateur par e-mail, à l'adresse indiquée sur la page d'assistance
(`/legal/assistance`). Nous traitons les signalements sous 24 heures et pouvons libérer un nom
d'utilisateur, suspendre ou supprimer un compte qui ne respecte pas les règles. Retirer la personne
de vos amis interrompt immédiatement toute visibilité entre les deux comptes.

## 13. Modifications

Nous pouvons faire évoluer cette politique. Toute modification substantielle vous sera signalée
dans l'application avant son entrée en vigueur. La date de dernière mise à jour figure en tête de
ce document.
