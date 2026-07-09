/* ============================================================
   v3/world.js — Fond "ORGANISME" (repris de la V2, en arrière-plan).
   La sphère piquante : icosaèdre haute densité déformé par un bruit
   simplex 3D (vertex shader custom), iridescence Fresnel (fragment),
   nuage de particules (simplex-noise), post-traité (bloom + aberration
   chromatique + grain + vignette). Piloté par le scroll + la souris.
   Garde l'API initWorld() de la V1 (le reste du flux ne change pas).
   ============================================================ */
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, ChromaticAberrationEffect, NoiseEffect, VignetteEffect, BlendFunction,
} from "postprocessing";

const GLSL_SNOISE = `
vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const VERT = `
  uniform float uTime, uAmp, uFreq;
  uniform vec3 uMouse;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;
  ${GLSL_SNOISE}
  float fbm(vec3 p){ return snoise(p) * 0.6 + snoise(p * 2.1 + 11.0) * 0.4; }
  void main(){
    vec3 dir = normalize(position);
    float n = fbm(dir * uFreq + uTime * 0.25);
    float m = smoothstep(0.2, 1.0, dot(dir, normalize(uMouse))) * 0.5;
    float disp = (n + m) * uAmp;
    vec3 displaced = position + normal * disp;
    vDisp = disp;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = `
  uniform vec3 uColorA, uColorB;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;
  void main(){
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.4);
    vec3 col = mix(uColorA, uColorB, clamp(fres + vDisp * 1.6, 0.0, 1.0));
    col += fres * 1.5;
    col = mix(col, vec3(1.0), clamp(vDisp * 1.1, 0.0, 0.5));
    gl_FragColor = vec4(col, 1.0);
  }`;

export function initWorld() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = document.getElementById("bg3d");
  if (!stage || reduce) return null;

  const small = window.innerWidth < 760;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x05050a, 1);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.z = 5;

  // créature (sphère piquante)
  const detail = small ? 4 : 6;
  const geo = new THREE.IcosahedronGeometry(1.5, detail);
  const uniforms = {
    uTime: { value: 0 }, uAmp: { value: 0.18 }, uFreq: { value: 1.6 },
    uMouse: { value: new THREE.Vector3(0, 0, 1) },
    uColorA: { value: new THREE.Color("#0a0a14") },
    uColorB: { value: new THREE.Color("#6b78ff") },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
  const creature = new THREE.Mesh(geo, mat);
  scene.add(creature);

  // particules générées au bruit simplex
  const noise3D = createNoise3D();
  const COUNT = small ? 1200 : 2800;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
    const r = 2.6 + noise3D(Math.cos(a), Math.sin(a), b) * 1.6 + Math.random() * 1.2;
    pos[i * 3] = r * Math.sin(b) * Math.cos(a);
    pos[i * 3 + 1] = r * Math.sin(b) * Math.sin(a);
    pos[i * 3 + 2] = r * Math.cos(b);
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x8b9bff, size: 0.02, sizeAttenuation: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(points);

  // post-processing (off sur petit GPU)
  const usePost = !small;
  let composer = null, bloom = null;
  if (usePost) {
    composer = new EffectComposer(renderer, { multisampling: Math.min(4, renderer.capabilities.maxSamples || 0) });
    composer.addPass(new RenderPass(scene, camera));
    bloom = new BloomEffect({ intensity: 1.2, luminanceThreshold: 0.25, luminanceSmoothing: 0.35, mipmapBlur: true });
    const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0009, 0.0009), radialModulation: true, modulationOffset: 0.3 });
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY }); grain.blendMode.opacity.value = 0.14;
    const vig = new VignetteEffect({ offset: 0.25, darkness: 0.7 });
    composer.addPass(new EffectPass(camera, bloom, ca, grain, vig));
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function onMove(e) {
    const t = e.touches ? e.touches[0] : e;
    mouse.tx = (t.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -((t.clientY / window.innerHeight) * 2 - 1);
  }
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove, { passive: true });

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer && composer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);

  let running = true, raf = 0;
  const clock = new THREE.Clock();
  function loop() {
    if (!running) return;
    const dt = clock.getDelta();
    if (!reduce) uniforms.uTime.value += dt;

    // progression de scroll (auto-pilotée, comme l'ancien fond V1)
    const sd = document.documentElement.scrollHeight - window.innerHeight;
    const sp = sd > 0 ? Math.min(1, Math.max(0, window.scrollY / sd)) : 0;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    uniforms.uMouse.value.set(mouse.x, mouse.y, 0.6);

    uniforms.uAmp.value = 0.16 + sp * 0.5;
    uniforms.uFreq.value = 1.5 + sp * 1.8;
    creature.rotation.y += dt * 0.12 + sp * 0.002;
    creature.rotation.x = sp * 1.2;
    points.rotation.y -= dt * 0.03;
    camera.position.z = 5 - sp * 1.6;
    camera.position.x = mouse.x * 0.5;
    camera.position.y = mouse.y * 0.4;
    camera.lookAt(0, 0, 0);
    if (bloom) bloom.intensity = 1.0 + sp * 1.2;

    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!running) { running = true; loop(); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  loop();
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  return { dispose() { stop(); geo.dispose(); mat.dispose(); pGeo.dispose(); composer && composer.dispose(); renderer.dispose(); } };
}
