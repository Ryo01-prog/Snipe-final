# Snipe

Application web progressive (PWA) pour l'analyse statistique et la visualisation de données.

## Technologies

- React + TypeScript
- Vite
- Tailwind CSS
- Recharts
- Framer Motion
- PWA / Service Worker

## Installation locale

```bash
npm ci
npm run dev
```

## Vérification avant publication

```bash
npm run typecheck
npm run build
```

Ou :

```bash
npm run check
```

## Publication sur GitHub Pages

1. Créer un dépôt GitHub, par exemple `snipe`.
2. Mettre le contenu de ce dossier à la racine du dépôt.
3. Utiliser la branche `main`.
4. Dans **Settings → Pages**, choisir **GitHub Actions** comme source.
5. Le workflow `.github/workflows/deploy.yml` construira et publiera automatiquement l'application à chaque push sur `main`.

## Important — sécurité

Cette version est une application **frontend statique**. Les données utilisateur sont stockées dans le navigateur (`localStorage`) et ne constituent pas une authentification sécurisée.

Ne placez jamais dans le code frontend :
- mot de passe administrateur ;
- clé API secrète ;
- clé privée ;
- identifiants de paiement ;
- informations personnelles sensibles.

Pour une vraie authentification, des comptes utilisateurs ou des paiements, utiliser un backend sécurisé avec des règles d'accès appropriées.

## Licence

À définir selon le mode de distribution souhaité.
