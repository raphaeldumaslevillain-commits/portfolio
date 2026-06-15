# Portfolio — Raphaël Dumas Levillain

Site portfolio one-page pour Raphaël Dumas Levillain, designer graphique
spécialisé en branding, packaging, communication visuelle, design digital et UX/UI.

## Aperçu

Site statique (HTML / CSS / JavaScript, sans dépendance ni build) avec :

- **Hero** : nom en très grand format animé caractère par caractère, intro animée,
  rotateur de mots, phrase d'accroche, portrait avec effet de parallaxe et badge « 5 ans ».
- **Curseur personnalisé** magnétique + effet « Voir » sur les projets.
- **Chiffres clés** avec compteurs animés au scroll.
- **À propos** : parcours de l'impression vers le branding, le digital et l'IA.
- **Projets** : études de cas dépliables (SNCF, Animalis, Guerlain, STIHL, PSA,
  Restaurants & Hôtels) avec contexte, objectifs, réalisations, résultats et compétences.
- **Compétences** : Création / Outils / Innovation.
- **Section IA** dédiée à la transformation des métiers créatifs.
- **Parcours** : timeline (Bac Pro RPIP → BTS ERPC → IROPA → Groupe BREARD → IIM Digital School).
- **Contact** + footer.
- Animations au scroll (Intersection Observer), marquee, dégradés animés, effets de survol.
- Responsive + support `prefers-reduced-motion`.

## Lancer en local

Ouvrir simplement `index.html` dans un navigateur, ou servir le dossier :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Personnalisation

- **Photo portrait** : remplacer le bloc `#portrait` dans `index.html` par une
  balise `<img src="votre-photo.jpg" alt="Raphaël Dumas Levillain" />`.
- **Couleurs** : variables CSS en haut de `styles.css` (`--accent`, `--accent-2`, …).
- **Images de projets** : remplacer les `.project__media` (dégradés) par de vraies
  images de couverture.

## Structure

```
index.html    Structure et contenu
styles.css    Design, mise en page, animations
script.js     Curseur, compteurs, reveals, accordéon projets, parallaxe
```
