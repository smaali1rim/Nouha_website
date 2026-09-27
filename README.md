# Site de Nouha Smaali — stratégie éditoriale & Substack

Site vitrine statique (HTML / CSS / JavaScript, sans dépendance ni build).

## Pages

| Fichier | Contenu |
| --- | --- |
| `index.html` | Home : hero manifeste, bande éditoriale, accompagnements, « Ce que je défends », témoignages, « Un peu plus sur moi », Calendly intégré |
| `accompagnement-construire.html` | Page détaillée « Construire ton média » (+ son propre Calendly) |
| `accompagnement-transformer.html` | Page détaillée « Transformer ton média » (+ son propre Calendly) |
| `a-propos.html` | Page « Un peu plus sur moi » (+ Calendly) |

## Voir le site en local

```bash
npx serve .          # ou : python3 -m http.server 8080
```

Puis ouvre http://localhost:3000 (ou :8080). Le site peut être déployé tel quel
sur Netlify, Vercel, GitHub Pages, OVH, etc.

## Typographie

- **TAN Meringue** → accent / signature (grands titres, mots mis en avant). Police
  commerciale : voir `assets/fonts/README.md` pour l'ajouter. En attendant,
  Fraunces prend le relais.
- **Literata** → éditorial (titres secondaires, citations, introductions).
- **Inter** → fonctionnel (texte, navigation, boutons, légendes).

Les couleurs sont définies en variables CSS en haut de `assets/css/style.css`
(`--paper`, `--ink`, `--accent`, `--blush`, `--butter`…).

## Interactions

- **Tous les boutons « Parlons-en » / « Prendre rendez-vous »** pointent vers
  `#rendez-vous` : scroll fluide jusqu'au Calendly intégré, sans quitter le site.
- **Menu burger** plein écran (Échap pour fermer, navigation clavier). Les trois
  premières entrées défilent vers les sections de la home, « Un peu plus sur moi »
  ouvre `a-propos.html`.
- **Calendly** : widget inline officiel, chargé automatiquement à l'approche de la
  section (lien de secours si le calendrier ne charge pas). URL à modifier dans
  l'attribut `data-url` de `.calendly-inline-widget`. Les couleurs passées dans
  l'URL (`background_color`, `primary_color`…) ne s'appliquent qu'avec un plan
  Calendly payant.
- **Lecteurs audio** avec play/pause, waveform calculée depuis le fichier,
  clic/glisser pour avancer, flèches clavier.
- **Vidéos** : vignette cliquable qui ouvre une modal. Deux options par vignette :
  - `data-video="assets/media/ma-video.mp4"` pour un fichier hébergé avec le site ;
  - `data-embed="https://www.youtube.com/embed/ID?autoplay=1"` (ou Vimeo) à la place.
  - `data-portrait` pour une vidéo verticale.

## À personnaliser avant la mise en ligne

1. **Photos** : remplace `assets/img/portrait.svg` (hero + section « moi ») et les
   vignettes vidéo `assets/img/poster-1.svg` / `poster-2.svg` par de vraies photos
   (JPG/WebP), puis mets à jour les `src` correspondants.
2. **Témoignages** (section `#retours` de `index.html`) : les noms, messages,
   captures, audios et vidéos sont des **exemples fictifs**. Remplace-les par de
   vrais retours clients (avec leur accord).
   - Audios : dépose tes fichiers dans `assets/media/` et change le `src` de la
     balise `<audio>` (mp3 / m4a / wav) et `data-duration`.
   - Vidéos : voir ci-dessus.
3. **Liens** : vérifie l'adresse e-mail (`bonjour@nouhasmaali.com`), l'URL
   Substack (`https://substack.com/@nouhasmaali`) et l'URL LinkedIn — elles sont
   présentes dans le menu et le pied de page de chaque page.
4. **Page « Un peu plus sur moi »** : les passages marqués `[À compléter]` et les
   repères chiffrés `[X]` attendent ton parcours et tes éléments de légitimité.
5. **Pages accompagnements** : relis les étapes, livrables, format et FAQ pour
   qu'ils collent exactement à tes offres.

## Structure

```
assets/
  css/style.css     styles (tokens, composants, responsive)
  js/main.js        menu, scroll fluide, apparitions, Calendly, audio, modal vidéo
  fonts/            TAN Meringue (à ajouter)
  img/              visuels provisoires (SVG)
  media/            audio & vidéo provisoires
```

Les menus, en-têtes et pieds de page sont dupliqués dans chaque fichier HTML :
une modification de navigation est à reporter sur les 4 pages.
