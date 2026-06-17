/* ============================================================
   world.js — "Travelling caméra" : un couloir 3D continu.
   Le scroll fait avancer la caméra de salle en salle (1 salle par section).
   Brume, lumière et couleurs s'interpolent en continu -> une seule
   expérience, pas des pages collées. Un objet 3D persistant suit la
   caméra et change de matière/forme selon le monde (fil conducteur).
   1 contexte WebGL, pause si onglet caché, dégradé propre (reduced-motion
   / pas de WebGL -> on garde l'ambiance CSS par section).
   ============================================================ */
import * as THREE from "three";

/* Salles, dans l'ordre de scroll. couleur = accent du monde, fog = brume sombre teintée */
const ZONES = [
  { id: "hero",     accent: 0xff7eb6, fog: 0x120a10 }, // Luminescent (rose éthéré)
  { id: "box",      accent: 0xff7eb6, fog: 0x15100e },
  { id: "projects", accent: 0x3d9bff, fog: 0x08111f }, // éditorial / tech (bleu)
  { id: "stats",    accent: 0xffb020, fog: 0x15120a }, // ambre
  { id: "about",    accent: 0xff5c39, fog: 0x0c0a0a },
  { id: "skills",   accent: 0x00d4a0, fog: 0x08120f }, // teal
  { id: "ai",       accent: 0x9b8cff, fog: 0x0d0a17 }, // futuriste violet
  { id: "journey",  accent: 0xff6ec7, fog: 0x150a12 }, // rose
  { id: "contact",  accent: 0xff5c39, fog: 0x0a0a0c },
];

const SPACING = 14;                       // distance entre deux salles
const TRACK = (ZONES.length - 1) * SPACING;
const CAM_START = 6;                      // la caméra démarre devant la salle 0

