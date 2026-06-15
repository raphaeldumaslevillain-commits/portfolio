/* ============================================================
   projects-deck.js — Deck de cartes projets
   Cartes empilées -> dépliées en grille au scroll (pin + scrub),
   clic -> plein écran via GSAP Flip (transition morphée), retour réversible.
   ============================================================ */

/* ---- DONNÉES (modifie/complète librement) ---- */
const projects = [
  {
    id: "astranova",
    titre: "Astranova",
    sous: "Stand d'exposition",
    image: "astranova.jpg",
    courteDesc: "Stand & scénographie événementielle.",
    descLongue:
      "Conception d'un stand d'exposition pour Astranova : un espace qui attire l'œil, raconte la marque et donne envie de s'arrêter. Scénographie, supports de communication et direction artistique, de l'idée à la production.",
    lien: "#",
  },
  {
    id: "guerlain",
    titre: "Bréard × Guerlain",
    sous: "Stand modulaire",
    image: "stand.png",
    courteDesc: "Stand modulaire, univers premium.",
    descLongue:
      "Stand d'exposition modulaire conçu en collaboration avec le Groupe Bréard pour la maison Guerlain. Un dispositif flexible et réutilisable qui traduit un univers premium dans un espace immersif, fidèle aux codes du luxe.",
    lien: "#",
  },
  {
    id: "stihl",
    titre: "STIHL",
    sous: "PLV nationale",
    image: "stihl.jpg",
    courteDesc: "PLV déployée dans 400+ points de vente.",
    descLongue:
      "Conception et déploiement d'une PLV à l'échelle nationale, dans plus de 400 points de vente. Une présence de marque homogène et un message lisible partout en France. (Et oui, j'étais disponible pour une alternance.)",
    lien: "#",
  },
  {
    id: "labeda",
    titre: "Renault Labeda",
    sous: "Covering Clio Cup 2026",
    image: "covering.jpg",
    courteDesc: "Covering de compétition, de la créa à la prod.",
    descLongue:
      "Design du covering de la voiture de course du garage Renault Labeda pour la Clio Cup 2026 : un habillage percutant, lisible en piste et techniquement réalisable. Conception graphique, intégration des partenaires, préparation des fichiers et suivi de production.",
    lien: "#",
  },
  {
    id: "izakaya",
    titre: "Izakaya",
    sous: "Rebranding & site web",
    image: "site.png",
    courteDesc: "Rebranding complet + design du site web.",
    descLongue:
      "Rebranding total du restaurant Izakaya au Petit Quevilly et design de son nouveau site web. Nouvelle identité visuelle, déclinaison sur les supports et conception de l'expérience digitale (UX/UI), de la table à l'écran.",
    lien: "#",
  },
];

const CARD = { w: 280, h: 340, gap: 26 };

