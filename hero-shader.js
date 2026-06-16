/* ============================================================
   hero-shader.js — Fluide visqueux qui suit la souris et rend
   l'image en NÉGATIF là où il passe. (fragment shader GLSL, Three.js)
   Approche metaball : une chaîne de points qui se suivent avec inertie
   donne une masse gooey/visqueuse qui s'étire derrière le curseur.
   ============================================================ */
import * as THREE from "three";

/* ---- Image de fond (remplace facilement par ton fichier/URL) ---- */
const IMAGE = "portrait.png";

/* ---- Réglages ---- */
const TRAIL = 6;        // nombre de points de la traînée (viscosité)
const HEAD_LERP = 0.14; // inertie de la tête (suivi souris)
const TAIL_LERP = 0.35; // raideur de la traînée
const RADIUS = 0.14;    // taille des "boules" du metaball
const THRESH = 0.55;    // seuil du fluide
const EDGE = 0.22;      // douceur du bord (gooey)

const VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2  uTrail[${TRAIL}];  // points de la traînée, en UV (0..1)
  uniform float uAspect;           // ratio écran (x/y)
  uniform float uImgAspect;        // ratio image

  void main() {
    // --- cover : ratio de l'image préservé ---
    vec2 st = vUv;
    if (uAspect > uImgAspect) { st.y = (vUv.y - 0.5) * (uImgAspect / uAspect) + 0.5; }
    else                      { st.x = (vUv.x - 0.5) * (uAspect / uImgAspect) + 0.5; }

    // --- champ metaball : somme de gaussiennes le long de la traînée ---
    vec2 p = vec2(vUv.x * uAspect, vUv.y); // espace corrigé (boules rondes)
    float field = 0.0;
    for (int i = 0; i < ${TRAIL}; i++) {
      vec2 q = vec2(uTrail[i].x * uAspect, uTrail[i].y);
      float d = distance(p, q);
      field += exp(-(d * d) / (${RADIUS.toFixed(3)} * ${RADIUS.toFixed(3)}));
    }
    float mask = smoothstep(${THRESH.toFixed(3)} - ${EDGE.toFixed(3)}, ${THRESH.toFixed(3)} + ${EDGE.toFixed(3)}, field);

    // --- négatif uniquement sous le fluide ---
    vec3 base = texture2D(uTex, st).rgb;
    vec3 col = mix(base, 1.0 - base, mask);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function initHeroShader() {
  const stage = document.getElementById("heroCanvas");
  if (!stage) return null;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    document.querySelector(".hero")?.classList.add("no-webgl");
    return null;
  }
  if (reduce) { document.querySelector(".hero")?.classList.add("no-webgl"); return null; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // chaîne de points (tous au centre au départ)
  const trail = Array.from({ length: TRAIL }, () => new THREE.Vector2(0.5, 0.5));
  const target = new THREE.Vector2(0.5, 0.5);

  const uniforms = {
    uTex: { value: null },
    uTrail: { value: trail },
    uAspect: { value: stage.clientWidth / stage.clientHeight },
    uImgAspect: { value: 0.75 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  new THREE.TextureLoader().load(
    IMAGE,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      uniforms.uTex.value = tex;
      uniforms.uImgAspect.value = tex.image.width / tex.image.height;
    },
    undefined,
    () => { document.querySelector(".hero")?.classList.add("no-webgl"); stop(); }
  );

  // pointeur (souris + tactile)
  function setFromEvent(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    target.set((clientX - r.left) / r.width, 1.0 - (clientY - r.top) / r.height);
  }
  stage.addEventListener("mousemove", (e) => setFromEvent(e.clientX, e.clientY));
  stage.addEventListener("touchmove", (e) => { if (e.touches[0]) setFromEvent(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

  function resize() {
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    uniforms.uAspect.value = stage.clientWidth / stage.clientHeight;
  }
  window.addEventListener("resize", resize);

  let running = false, raf = 0;
  function frame() {
    if (!running) return;
    // tête suit la souris, le reste suit en chaîne -> traînée visqueuse
    trail[0].lerp(target, HEAD_LERP);
    for (let i = 1; i < TRAIL; i++) trail[i].lerp(trail[i - 1], TAIL_LERP);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const io = new IntersectionObserver(
    (en) => en.forEach((x) => (x.isIntersecting && !document.hidden ? start() : stop())),
    { threshold: 0.02 }
  );
  io.observe(document.querySelector(".hero"));
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  return { start, stop };
}
