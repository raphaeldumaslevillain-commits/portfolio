/* ============================================================
   hero-shader.js — "Verre liquide" : une nappe de verre se répand sous
   le curseur (réfraction + aberration chromatique + spéculaire + Fresnel)
   et se RÉSORBE après quelques secondes d'immobilité (uIntensity -> 0).
   Fragment shader GLSL custom, Three.js. Approche metaball pour la matière.
   ============================================================ */
import * as THREE from "three";

/* ---- Image de fond (remplace facilement par ton fichier/URL) ---- */
const IMAGE = "portrait.png";

/* ---- Réglages ---- */
const TRAIL = 6;         // points de la traînée (matière qui s'étire)
const HEAD_LERP = 0.16;  // inertie de la tête
const TAIL_LERP = 0.34;  // raideur de la traînée
const RADIUS = 0.15;     // taille des boules du metaball
const THRESH = 0.55;     // seuil de la matière
const EDGE = 0.20;       // douceur du bord
const REFRACT = 0.12;    // force de réfraction (effet verre)
const CHROMA = 0.35;     // aberration chromatique
const SHINE = 48.0;      // dureté du spéculaire
const HOLD = 1.8;        // secondes avant de commencer à se résorber
const FADE = 0.05;       // vitesse de résorption / apparition

const VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2  uTrail[${TRAIL}];
  uniform float uAspect;
  uniform float uImgAspect;
  uniform float uIntensity;   // 1 quand actif, ->0 quand la souris est immobile

  // champ metaball (somme de gaussiennes le long de la traînée)
  float field(vec2 p){
    float f = 0.0;
    for (int i = 0; i < ${TRAIL}; i++) {
      vec2 q = vec2(uTrail[i].x * uAspect, uTrail[i].y);
      float d = distance(p, q);
      f += exp(-(d * d) / (${RADIUS.toFixed(3)} * ${RADIUS.toFixed(3)}));
    }
    return f * uIntensity;
  }
  // hauteur (0..1) de la nappe de verre
  float height(vec2 p){
    return smoothstep(${THRESH.toFixed(3)} - ${EDGE.toFixed(3)}, ${THRESH.toFixed(3)} + ${EDGE.toFixed(3)}, field(p));
  }

  void main(){
    // cover (ratio image préservé)
    vec2 st = vUv;
    if (uAspect > uImgAspect) { st.y = (vUv.y - 0.5) * (uImgAspect / uAspect) + 0.5; }
    else                      { st.x = (vUv.x - 0.5) * (uAspect / uImgAspect) + 0.5; }

    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    float h = height(p);

    // normale de la surface du verre (à partir du gradient de la hauteur)
    float e = 0.0026;
    float hx = height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0));
    float hy = height(p + vec2(0.0, e)) - height(p - vec2(0.0, e));
    vec3 n = normalize(vec3(-hx, -hy, 0.06));

    // réfraction + aberration chromatique (matière "verre")
    vec2 off = n.xy * ${REFRACT.toFixed(3)} * h;
    vec3 col;
    col.r = texture2D(uTex, st + off * (1.0 + ${CHROMA.toFixed(3)})).r;
    col.g = texture2D(uTex, st + off).g;
    col.b = texture2D(uTex, st + off * (1.0 - ${CHROMA.toFixed(3)})).b;

    // éclairage : spéculaire + Fresnel (liseré de tension de surface)
    vec3 L = normalize(vec3(0.45, 0.7, 1.0));
    float spec = pow(max(dot(n, L), 0.0), ${SHINE.toFixed(1)}) * h;
    float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0) * h;
    col += spec * vec3(1.0) + fres * vec3(0.75, 0.82, 1.0) * 0.5;
    col = mix(col, col * 1.06 + 0.02, h); // léger gain de luminosité dans le verre

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

  const trail = Array.from({ length: TRAIL }, () => new THREE.Vector2(0.5, 0.5));
  const target = new THREE.Vector2(0.5, 0.5);

  const uniforms = {
    uTex: { value: null },
    uTrail: { value: trail },
    uAspect: { value: stage.clientWidth / stage.clientHeight },
    uImgAspect: { value: 0.75 },
    uIntensity: { value: 0 },
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

  // pointeur + horodatage du dernier mouvement (pour la résorption)
  let lastMove = -Infinity;
  function setFromEvent(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    target.set((clientX - r.left) / r.width, 1.0 - (clientY - r.top) / r.height);
    lastMove = performance.now();
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
    trail[0].lerp(target, HEAD_LERP);
    for (let i = 1; i < TRAIL; i++) trail[i].lerp(trail[i - 1], TAIL_LERP);
    // résorption : la matière s'estompe après HOLD secondes sans mouvement
    const idle = (performance.now() - lastMove) / 1000;
    const want = idle < HOLD ? 1 : 0;
    uniforms.uIntensity.value += (want - uniforms.uIntensity.value) * FADE;
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
