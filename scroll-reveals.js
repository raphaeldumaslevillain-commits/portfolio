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

  /* ---- HERO : au départ seule la photo, les infos arrivent AU SCROLL ----
     Section épinglée + scrub. fromTo (destination explicite) pour révéler vraiment. */
  const hero = document.querySelector(".hero");
  if (hero) {
    const left = hero.querySelectorAll('[data-side="left"]');
    const right = hero.querySelectorAll('[data-side="right"]');
    const canvas = document.getElementById("heroCanvas");

    const tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "+=130%", pin: true, scrub: 1, anticipatePin: 1 },
    });
    if (canvas) tl.fromTo(canvas, { scale: 1 }, { scale: 1.12, ease: "none" }, 0);
    tl.to(".hero__scroll", { autoAlpha: 0, duration: 0.12 }, 0);
    tl.fromTo(left, { x: -120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "expo.out", duration: 0.5, stagger: 0.1 }, 0.12);
    tl.fromTo(right, { x: 120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "expo.out", duration: 0.5, stagger: 0.1 }, 0.18);
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
      gsap.to(batch, {
        y: 0, autoAlpha: 1, duration: 1.1, ease: "power4.out", stagger: 0.1, overwrite: true,
        onComplete: () => gsap.set(batch, { clearProps: "transform" }), // libère le transform (survol CSS)
      }),
  });

  /* ---- Apparitions directionnelles : .r-up / .r-down / .r-left / .r-right ---- */
  const DIRS = { up: { y: 80 }, down: { y: -80 }, left: { x: -110 }, right: { x: 110 } };
  Object.keys(DIRS).forEach((dir) => {
    gsap.utils.toArray(".r-" + dir).forEach((el) => {
      gsap.fromTo(
        el,
        { ...DIRS[dir], autoAlpha: 0 },
        {
          x: 0, y: 0, autoAlpha: 1, duration: 1.1, ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onComplete: () => gsap.set(el, { clearProps: "transform" }),
        }
      );
    });
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

  /* ---- Apparitions en cascade : [data-stagger] anime ses enfants ---- */
  gsap.utils.toArray("[data-stagger]").forEach((group) => {
    const kids = gsap.utils.toArray(group.children);
    gsap.set(kids, { y: 52, autoAlpha: 0 });
    ScrollTrigger.create({
      trigger: group,
      start: "top 85%",
      once: true,
      onEnter: () =>
        gsap.to(kids, {
          y: 0, autoAlpha: 1, duration: 1, ease: "power3.out", stagger: 0.12,
          onComplete: () => gsap.set(kids, { clearProps: "transform" }),
        }),
    });
  });

  ScrollTrigger.refresh();
}