export function initProjectsDeck({ gsap, ScrollTrigger, Flip, lenis, reduce }) {
  const stage = document.getElementById("deckStage");
  const detailLayer = document.getElementById("detailLayer");
  if (!stage) return;

  /* ---- Construction des cartes ---- */
  const cards = projects.map((p, i) => {
    const el = document.createElement("article");
    el.className = "deck__card";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Ouvrir le projet ${p.titre}`);
    el.dataset.id = p.id;
    el.innerHTML = `
      <div class="deck__card-media">
        <img src="${p.image}" alt="${p.titre} — ${p.sous}" loading="lazy" />
      </div>
      <div class="deck__card-body">
        <span class="deck__card-index">${String(i + 1).padStart(2, "0")}</span>
        <h3 class="deck__card-title">${p.titre}</h3>
        <p class="deck__card-short">${p.courteDesc}</p>
      </div>
      <div class="deck__card-full">
        <button class="deck__back" aria-label="Revenir aux projets">
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Retour
        </button>
        <div class="deck__full-inner">
          <span class="deck__full-tag">${p.sous}</span>
          <h3 class="deck__full-title">${p.titre}</h3>
          <p class="deck__full-desc">${p.descLongue}</p>
          <a class="deck__full-link" href="${p.lien}">Voir le projet
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </div>`;
    stage.appendChild(el);
    const img = el.querySelector("img");
    img.addEventListener("error", () => el.classList.add("img-missing"));
    return el;
  });

  /* ---- Layout en grille (centré, responsive) ---- */
  function gridLayout() {
    const vw = window.innerWidth;
    const cols = vw < 760 ? 1 : vw < 1180 ? 2 : 3;
    const rows = Math.ceil(cards.length / cols);
    const pos = [];
    for (let i = 0; i < cards.length; i++) {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, cards.length - row * cols);
      const col = i % cols;
      const x = (col - (inRow - 1) / 2) * (CARD.w + CARD.gap);
      const y = (row - (rows - 1) / 2) * (CARD.h + CARD.gap);
      pos.push({ x, y, rotation: 0, scale: 1 });
    }
    return pos;
  }

  /* ---- État empilé (pile de cartes) ---- */
  function stackState(i) {
    const n = cards.length;
    return {
      x: (i - (n - 1) / 2) * 8,
      y: (i - (n - 1) / 2) * -10,
      rotation: (i - (n - 1) / 2) * 3,
      scale: 1 - (n - 1 - i) * 0.015,
    };
  }

  const fancy =
    window.matchMedia("(min-width:1024px) and (hover:hover) and (pointer:fine)").matches && !reduce;

  if (fancy) {
    // Centrage en CSS (inset:0 + margin:auto) -> GSAP ne pilote QUE le transform.
    stage.classList.add("deck__stage--scrub");
    cards.forEach((c, i) => gsap.set(c, stackState(i)));

    const buildTimeline = () => {
      const pos = gridLayout();
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#projects",
          start: "top top",
          end: "+=160%",
          pin: ".deck__viewport",
          scrub: 1,
          anticipatePin: 1,
        },
      });
      cards.forEach((c, i) => {
        tl.to(c, { ...pos[i], ease: "power3.inOut", duration: 1 }, i * 0.04);
        tl.to(c, { boxShadow: "0 30px 60px rgba(0,0,0,0.45)", duration: 0.4 }, i * 0.04);
      });
      return tl;
    };
    let tl = buildTimeline();
    // recalcul propre sur resize
    let rid;
    window.addEventListener("resize", () => {
      clearTimeout(rid);
      rid = setTimeout(() => {
        tl.scrollTrigger && tl.scrollTrigger.kill();
        tl.kill();
        cards.forEach((c, i) => gsap.set(c, stackState(i)));
        tl = buildTimeline();
        ScrollTrigger.refresh();
      }, 200);
    });
  } else {
    // Mode simple : grille CSS + apparition au scroll (gérée ici pour éviter le double masquage)
    stage.classList.add("deck__stage--grid");
    stage.closest(".deck__viewport")?.classList.add("is-static");
    if (!reduce) {
      gsap.set(cards, { y: 40, autoAlpha: 0 });
      ScrollTrigger.batch(cards, {
        start: "top 92%",
        onEnter: (b) => gsap.to(b, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.08, overwrite: true }),
      });
    }
  }

  /* ============================================================
     Ouverture / fermeture plein écran (GSAP Flip)
     ============================================================ */
  let openEl = null;

  function lockScroll(lock) {
    if (lenis) lock ? lenis.stop() : lenis.start();
    document.documentElement.style.overflow = lock ? "hidden" : "";
  }

  function openCard(card) {
    if (openEl) return;
    openEl = card;
    lockScroll(true);

    // Sauvegarde du transform (position dépliée) pour le retour
    card._saved = {
      x: gsap.getProperty(card, "x"),
      y: gsap.getProperty(card, "y"),
      rotation: gsap.getProperty(card, "rotation"),
      scale: gsap.getProperty(card, "scale"),
    };

    const state = Flip.getState(card, { props: "borderRadius" });
    gsap.set(card, { clearProps: "transform" });
    card.classList.add("is-open");
    detailLayer.appendChild(card);
    detailLayer.classList.add("is-active");
    detailLayer.setAttribute("aria-hidden", "false");

    Flip.from(state, {
      duration: 0.7,
      ease: "power3.inOut",
      absolute: true,
      onComplete: () => {
        card.classList.add("is-content");
        const back = card.querySelector(".deck__back");
        back && back.focus();
      },
    });
  }

  function closeCard() {
    if (!openEl) return;
    const card = openEl;
    card.classList.remove("is-content");

    const state = Flip.getState(card);
    card.classList.remove("is-open");
    stage.appendChild(card);
    gsap.set(card, card._saved || {}); // restaure exactement la position de la carte
    detailLayer.classList.remove("is-active");
    detailLayer.setAttribute("aria-hidden", "true");

    Flip.from(state, {
      duration: 0.6,
      ease: "power3.inOut",
      absolute: true,
      onComplete: () => {
        lockScroll(false);
        card.focus();
        openEl = null;
      },
    });
  }

  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".deck__card-full")) return; // clics internes (lien, retour)
      openCard(card);
    });
    card.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !openEl) {
        e.preventDefault();
        openCard(card);
      }
    });
    card.querySelector(".deck__back").addEventListener("click", (e) => {
      e.stopPropagation();
      closeCard();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openEl) closeCard();
  });
}
