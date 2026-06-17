/* ============================================================
   world.js — Décor 3D unique et cohérent (Three.js).
   UNE seule palette pour tout le site (pas de changement d'ambiance).
   Champ de particules + quelques formes filaires ; la caméra fait un
   léger dolly piloté par le scroll + parallax souris. 1 contexte WebGL,
   pause si onglet caché, allégé sur petit écran, désactivé en reduced-motion.
   ============================================================ */
import * as THREE from "three";

/* Palette de la marque (constante) */
const FOG = 0x0a0a0c;
const PALETTE = [0xff5c39, 0x6c5ce7, 0x00d4a0]; // accent, accent-2, accent-3
const PARTICLES = 2400;

export function initWorld() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = document.getElementById("bg3d");
  if (!stage || reduce) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return null; }

  const small = window.innerWidth < 720;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 9;

  // --- particules (sphère) ---
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    const r = 4 + Math.random() * 9;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = r * Math.cos(p);
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: PALETTE[0], size: 0.05, sizeAttenuation: true, transparent: true,
    opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(points);

  // --- formes filaires (couleurs constantes de la palette), décalées sur le côté ---
  const shapes = [];
  const defs = [
    { g: new THREE.TorusKnotGeometry(2.0, 0.55, 180, 22), c: PALETTE[0], x: 3.6, y: 0.4, z: -1.5, o: 0.32 },
    { g: new THREE.IcosahedronGeometry(1.2, 0), c: PALETTE[1], x: 3.2, y: 0.6, z: -1.0, o: 0.22 },
  ];
  if (!small) defs.push({ g: new THREE.OctahedronGeometry(1.0, 0), c: PALETTE[2], x: -4.2, y: -1.6, z: -2.0, o: 0.2 });
  defs.forEach((d) => {
    const m = new THREE.Mesh(d.g, new THREE.MeshBasicMaterial({ color: d.c, wireframe: true, transparent: true, opacity: d.o }));
    m.position.set(d.x, d.y, d.z);
    scene.add(m);
    shapes.push(m);
  });

  // --- souris (parallax) ---
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.tx = e.clientX / window.innerWidth - 0.5;
    mouse.ty = e.clientY / window.innerHeight - 0.5;
  });

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);

  let running = true;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) loop(); });

  const clock = new THREE.Clock();
  function loop() {
    if (!running) return;
    const t = clock.getElapsedTime();
    const sd = document.documentElement.scrollHeight - window.innerHeight;
    const sp = sd > 0 ? window.scrollY / sd : 0; // progression de scroll 0..1

    shapes.forEach((s, i) => {
      s.rotation.y = t * 0.15 + sp * Math.PI * (4 + i);
      s.rotation.x = t * 0.1 + sp * Math.PI * 2;
    });
    points.rotation.y = t * 0.02 + sp * 0.6;

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    scene.rotation.y = mouse.x * 0.35;
    scene.rotation.x = mouse.y * 0.35;
    camera.position.z = 9 - sp * 2.5; // léger dolly sur la longueur de la page

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return { dispose() { renderer.dispose(); } };
}
