/* ============================================================
   hero-shader.js — Masse liquide organique qui suit le curseur et
   rend l'image en NÉGATIF en dessous (fragment shader GLSL, Three.js).
   Bords vivants via FBM, inertie (lerp), réfraction + liseré lumineux.
   ============================================================ */
import * as THREE from "three";

/* ---- Image de fond (remplace facilement par ton URL/fichier) ---- */
const IMAGE = "portrait.png";

/* ---- Réglages du feeling ---- */
const LERP = 0.1;          // inertie du suivi souris (0.08–0.12)
const BASE_RADIUS = 0.22;  // taille de la masse
const EDGE = 0.10;         // douceur du bord (smoothstep)
const NOISE_AMP = 0.07;    // amplitude des ondulations de bord
const REFRACT = 0.05;      // réfraction (effet loupe/eau) près des bords
const RIM = 6.0;           // intensité du liseré lumineux (tension de surface)
const IDLE = 0.014;        // pulsation au repos

const VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2  uMouse;     // position souris en UV (0..1), lissée
  uniform float uTime;
  uniform float uAspect;    // ratio écran (x/y)
  uniform float uImgAspect; // ratio image

  /* ---------- simplex noise 2D (Ashima Arts) ---------- */
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  /* ---------- FBM (5 octaves) ---------- */
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * snoise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  /* champ du masque (1 au centre, 0 dehors), bords organiques */
  float maskField(vec2 pos, vec2 m){
    vec2 d = pos - m;
    float dist = length(d);
    float ang = atan(d.y, d.x);
    float wob  = fbm(vec2(cos(ang), sin(ang)) * 1.6 + uTime * 0.25); // ondulation du contour
    float blob = fbm(pos * 2.2 - uTime * 0.15);                       // déformation de la matière
    float radius = ${BASE_RADIUS.toFixed(3)} + wob * ${NOISE_AMP.toFixed(3)} + blob * 0.04 + sin(uTime * 1.2) * ${IDLE.toFixed(3)};
    return 1.0 - smoothstep(radius, radius + ${EDGE.toFixed(3)}, dist);
  }

  void main(){
    // --- cover (ratio image préservé) ---
    vec2 st = vUv;
    if (uAspect > uImgAspect) { st.y = (vUv.y - 0.5) * (uImgAspect / uAspect) + 0.5; }
    else                      { st.x = (vUv.x - 0.5) * (uAspect / uImgAspect) + 0.5; }

    // --- espace corrigé par l'aspect (masse ronde, pas ovale) ---
    vec2 pos = vec2(vUv.x * uAspect, vUv.y);
    vec2 m   = vec2(uMouse.x * uAspect, uMouse.y);

    float mask = maskField(pos, m);

    // gradient du masque -> réfraction + liseré
    float e = 0.0028;
    vec2 grad = vec2(
      maskField(pos + vec2(e, 0.0), m) - maskField(pos - vec2(e, 0.0), m),
      maskField(pos + vec2(0.0, e), m) - maskField(pos - vec2(0.0, e), m)
    );

    // réfraction près des bords (effet eau/loupe)
    vec2 refr = grad * ${REFRACT.toFixed(3)};
    vec3 base = texture2D(uTex, st + refr).rgb;

    // inversion (négatif) à l'intérieur de la masse
    vec3 inv = 1.0 - base;
    vec3 col = mix(base, inv, mask);

    // liseré lumineux (tension de surface)
    float rim = clamp(length(grad) * ${RIM.toFixed(1)}, 0.0, 1.0);
    col += rim * vec3(0.95, 0.97, 1.0) * 0.9;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function initHeroShader() {
  const stage = document.getElementById("heroCanvas");
  if (!stage) return null;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // WebGL indispo ou reduced-motion -> image statique (fallback CSS)
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    document.querySelector(".hero")?.classList.add("no-webgl");
    return null;
  }
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
    uTex: { value: null },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0 },
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

  // --- pointeur (souris + tactile), lissé par lerp ---
  const target = new THREE.Vector2(0.5, 0.5);
  function setFromEvent(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    target.set((clientX - r.left) / r.width, 1.0 - (clientY - r.top) / r.height);
  }
  stage.addEventListener("mousemove", (e) => setFromEvent(e.clientX, e.clientY));
  stage.addEventListener("touchmove", (e) => {
    if (e.touches[0]) setFromEvent(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h);
    uniforms.uAspect.value = w / h;
  }
  window.addEventListener("resize", resize);

  let running = false, raf = 0;
  const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    uniforms.uTime.value += clock.getDelta();
    uniforms.uMouse.value.lerp(target, LERP); // inertie / traînée
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; clock.getDelta(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // pause hors écran + onglet masqué (perf)
  const io = new IntersectionObserver(
    (en) => en.forEach((x) => (x.isIntersecting && !document.hidden ? start() : stop())),
    { threshold: 0.02 }
  );
  io.observe(document.querySelector(".hero"));
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  return { start, stop };
}
