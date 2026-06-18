/* ============================================================
   box.js — Boîte de macarons 3D "Moki!" (Three.js + OrbitControls)
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ------------------------------------------------------------
   CONFIGURATION DES FACES
   file   : nom du fichier image (même dossier que index.html)
   rot    : rotation par pas de 90° -> 0, 1, 2 ou 3
   mirror : true pour un miroir horizontal (repeat.x = -1)
   Ordre BoxGeometry : [ +X droite, -X gauche, +Y dessus, -Y dessous, +Z avant, -Z arrière ]
------------------------------------------------------------ */
const FACES = {
  px: { file: "cotes.png",      rot: 0, mirror: false }, // +X petit bout (7×5)
  nx: { file: "cotes.png",      rot: 0, mirror: false }, // -X petit bout (7×5)
  py: { file: "facedessus.png", rot: 0, mirror: false }, // +Y dessus (20×7)
  ny: { file: "dessous.png",    rot: 0, mirror: false }, // -Y dessous (20×7)
  pz: { file: "facedroite.png", rot: 0, mirror: false }, // +Z grande face (20×5)
  nz: { file: "facegauche.png", rot: 0, mirror: false }, // -Z grande face (20×5)
};

const SIZE = { width: 20, height: 5, depth: 7 }; // cm réels

export function initBox() {
  const stage = document.getElementById("boxStage");
  const loaderEl = document.getElementById("boxLoader");
  if (!stage) return;

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(35, stage.clientWidth / stage.clientHeight, 0.1, 1000);
  camera.position.set(16, 9, 20); // plus proche -> boîte plus grosse à l'écran

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false;
  controls.enablePan = false;
  controls.minDistance = 14;
  controls.maxDistance = 60;

  const loader = new THREE.TextureLoader();
  let pending = 0;
  let hadError = false;

  function makeMaterial(cfg) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    pending++;
    loader.load(
      cfg.file,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.center.set(0.5, 0.5);
        texture.rotation = (cfg.rot || 0) * (Math.PI / 2);
        if (cfg.mirror) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.repeat.x = -1;
        }
        texture.needsUpdate = true;
        mat.map = texture;
        mat.needsUpdate = true;
        if (--pending === 0) hideLoader();
      },
      undefined,
      () => {
        hadError = true;
        console.warn("[Moki!] Image introuvable : " + cfg.file);
        mat.color = new THREE.Color(0xece7df);
        if (--pending === 0) hideLoader();
      }
    );
    return mat;
  }

  const materials = [
    makeMaterial(FACES.px), makeMaterial(FACES.nx),
    makeMaterial(FACES.py), makeMaterial(FACES.ny),
    makeMaterial(FACES.pz), makeMaterial(FACES.nz),
  ];

  const box = new THREE.Mesh(new THREE.BoxGeometry(SIZE.width, SIZE.height, SIZE.depth), materials);
  scene.add(box);
  box.rotation.y = -0.6;
  box.rotation.x = 0.15;

  function hideLoader() {
    if (loaderEl) loaderEl.style.display = "none";
    if (hadError && !stage.querySelector(".box-warn")) {
      const w = document.createElement("div");
      w.className = "box-warn";
      w.textContent = "Déposez les images de la boîte (facedessus.png, dessous.png, facedroite.png, facegauche.png, cotes.png) dans le dossier.";
      stage.appendChild(w);
    }
  }

  function onResize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // Boucle en pause hors écran (perf)
  let visible = false;
  function animate() {
    if (!visible) return;
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      visible = en.isIntersecting;
      if (visible) animate();
    }),
    { threshold: 0.05 }
  );
  io.observe(stage);
}
