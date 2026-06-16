/* ============================================================
   theme.js — Direction artistique par section
   Chaque section impose son accent + sa teinte de fond, en transition
   douce (accent via @property, fond via transition CSS). Pilote aussi
   la couleur du fond 3D (particules + objet).
   ============================================================ */

const THEMES = {
  hero:     { accent: "#ff5c39", bg: "#0a0a0c" },
  box:      { accent: "#ff7eb6", bg: "#15100e" }, // packaging / macaron
  projects: { accent: "#3d9bff", bg: "#090e16" }, // éditorial / tech
  stats:    { accent: "#ffb020", bg: "#15120a" }, // chiffres
  about:    { accent: "#ff5c39", bg: "#0c0a0a" },
  skills:   { accent: "#00d4a0", bg: "#08120f" }, // teal
  ai:       { accent: "#9b8cff", bg: "#0d0a17" }, // futuriste violet
  journey:  { accent: "#ff6ec7", bg: "#150a12" }, // rose
  contact:  { accent: "#ff5c39", bg: "#0a0a0c" },
};

export function initThemes({ ScrollTrigger, bg3d, reduce }) {
  const root = document.documentElement;

  function apply(id) {
    const th = THEMES[id];
    if (!th) return;
    root.style.setProperty("--accent", th.accent);
    document.body.style.backgroundColor = th.bg;
    document.body.dataset.theme = id;
    if (bg3d) { bg3d.setColor(th.accent); bg3d.setShape(id); }
  }

  apply("hero");
  if (reduce) return;

  Object.keys(THEMES).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: "top 55%",
      end: "bottom 45%",
      onEnter: () => apply(id),
      onEnterBack: () => apply(id),
    });
  });
}
