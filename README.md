# Golden Sense

Caisse, stock et crédit clients pour la parfumerie Golden Sense.
Application web installable (iPhone, Android, PC), qui fonctionne sans internet.

## Installer

- **iPhone** : ouvrir le lien dans **Safari**, toucher **Partager** puis **Sur l'écran d'accueil**, et ouvrir ensuite l'application depuis l'icône.
- **PC** : ouvrir le lien dans **Chrome** ou **Edge**, puis cliquer sur l'icône d'installation dans la barre d'adresse.

## Fonctions (version 1.1)

**Caisse**
- Vente au flacon ou en décants (tailles et prix définis pour chaque parfum, ou quantité libre au ml/g).
  Le flacon suivant est ouvert automatiquement quand le flacon ouvert ne suffit plus.
- Vrac (huiles) vendu au ml ou au gramme.
- Prix modifiable pour une ligne, remise en % ou en montant.
- Paiement : espèces (montant reçu et monnaie à rendre), crédit (versement immédiat facultatif, reste sur le compte du client),
  autre (CCP, BaridiMob).
- « Annuler » juste après une vente ; retour partiel depuis l'historique (remboursé en espèces ou déduit de la dette).

**Stock**
- Flacons fermés, millilitres déjà ouverts, vrac ; alerte stock bas.
- Entrée de stock avec fournisseur ; le prix d'achat devient le coût moyen.
- Fiche par parfum avec l'historique des mouvements (entrées, ventes, retours, flacons ouverts, corrections).
- Coût des flacons vides (Réglages) ajouté au coût de chaque décant.

**Clients**
- Dette existante à la création (ancien cahier), achats à crédit, versements, historique ; total des crédits en cours.

**Rapports**
- Chiffre d'affaires et bénéfice du jour (après retours), espèces encaissées, crédit accordé et versements reçus,
  top 3 (aujourd'hui / depuis le début), historique par jour.

**Général** : arabe (de droite à gauche), français, anglais ; thème clair ou sombre ; sauvegarde et restauration.

## Données

Tout reste sur l'appareil (IndexedDB). Les données de la version 1.0 sont converties automatiquement à la mise à jour,
et les anciennes sauvegardes restent lisibles. Exporter une sauvegarde chaque semaine (rappel dans Rapports).
Montants enregistrés en centimes ; coûts des décants arrondis au dinar.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure et styles |
| `js/i18n.js` | Textes en trois langues |
| `js/core.js` | Calculs, règles de stock, base de données, sauvegarde |
| `js/ui.js` | Écrans, fenêtres, actions |
| `sw.js` | Fonctionnement hors ligne et mises à jour |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil |

## Publier une mise à jour

Modifier les fichiers, changer `VERSION` dans `sw.js` et `APP_VERSION` dans `js/core.js`,
puis pousser sur `main` et `gh-pages`. À l'ouverture suivante, l'application propose « Actualiser ».
