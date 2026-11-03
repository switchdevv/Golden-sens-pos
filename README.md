# Golden Sense

Caisse et gestion de stock pour la parfumerie Golden Sense.
Application web installable (iPhone, Android, tablette), qui fonctionne sans internet.

## Installer sur iPhone

1. Ouvrir le lien de l'application dans **Safari**.
2. Toucher **Partager** puis **Sur l'écran d'accueil**.
3. Ouvrir Golden Sense depuis l'icône : l'application fonctionne ensuite hors ligne.

## Fonctions

- **Caisse** : recherche (nom, marque, contenance, sans tenir compte des accents), filtres genre et type,
  panier, remise en % ou en montant, validation avec total et bénéfice. « Annuler » juste après une vente.
- **Stock** : ajout, modification, suppression ; alerte automatique sous 3 unités ; valeur du stock.
- **Rapports** : chiffre d'affaires et bénéfice net du jour, ventes, articles vendus, top 3
  (aujourd'hui / depuis le début), historique par jour avec le détail et l'annulation d'une vente.
- **Langues** : arabe (interface de droite à gauche), français, anglais. **Apparence** : auto, claire, sombre.
- **Sauvegarde** : export d'un fichier `.json` (Fichiers, iCloud, WhatsApp…) et restauration.

## Données

Tout reste sur l'appareil (IndexedDB) : rien n'est envoyé sur internet.
Exporter une sauvegarde chaque semaine ; un rappel s'affiche dans Rapports au-delà de 7 jours.
Les montants sont enregistrés en centimes : aucune erreur d'arrondi.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure et styles |
| `app.js` | Données, calculs, écrans, langues |
| `sw.js` | Fonctionnement hors ligne et mises à jour |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil |

## Publier une mise à jour

Modifier les fichiers, puis changer `VERSION` dans `sw.js` (par exemple `gs-v1.0.1`).
À l'ouverture suivante, l'application propose « Actualiser ».
