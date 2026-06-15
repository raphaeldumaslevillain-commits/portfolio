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
- **Projets** : projet phare Moki! (boîte 3D) + études de cas dépliables (Astranova,
  Bréard × Guerlain, STIHL, Renault Labeda, Izakaya) avec contexte, objectifs,
  réalisations, résultats et compétences.
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

## Images à déposer

Déposez ces fichiers **à la racine du dossier** (à côté de `index.html`). Tant
qu'ils sont absents, un repère « à déposer » s'affiche à leur place.

| Fichier | Usage |
|---|---|
| `portrait.png` | Photo portrait du hero |
| `astranova.jpg` | Projet stand Astranova |
| `stand.png` | Projet stand modulaire Bréard × Guerlain |
| `stihl.jpg` | Projet STIHL — PLV nationale |
| `covering.jpg` | Projet covering Renault Labeda — Clio Cup 2026 |
| `site.png` | Projet Izakaya — rebranding & site web |

### Boîte 3D Moki! (projet phare)

Les 6 faces de la boîte de macarons (BoxGeometry 20 × 5 × 7) :

| Fichier | Face |
|---|---|
| `facedessus.png` | Dessus (20×7) |
| `dessous.png` | Dessous (20×7) |
| `facedroite.png` | Grande face avant (20×5) |
| `facegauche.png` | Grande face arrière (20×5) |
| `cotes.png` | Les deux petits bouts (7×5) |

L'orientation de chaque face (rotation par pas de 90°, miroir) se règle dans
l'objet `FACES` en haut de `moki.js`, sans toucher au reste du code.
La 3D utilise **Three.js** + **OrbitControls** chargés via CDN (importmap) :
rotation au clic-glisser, zoom à la molette, pas d'auto-rotation.

## Personnalisation

- **Couleurs** : variables CSS en haut de `styles.css` (`--accent`, `--accent-2`, …).
- **Images de projets** : les autres `.project__media` (SNCF, Animalis, STIHL)
  utilisent des dégradés ; remplaçables par de vraies images sur le même modèle
  que les projets ci-dessus.

## Structure (modules)

```
index.html         Structure + importmap (Three.js, GSAP, ScrollTrigger, Flip, Lenis)
styles.css         Design, mise en page, animations
main.js            Orchestrateur : Lenis (smooth scroll) + GSAP + UI (curseur, nav, compteurs)
hero-shader.js     Portrait plein écran, effet liquide WebGL (Three.js, shader GLSL)
box.js             Boîte de macarons 3D Moki! (Three.js + OrbitControls)
projects-deck.js   Deck de cartes : dépliage au scroll (pin/scrub) + plein écran via GSAP Flip
scroll-reveals.js  Reveals au scroll (GSAP ScrollTrigger), reveal du hero, parallax, progression
```

### Réglages rapides

- **Effet liquide du portrait** : constantes `FREQ`, `SPEED`, `DECAY`, `AMPLITUDE`,
  `INTENSITE` et le dégradé `GRAD` en haut de `hero-shader.js`.
- **Orientation des faces de la boîte** : objet `FACES` en haut de `box.js`.
- **Projets du deck** : tableau `projects` en haut de `projects-deck.js`.
