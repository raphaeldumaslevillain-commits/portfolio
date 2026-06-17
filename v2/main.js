/* ============================================================
   v2/main.js — Orchestrateur
   Lenis (smooth scroll à inertie) + GSAP ScrollTrigger (scrub) +
   SplitText (typographie cinétique). Pilote la scène 3D au scroll,
   gère les reveals (IntersectionObserver, robuste), le curseur, les
   survols de la liste de projets et la nav.
   ============================================================ */
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import Lenis from "lenis";
import { initScene } from "./scene.js";

gsap.registerPlugin(ScrollTrigger, SplitText);
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Smooth scroll (inertie organique) ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function goTo(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  lenis ? lenis.scrollTo(el) : el.scrollIntoView({ behavior: "smooth" });
}

/* ---------- Scène 3D + lien au scroll ---------- */
const gl = document.getElementById("gl");
const scene = gl ? initScene(gl) : null;
if (scene) {
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => scene.setScroll(self.progress) });
}

/* ---------- Année ---------- */
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

/* ---------- Préchargeur ---------- */
window.addEventListener("load", () => {
  document.getElementById("preloader")?.classList.add("is-done");
  ScrollTrigger.refresh();
});
document.fonts?.ready.then(() => ScrollTrigger.refresh());

/* ---------- Curseur custom ---------- */
(function cursor() {
  const c = document.getElementById("cursor");
  if (!c || !window.matchMedia("(hover: hover)").matches) return;
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; });
  (function r() { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; c.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(r); })();
  addEventListener("mouseover", (e) => {
    const hit = e.target.closest("a, button, .work__row, [data-cursor]");
    c.classList.toggle("is-active", !!hit);
  });
})();

/* ---------- Typographie cinétique (SplitText) ---------- */
if (!reduce) {
  document.querySelectorAll("[data-split]").forEach((el) => {
    const split = new SplitText(el, { type: "lines,chars", linesClass: "line", charsClass: "char" });
    gsap.set(el, { opacity: 1 }); // le parent était masqué (anti-flash) ; les chars restent cachés
    gsap.set(split.chars, { yPercent: 115, rotateX: -80, opacity: 0 });

    const animate = () => gsap.to(split.chars, {
      yPercent: 0, rotateX: 0, opacity: 1, duration: 1, ease: "power4.out", stagger: 0.018,
    });

    if (el.dataset.split === "hero") {
      // le titre d'accueil se construit au chargement
      gsap.delayedCall(0.35, animate);
    } else {
      ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: animate });
    }

    // cisaillement piloté par le scroll (vivant)
    gsap.to(el, { skewX: -6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 } });
  });
}

/* ---------- Reveals robustes (IntersectionObserver) ---------- */
if (!reduce) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      gsap.to(e.target, { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out", onComplete: () => gsap.set(e.target, { clearProps: "transform" }) });
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    gsap.set(el, { y: 60, autoAlpha: 0 });
    io.observe(el);
  });
}

/* ---------- Liste de projets : survol signature (aperçu qui suit + magnétisme) ---------- */
(function work() {
  const preview = document.getElementById("preview");
  const img = preview?.querySelector("img");
  const rows = document.querySelectorAll(".work__row");
  if (!rows.length) return;
  const hover = window.matchMedia("(hover: hover)").matches && !reduce;

  rows.forEach((row) => {
    if (hover && preview && img) {
      row.addEventListener("mouseenter", () => {
        img.src = row.dataset.img || "";
        gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power3.out" });
      });
      row.addEventListener("mouseleave", () => gsap.to(preview, { autoAlpha: 0, scale: 0.9, duration: 0.3 }));
      row.addEventListener("mousemove", (e) => {
        gsap.to(preview, { x: e.clientX, y: e.clientY, duration: 0.6, ease: "power3.out" });
        // magnétisme du libellé
        const t = row.querySelector(".work__title");
        const r = row.getBoundingClientRect();
        gsap.to(t, { x: (e.clientX - r.left - r.width / 2) * 0.06, duration: 0.5, ease: "power3.out" });
      });
      row.addEventListener("mouseleave", () => gsap.to(row.querySelector(".work__title"), { x: 0, duration: 0.5 }));
    }
    // accessibilité : ouvrir au clavier (lien interne)
    row.addEventListener("keydown", (e) => { if (e.key === "Enter") row.querySelector("a")?.click(); });
  });
})();

/* ---------- Nav : ancres + menu mobile ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const h = a.getAttribute("href");
    if (h.length > 1) { e.preventDefault(); goTo(h); document.body.classList.remove("menu-open"); }
  })
);
document.getElementById("burger")?.addEventListener("click", () => document.body.classList.toggle("menu-open"));

document.documentElement.classList.add("app-ready");
