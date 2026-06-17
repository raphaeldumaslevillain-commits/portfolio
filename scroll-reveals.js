/* ============================================================
   scroll-reveals.js — Apparitions au scroll.
   IMPORTANT : les reveals utilisent un IntersectionObserver (basé sur la
   visibilité RÉELLE des éléments) et non les positions de ScrollTrigger,
   qui se désynchronisent avec les sections épinglées (pins). Résultat :
   aucune apparition ne peut rester "coincée" invisible.
   ScrollTrigger ne sert plus qu'au hero (pin) et au parallax/progression.
   ============================================================ */

export function initScrollReveals({ gsap, ScrollTrigger, reduce }) {
  /* ---- Barre de progression (ne masque rien) ---- */
  const bar = document.getElementById("scrollProgress");
  if (bar) {
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => gsap.set(bar, { width: self.progress * 100 + "%" }),
    });
  }

  // reduced-motion : tout reste visible, on ne crée aucune animation.
  if (reduce) return;

  /* ---- HERO : seule la photo au départ, les infos arrivent au scroll (pin + scrub) ---- */
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

  /* ============================================================
     Reveals via IntersectionObserver (robustes)
     ============================================================ */
  const DIRS = { up: { y: 70 }, down: { y: -70 }, left: { x: -100 }, right: { x: 100 } };

  // Découpe des titres en mots (typographie qui se construit)
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
    gsap.set(inners, { yPercent: 115 });
    el._reveal = () => gsap.to(inners, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.06 });
  });

  // Apparitions simples (.reveal-up)
  document.querySelectorAll(".reveal-up").forEach((el) => {
    gsap.set(el, { y: 60, autoAlpha: 0 });
    el._reveal = () => gsap.to(el, { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out", onComplete: () => gsap.set(el, { clearProps: "transform" }) });
  });

  // Apparitions directionnelles (.r-up / .r-down / .r-left / .r-right)
  Object.keys(DIRS).forEach((dir) => {
    document.querySelectorAll(".r-" + dir).forEach((el) => {
      gsap.set(el, { ...DIRS[dir], autoAlpha: 0 });
      el._reveal = () => gsap.to(el, { x: 0, y: 0, autoAlpha: 1, duration: 1.1, ease: "power4.out", onComplete: () => gsap.set(el, { clearProps: "transform" }) });
    });
  });

  // Apparitions en cascade ([data-stagger] anime ses enfants)
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    const kids = gsap.utils.toArray(group.children);
    gsap.set(kids, { y: 50, autoAlpha: 0 });
    group._reveal = () => gsap.to(kids, { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out", stagger: 0.12, onComplete: () => gsap.set(kids, { clearProps: "transform" }) });
  });

  // Un seul observer pour tout : déclenche dès que l'élément est réellement visible
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target._reveal) entry.target._reveal();
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal-words, .reveal-up, .r-up, .r-down, .r-left, .r-right, [data-stagger]")
    .forEach((el) => io.observe(el));

  /* ---- Parallax léger ([data-parallax]) — ne masque rien ---- */
  gsap.utils.toArray("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 60;
    gsap.fromTo(el, { y: -amount * 0.5 }, {
      y: amount * 0.5, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}
