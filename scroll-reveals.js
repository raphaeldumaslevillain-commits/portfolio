/* ============================================================
   scroll-reveals.js — Animations de scroll (GSAP + ScrollTrigger)
   Reveals du hero depuis les côtés, apparitions de sections,
   parallax léger, barre de progression. Restreint : timing + stagger.
   ============================================================ */

export function initScrollReveals({ gsap, ScrollTrigger, reduce }) {
  /* ---- Barre de progression (toujours active) ---- */
  const bar = document.getElementById("scrollProgress");
  if (bar) {
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => gsap.set(bar, { width: self.progress * 100 + "%" }),
    });
  }

  // En reduced-motion : tout reste visible, on ne touche à rien d'autre.
  if (reduce) return;

  /* ---- HERO : intro depuis les côtés (joue à l'arrivée) + parallax léger ---- */
  const hero = document.querySelector(".hero");
  if (hero) {
    const left = hero.querySelectorAll('[data-side="left"]');
    const right = hero.querySelectorAll('[data-side="right"]');
    const canvas = document.getElementById("heroCanvas");

    // parallax doux du portrait pendant le scroll (sans épingler la page)
    if (canvas) {
      gsap.to(canvas, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      });
    }
    // l'indicateur de scroll s'efface quand on descend
    gsap.to(".hero__scroll", {
      autoAlpha: 0,
      ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "20% top", scrub: true },
    });

    // intro : les textes entrent depuis les côtés, après le préchargeur
    const intro = gsap.timeline({ delay: 1.15, defaults: { ease: "expo.out", duration: 1.1 } });
    intro
      .fromTo(left, { x: -120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, stagger: 0.12 }, 0)
      .fromTo(right, { x: 120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, stagger: 0.12 }, 0.1);
  }

  /* ---- Titres mot par mot (.reveal-words) ---- */
  document.querySelectorAll(".reveal-words").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    const inners = [];
    words.forEach((w, i) => {
      const word = document.createElement("span");
      word.className = "word";
      const inner = document.createElement("span");
      inner.className = "word-inner";
      inner.textContent = w;
      word.appendChild(inner);
      el.appendChild(word);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      inners.push(inner);
    });
    gsap.set(inners, { yPercent: 110 });
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => gsap.to(inners, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.05 }),
    });
  });

  /* ---- Apparitions génériques (.reveal-up) en batch ---- */
  const ups = gsap.utils.toArray(".reveal-up");
  gsap.set(ups, { y: 64, autoAlpha: 0 });
  ScrollTrigger.batch(ups, {
    start: "top 90%",
    onEnter: (batch) =>
      gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.1, ease: "power4.out", stagger: 0.1, overwrite: true }),
  });

  /* ---- Parallax léger ([data-parallax]) ---- */
  gsap.utils.toArray("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 60;
    gsap.fromTo(
      el,
      { y: -amount * 0.5 },
      {
        y: amount * 0.5,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });

  ScrollTrigger.refresh();
}
