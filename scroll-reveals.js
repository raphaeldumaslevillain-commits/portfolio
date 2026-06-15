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

  /* ---- HERO : reveal pinné depuis les côtés (expo.out) ---- */
  const hero = document.querySelector(".hero");
  if (hero) {
    const left = hero.querySelectorAll('[data-side="left"]');
    const right = hero.querySelectorAll('[data-side="right"]');
    const canvas = document.getElementById("heroCanvas");

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "+=115%",
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      },
    });

    if (canvas) tl.fromTo(canvas, { scale: 1.0 }, { scale: 1.14, ease: "none" }, 0);
    tl.from(left, { x: -140, autoAlpha: 0, stagger: 0.08, ease: "expo.out", duration: 0.6 }, 0.0);
    tl.from(right, { x: 140, autoAlpha: 0, stagger: 0.08, ease: "expo.out", duration: 0.6 }, 0.05);
    // léger fondu du voile + indicateur de scroll qui s'efface
    tl.to(".hero__scroll", { autoAlpha: 0, duration: 0.3 }, 0.2);
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
  gsap.set(ups, { y: 40, autoAlpha: 0 });
  ScrollTrigger.batch(ups, {
    start: "top 88%",
    onEnter: (batch) =>
      gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true }),
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
