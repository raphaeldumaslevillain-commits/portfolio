/* ============================================================
   main.js — Orchestrateur : Lenis (smooth scroll) + GSAP + modules
   ============================================================ */
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Flip from "gsap/Flip";
import Lenis from "lenis";

import { initHeroShader } from "./hero-shader.js";
import { initBox } from "./box.js";
import { initScrollReveals } from "./scroll-reveals.js";
import { initProjectsDeck } from "./projects-deck.js";
import { initWorld } from "./world.js";

gsap.registerPlugin(ScrollTrigger, Flip);
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Lenis smooth scroll (synchronisé à ScrollTrigger) ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -10 });
  else el.scrollIntoView({ behavior: "smooth" });
}

/* ---------- Preloader ---------- */
window.addEventListener("load", () => {
  const pre = document.getElementById("preloader");
  if (pre) setTimeout(() => pre.classList.add("is-done"), 1100);
  ScrollTrigger.refresh();
});

/* ---------- Année ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Curseur personnalisé ---------- */
(function cursor() {
  const c = document.getElementById("cursor");
  const dot = document.getElementById("cursorDot");
  if (!c || !dot || !window.matchMedia("(hover: hover)").matches) return;
  let mx = 0, my = 0, cx = 0, cy = 0;
  window.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  (function loop() {
    cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
    c.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-cursor]");
    c.classList.remove("is-hover", "is-view");
    if (t) c.classList.add(t.getAttribute("data-cursor") === "view" ? "is-view" : "is-hover");
  });
})();

/* ---------- Nav : état scrollé + menu mobile + liens ancres ---------- */
(function nav() {
  const nav = document.getElementById("nav");
  ScrollTrigger.create({
    start: 40,
    end: "max",
    onToggle: (self) => nav && nav.classList.toggle("is-scrolled", self.isActive),
  });

  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobileMenu");
  const toggle = (open) => {
    burger.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    document.documentElement.style.overflow = open ? "hidden" : "";
  };
  if (burger && menu) {
    burger.addEventListener("click", () => toggle(!burger.classList.contains("is-open")));
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      if (hash.length < 2) return;
      e.preventDefault();
      if (menu && menu.classList.contains("is-open")) toggle(false);
      scrollToTarget(hash);
    });
  });
})();

/* ---------- Compteurs animés ---------- */
document.querySelectorAll(".stat__num[data-count]").forEach((el) => {
  const target = parseInt(el.getAttribute("data-count"), 10);
  ScrollTrigger.create({
    trigger: el,
    start: "top 85%",
    once: true,
    onEnter: () => {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.4,
        ease: "power3.out",
        onUpdate: () => (el.textContent = Math.round(obj.v)),
      });
    },
  });
});

/* ---------- Rotator du hero (mots qui défilent) ---------- */
(function rotator() {
  const rot = document.getElementById("rotator");
  if (!rot) return;
  const words = [...rot.querySelectorAll("span")];
  if (!words.length) return;
  words[0].classList.add("is-active");
  if (reduce) return;
  let i = 0;
  setInterval(() => {
    words[i].classList.remove("is-active");
    words[i].classList.add("is-out");
    setTimeout(() => words[i].classList.remove("is-out"), 500);
    i = (i + 1) % words.length;
    words[i].classList.add("is-active");
  }, 2400);
})();

/* ---------- Boutons magnétiques ---------- */
if (window.matchMedia("(hover: hover)").matches && !reduce) {
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - r.left - r.width / 2) * 0.25,
        y: (e.clientY - r.top - r.height / 2) * 0.35,
        duration: 0.4,
        ease: "power3.out",
      });
    });
    el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.4)" }));
  });
}

/* ---------- Lancement des modules ---------- */
initWorld();
initBox();
initHeroShader();
initScrollReveals({ gsap, ScrollTrigger, reduce });
initProjectsDeck({ gsap, ScrollTrigger, Flip, lenis, reduce });

// Tout est initialisé : on signale que l'app est prête (filet de sécurité du <head>).
document.documentElement.classList.add("app-ready");
