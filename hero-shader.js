/* ============================================================
   hero-shader.js — Portrait plein écran avec effet liquide (WebGL / Three.js)
   Une onde part du curseur et déforme l'image + applique une gradient map
   localement. Réutilise Three.js (déjà chargé pour la boîte).
   ============================================================ */
import * as THREE from "three";

/* ---- Réglages du feeling (ajuste librement) ---- */
const FREQ = 26.0;     // fréquence des ondulations
const SPEED = 3.2;     // vitesse de propagation
const DECAY = 7.0;     // atténuation avec la distance (plus haut = plus localisé)
const AMPLITUDE = 0.06;// force du déplacement liquide
const INTENSITE = 2.4; // dosage de la gradient map dans la zone touchée

/* ---- Dégradé de la courbe de transfert (2–3 couleurs) ---- */
const GRAD = [
  new THREE.Color("#ff5c39"),
  new THREE.Color("#6c5ce7"),
  new THREE.Color("#00d4a0"),
];

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2  uMouse;
  uniform float uTime;
  uniform float uHover;
  uniform float uAspect;       // ratio écran (x/y) -> ondes circulaires
  uniform float uImageAspect;  // ratio de l'image -> cover
  uniform vec3  uGrad0;
  uniform vec3  uGrad1;
  uniform vec3  uGrad2;

  vec3 gradientMap(float t) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.5) return mix(uGrad0, uGrad1, t * 2.0);
    return mix(uGrad1, uGrad2, (t - 0.5) * 2.0);
  }

  void main() {
    // --- cover : on garde le ratio de l'image quel que soit l'écran ---
    vec2 st = vUv;
    if (uAspect > uImageAspect) {
      st.y = (vUv.y - 0.5) * (uImageAspect / uAspect) + 0.5;
    } else {
      st.x = (vUv.x - 0.5) * (uAspect / uImageAspect) + 0.5;
    }

    // --- onde liquide en espace corrigé par l'aspect (cercles, pas ovales) ---
    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    vec2 m = vec2(uMouse.x * uAspect, uMouse.y);
    float d = distance(p, m);
    float wave = sin(d * ${FREQ.toFixed(1)} - uTime * ${SPEED.toFixed(1)}) * exp(-d * ${DECAY.toFixed(1)});
    float influence = wave * uHover;

    vec2 dir = normalize(p - m + 1e-5);
    vec2 disp = dir * influence * ${AMPLITUDE.toFixed(3)};
    disp.x /= uAspect; // retour en espace UV
    vec2 uvD = st + disp;

    vec4 color = texture2D(uTexture, uvD);

    // --- gradient map locale ---
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 graded = gradientMap(lum);
    float k = clamp(abs(influence) * ${INTENSITE.toFixed(2)}, 0.0, 1.0);
    vec3 finalColor = mix(color.rgb, graded, k);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function initHeroShader() {
  const stage = document.getElementById("heroCanvas");
  if (!stage) return null;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  // WebGL dispo ?
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    document.querySelector(".hero")?.classList.add("no-webgl");
    return null;
  }

  // En reduced-motion : on laisse le fallback CSS (image statique), pas de WebGL.
  if (reduce) {
    document.querySelector(".hero")?.classList.add("no-webgl");
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTexture: { value: null },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0 },
    uHover: { value: coarse ? 0.55 : 0 },
    uAspect: { value: stage.clientWidth / stage.clientHeight },
    uImageAspect: { value: 0.75 },
    uGrad0: { value: GRAD[0] },
    uGrad1: { value: GRAD[1] },
    uGrad2: { value: GRAD[2] },
  };

  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  // Texture portrait
  new THREE.TextureLoader().load(
    "portrait.png",
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      uniforms.uTexture.value = tex;
      uniforms.uImageAspect.value = tex.image.width / tex.image.height;
    },
    undefined,
    () => {
      // Pas d'image -> on bascule sur le fallback CSS
      document.querySelector(".hero")?.classList.add("no-webgl");
      stop();
    }
  );

  // Souris (lissée par lerp)
  const target = new THREE.Vector2(0.5, 0.5);
  let targetHover = coarse ? 0.55 : 0;

  function onMove(e) {
    const r = stage.getBoundingClientRect();
    target.set((e.clientX - r.left) / r.width, 1.0 - (e.clientY - r.top) / r.height);
  }
  if (!coarse) {
    stage.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseenter", () => (targetHover = 1));
    stage.addEventListener("mouseleave", () => (targetHover = 0));
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h);
    uniforms.uAspect.value = w / h;
  }
  window.addEventListener("resize", resize);

  // Boucle gérée par visibilité (pause hors écran)
  let running = false;
  let raf = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    const dt = clock.getDelta();
    uniforms.uTime.value += dt;

    // suivi auto sur tactile
    if (coarse) {
      const t = uniforms.uTime.value;
      target.set(0.5 + Math.sin(t * 0.6) * 0.22, 0.5 + Math.cos(t * 0.45) * 0.22);
    }
    uniforms.uMouse.value.lerp(target, 0.08);
    uniforms.uHover.value += (targetHover - uniforms.uHover.value) * 0.06;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Pause quand le hero sort de l'écran
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => (en.isIntersecting ? start() : stop())),
    { threshold: 0.02 }
  );
  io.observe(document.querySelector(".hero"));

  return { start, stop };
}
