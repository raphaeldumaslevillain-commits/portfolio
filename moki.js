/* ============================================================
   Moki! — Boîte de macarons 3D (CV packaging)
   Three.js + OrbitControls (ES modules via importmap)
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ------------------------------------------------------------
   CONFIGURATION DES FACES
   ------------------------------------------------------------
   Réglez ici l'orientation de chaque texture SANS toucher au
   reste du code.
     file   : nom du fichier image (même dossier que index.html)
     rot    : rotation par pas de 90°  → 0, 1, 2 ou 3 (= 0°, 90°, 180°, 270°)
     mirror : true pour appliquer un miroir horizontal (repeat.x = -1)

   L'ordre des matériaux d'un BoxGeometry est :
     [ +X droite, -X gauche, +Y dessus, -Y dessous, +Z avant, -Z arrière ]
------------------------------------------------------------ */
const FACES = {
  px: { file: "cotes.png",      rot: 0, mirror: false }, // +X  petit bout (7×5)
  nx: { file: "cotes.png",      rot: 0, mirror: false }, // -X  petit bout (7×5)
  py: { file: "facedessus.png", rot: 0, mirror: false }, // +Y  dessus (20×7)
  ny: { file: "dessous.png",    rot: 0, mirror: false }, // -Y  dessous (20×7)
  pz: { file: "facedroite.png", rot: 0, mirror: false }, // +Z  grande face (20×5)
  nz: { file: "facegauche.png", rot: 0, mirror: false }, // -Z  grande face (20×5)
};

// Dimensions réelles de la boîte (en cm) : 20 long × 5 haut × 7 large
const SIZE = { width: 20, height: 5, depth: 7 };

const stage = document.getElementById("mokiStage");
const loaderEl = document.getElementById("mokiLoader");
if (stage) initMoki();

function initMoki() {
  const scene = new THREE.Scene();

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(
    35,
    stage.clientWidth / stage.clientHeight,
    0.1,
    1000
  );
  camera.position.set(22, 14, 28);

  // --- Controls : rotation au clic-glisser, zoom molette, pas d'auto-rotation ---
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false;
  controls.enablePan = false;
  controls.minDistance = 14;
  controls.maxDistance = 60;

  // --- Textures ---
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
        // Centre de rotation/miroir au milieu de la texture
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
        // Image manquante : on garde une face neutre + petit message console
        hadError = true;
        console.warn("[Moki!] Image introuvable : " + cfg.file);
        mat.color = new THREE.Color(0xece7df);
        if (--pending === 0) hideLoader();
      }
    );
    return mat;
  }

  // Ordre BoxGeometry : +X, -X, +Y, -Y, +Z, -Z
  const materials = [
    makeMaterial(FACES.px),
    makeMaterial(FACES.nx),
    makeMaterial(FACES.py),
    makeMaterial(FACES.ny),
    makeMaterial(FACES.pz),
    makeMaterial(FACES.nz),
  ];

  // --- Box : width(20) sur X, height(5) sur Y, depth(7) sur Z ---
  const geometry = new THREE.BoxGeometry(SIZE.width, SIZE.height, SIZE.depth);
  const box = new THREE.Mesh(geometry, materials);
  scene.add(box);

  // Légère inclinaison de départ pour révéler 3 faces
  box.rotation.y = -0.6;
  box.rotation.x = 0.15;

  function hideLoader() {
    if (loaderEl) loaderEl.style.display = "none";
    if (hadError && stage && !stage.querySelector(".moki-warn")) {
      const w = document.createElement("div");
      w.className = "moki-warn";
      w.textContent = "Déposez les images de la boîte (facedessus.png, dessous.png, facedroite.png, facegauche.png, cotes.png) dans le dossier.";
      stage.appendChild(w);
    }
  }

  // --- Resize ---
  function onResize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // --- Animation loop ---
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
