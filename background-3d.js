/* ============================================================
   background-3d.js — Fond 3D global (Three.js)
   Champ de particules + objet filaire central qui tourne au scroll,
   parallax souris, couleur pilotée par la section (direction artistique).
   1 seul contexte WebGL, en pause quand l'onglet est caché.
   ============================================================ */
import * as THREE from "three";

const PARTICLES = 2600;

export function initBackground3D() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = document.getElementById("bg3d");
  if (!stage || reduce) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 9;

  const color = new THREE.Color("#ff5c39");
  const target = new THREE.Color("#ff5c39");

  // --- Particules (sphère) ---
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    const r = 4 + Math.random() * 8;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = r * Math.cos(p);
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({
    color, size: 0.05, sizeAttenuation: true, transparent: true,
    opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // --- Objet filaire (décalé sur le côté pour ne pas gêner la lecture) ---
  const oGeo = new THREE.IcosahedronGeometry(2.5, 1);
  const oMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.32 });
  const obj = new THREE.Mesh(oGeo, oMat);
  obj.position.set(3.4, 0.4, -1.5);
  scene.add(obj);

  const oGeo2 = new THREE.IcosahedronGeometry(1.35, 0);
  const obj2 = new THREE.Mesh(oGeo2, new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.2 }));
  obj2.position.copy(obj.position);
  scene.add(obj2);

  // --- Souris (parallax) ---
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5);
    mouse.ty = (e.clientY / window.innerHeight - 0.5);
  });

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);

  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) loop();
  });

  const clock = new THREE.Clock();
  function loop() {
    if (!running) return;
    const dt = clock.getDelta();
    const t = clock.elapsedTime;
    const sd = document.documentElement.scrollHeight - window.innerHeight;
    const sp = sd > 0 ? window.scrollY / sd : 0; // progression de scroll 0..1

    color.lerp(target, 0.04);
    pMat.color.copy(color);
    oMat.color.copy(color);
    obj2.material.color.copy(color);

    obj.rotation.y = sp * Math.PI * 4 + t * 0.05;
    obj.rotation.x = sp * Math.PI * 2;
    obj2.rotation.y = -sp * Math.PI * 3 - t * 0.08;
    obj2.rotation.z = sp * Math.PI * 2;
    points.rotation.y = t * 0.02 + sp * 0.6;

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    scene.rotation.y = mouse.x * 0.4;
    scene.rotation.x = mouse.y * 0.4;
    camera.position.z = 9 - sp * 2.5; // léger zoom sur la longueur de la page

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return {
    setColor(hex) { target.set(hex); },
  };
}