export function initWorld() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = document.getElementById("bg3d");
  if (!stage || reduce) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) { return null; }

  const small = window.innerWidth < 720; // moins d'objets sur petits écrans / GPU
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(ZONES[0].fog, 0.026);
  scene.background = new THREE.Color(ZONES[0].fog);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, CAM_START);

  // lumières (le point light prend la couleur du monde, suit la caméra)
  scene.add(new THREE.AmbientLight(0x404050, 1.1));
  const key = new THREE.PointLight(ZONES[0].accent, 60, 60);
  scene.add(key);

  /* ---------- Le couloir : un anneau par salle + anneaux intermédiaires ---------- */
  const rings = [];
  const ringGeo = new THREE.TorusGeometry(6, 0.05, 6, 64);
  for (let i = 0; i < ZONES.length; i++) {
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: ZONES[i].accent, transparent: true, opacity: 0.4 }));
      m.position.z = -i * SPACING - k * (SPACING / 2);
      m.rotation.z = (i + k) * 0.4;
      m.userData.zone = i;
      scene.add(m);
      rings.push(m);
    }
  }

  /* ---------- Formes signatures flottantes par salle (sur les côtés) ---------- */
  const accentShapes = [];
  if (!small) {
    const protos = [
      new THREE.IcosahedronGeometry(0.9, 0),
      new THREE.TorusGeometry(0.8, 0.28, 10, 28),
      new THREE.OctahedronGeometry(0.95, 0),
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
    ];
    for (let i = 0; i < ZONES.length; i++) {
      for (let j = 0; j < 3; j++) {
        const g = protos[(i + j) % protos.length];
        const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: ZONES[i].accent, wireframe: true, transparent: true, opacity: 0.45 }));
        const side = j % 2 === 0 ? -1 : 1;
        mesh.position.set(side * (4.2 + Math.random() * 1.6), (Math.random() - 0.5) * 6, -i * SPACING + (Math.random() - 0.5) * 6);
        mesh.userData.spin = (Math.random() - 0.5) * 0.01;
        scene.add(mesh);
        accentShapes.push(mesh);
      }
    }
  }

  /* ---------- Objet 3D persistant (fil conducteur) : suit la caméra, change de matière ---------- */
  function heroGeo(i) {
    switch (ZONES[i].id) {
      case "box":      return new THREE.TorusGeometry(1.5, 0.5, 24, 90);
      case "projects": return new THREE.BoxGeometry(2.2, 2.2, 2.2, 2, 2, 2);
      case "stats":    return new THREE.OctahedronGeometry(1.9, 0);
      case "about":    return new THREE.TorusKnotGeometry(1.2, 0.4, 160, 20);
      case "skills":   return new THREE.DodecahedronGeometry(1.8, 0);
      case "ai":       return new THREE.TorusKnotGeometry(1.1, 0.34, 220, 26, 2, 3);
      case "journey":  return new THREE.ConeGeometry(1.7, 2.4, 6, 2);
      case "contact":  return new THREE.IcosahedronGeometry(1.9, 1);
      default:         return new THREE.TorusKnotGeometry(1.4, 0.42, 180, 22);
    }
  }
  const matterMat = new THREE.MeshStandardMaterial({
    color: ZONES[0].accent, roughness: 0.25, metalness: 0.6, flatShading: false,
    emissive: ZONES[0].accent, emissiveIntensity: 0.18,
  });
  const matter = new THREE.Mesh(heroGeo(0), matterMat);
  scene.add(matter);
  let matterZone = 0;
  const POP = new THREE.Vector3(1, 1, 1);

  /* ---------- Interpolation des couleurs entre salles ---------- */
  const cFog = new THREE.Color(), cAcc = new THREE.Color();
  const tmpA = new THREE.Color(), tmpB = new THREE.Color();
  function palette(zoneFloat) {
    const i = Math.max(0, Math.min(ZONES.length - 1, Math.floor(zoneFloat)));
    const j = Math.min(ZONES.length - 1, i + 1);
    const f = zoneFloat - i;
    cFog.copy(tmpA.setHex(ZONES[i].fog)).lerp(tmpB.setHex(ZONES[j].fog), f);
    cAcc.copy(tmpA.setHex(ZONES[i].accent)).lerp(tmpB.setHex(ZONES[j].accent), f);
    return i;
  }

  /* ---------- Souris (parallax) ---------- */
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
    const progress = sd > 0 ? Math.min(1, Math.max(0, window.scrollY / sd)) : 0;
    const zoneFloat = progress * (ZONES.length - 1);
    const nearest = palette(zoneFloat);

    // brume + fond
    scene.fog.color.copy(cFog);
    scene.background.copy(cFog);
    key.color.copy(cAcc);

    // caméra : avance dans le couloir + léger parallax souris
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.z = CAM_START - progress * TRACK;
    camera.position.x = mouse.x * 2.2;
    camera.position.y = -mouse.y * 1.6;
    camera.lookAt(mouse.x * 1.2, -mouse.y * 0.8, camera.position.z - 10);
    key.position.set(camera.position.x, camera.position.y, camera.position.z - 4);

    // objet persistant : devant la caméra, sur le côté, matière du monde courant
    matter.position.set(camera.position.x + 3.4, camera.position.y + 0.3, camera.position.z - 9);
    if (nearest !== matterZone) {
      matterZone = nearest;
      matter.geometry.dispose();
      matter.geometry = heroGeo(nearest);
      matter.scale.setScalar(0.12); // "pop"
    }
    matter.scale.lerp(POP, 0.08);
    matter.rotation.y = t * 0.5 + progress * 6;
    matter.rotation.x = t * 0.25;
    matterMat.color.copy(cAcc);
    matterMat.emissive.copy(cAcc);

    // animation des formes d'accent
    for (let s = 0; s < accentShapes.length; s++) {
      accentShapes[s].rotation.y += accentShapes[s].userData.spin;
      accentShapes[s].rotation.x += accentShapes[s].userData.spin * 0.6;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return { dispose() { renderer.dispose(); } };
}
