# Site de Nouha Smaali — stratégie éditoriale & Substack

Site vitrine statique (HTML / CSS / JavaScript, sans dépendance ni build).

## Pages

| Fichier | Contenu |
| --- | --- |
| `index.html` | Home : hero manifeste, bande éditoriale, accompagnements, « Ce que je défends », témoignages, « Un peu plus sur moi », Calendly intégré |
| `accompagnement-construire.html` | Page détaillée « Construire ton média » (+ son propre Calendly) |
| `accompagnement-transformer.html` | Page détaillée « Transformer ton média » (+ son propre Calendly) |
| `a-propos.html` | Page « Un peu plus sur moi » (+ Calendly) |
| `mentions-legales.html` | Mentions légales |

## Voir le site en local

```bash
npx serve .          # ou : python3 -m http.server 8080
```

Puis ouvre http://localhost:3000 (ou :8080). Le site peut être déployé tel quel
sur Netlify, Vercel, GitHub Pages, OVH, etc.

## Typographie

- **TAN Meringue** → accent / signature (grands titres, mots mis en avant).
  Police auto-hébergée (`assets/fonts/tan-meringue.woff2`), préchargée dans le
  `<head>` de chaque page.
- **Literata** → éditorial (titres secondaires, citations, introductions).
- **Inter** → fonctionnel (texte, navigation, boutons, légendes).

Les couleurs sont définies en variables CSS en haut de `assets/css/style.css`
(`--forest`, `--cream`, `--terracotta`, `--slate`, `--ochre`… et leurs alias
`--paper`, `--ink`, `--accent`, `--blush`, `--butter`).

## Interactions

- **Tous les boutons « Parlons de ton média » / « Prendre rendez-vous »** pointent
  vers `#rendez-vous` : scroll fluide jusqu'au Calendly intégré, sans quitter le site.
- **Menu burger** plein écran (Échap pour fermer, navigation clavier).
- **Calendly** : iframe directe (sans `widget.js`), chargée à l'approche de la
  section ; sa hauteur suit celle de la page Calendly (message
  `calendly.page_height`), donc pas de vide ni de défilement interne. URL à
  modifier dans l'attribut `data-url` de `.calendly-inline-widget`.
- **Trait de fond** (home, ≥ 768 px) : la ligne du hero (`#hero-thread`) est
  prolongée jusqu'au pied de page par `main.js`, un calque SVG par section.
- **Cookies & Google Analytics 4** (`assets/js/consent.js`) : GA n'est chargé
  qu'après « Accepter » ; le choix est gardé 6 mois. Tout élément portant
  `data-cookie-settings` rouvre le bandeau (pied de page, mentions légales).

## Images

Photos en WebP (ou JPG pour les petits avatars), dimensionnées pour leur taille
d'affichage (×2 pour les écrans Retina). Pour en ajouter une : exporte-la en
WebP qualité ~85, à environ deux fois sa largeur affichée, et renseigne
`width` / `height` sur la balise `<img>`.

## Structure

```
assets/
  css/style.css     styles (tokens, composants, responsive, ajustements)
  js/main.js        menu, scroll fluide, apparitions, Calendly, trait de fond
  js/consent.js     bandeau cookies + Google Analytics 4
  fonts/            TAN Meringue
  img/              photos (WebP/JPG), icônes
```

Les menus, en-têtes et pieds de page sont dupliqués dans chaque fichier HTML :
une modification de navigation est à reporter sur les 5 pages.
