/* =========================================================
   3D-прев'ю лампи Dune для конструктора.

   models/dune.glb зібрано з ваших STL-файлів (Торшер.stl, База.stl):
   три окремі деталі — shade (абажур), hoop (обруч W) і base (база),
   кожна фарбується цілком, тому колір не «залазить» на сусідні деталі.
   Модель спрощена й стиснута для сайту (~1 МБ), форма та хвилі ті самі.
   Обруч повернуто на 45° навколо вертикальної осі, щоб його нижні
   точки лягали в ямки на стінках бази.

   app.js кладе вибрані кольори у window.duneState і викликає
   window.dune3d.update(), коли вони змінюються.
   ========================================================= */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const stage = document.getElementById('lampStage');
const canvas = document.getElementById('lampCanvas');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// warm bulb colour used for the "light on" state
const BULB = new THREE.Color('#FFB866');

function init(){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral keeps filament colours true (ACES would wash Chocolate out to salmon)
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10);

  // soft studio light from the upper left, like the product photo
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-0.5, 0.9, 0.7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -0.5;
  key.shadow.camera.right = key.shadow.camera.top = 0.5;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new THREE.HemisphereLight(0xfff6ea, 0x3a2c22, 0.35);
  scene.add(fill);

  // the bulb inside the shade — only on when the light toggle is on
  const bulb = new THREE.PointLight(BULB, 0, 0.6, 1.5);
  bulb.position.set(0, 0.13, 0);
  scene.add(bulb);

  // floor that only shows the lamp's shadow
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.ShadowMaterial({ opacity: 0.14 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.rotateSpeed = 0.7;
  // turn around the lamp only; keep a slightly-above view like the photo
  controls.minPolarAngle = controls.maxPolarAngle = THREE.MathUtils.degToRad(80);
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.8;
  canvas.style.touchAction = 'pan-y'; // vertical swipes still scroll the page
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    stage.classList.add('touched');
  });

  const materials = {
    shade: new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0 }),
    hoop:  new THREE.MeshStandardMaterial({ roughness: 0.6,  metalness: 0 }),
    base:  new THREE.MeshStandardMaterial({ roughness: 0.7,  metalness: 0 }),
  };

  function apply(s){
    if (!s) return;
    const shade = new THREE.Color(s.shade);
    const base = new THREE.Color(s.base);
    materials.shade.color.copy(shade);
    materials.hoop.color.copy(base);
    materials.base.color.copy(base);
    // lit from inside: the shade glows in its own colour warmed by the bulb
    materials.shade.emissive.copy(shade).lerp(BULB, 0.55);
    materials.shade.emissiveIntensity = s.lightOn ? 0.55 : 0;
    bulb.intensity = s.lightOn ? 0.35 : 0;
    key.intensity = s.lightOn ? 0.35 : 1.6;
    fill.intensity = s.lightOn ? 0.15 : 0.35;
    scene.environmentIntensity = s.lightOn ? 0.15 : 0.45;
    requestRender();
  }

  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole lamp (≈ 26 cm tall, 21 cm wide) in frame at any aspect
    const fitH = 0.2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = fitH * Math.max(1, 0.8 / camera.aspect);
    const dist = Math.max(fitH, fitW) * 0.9;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    camera.updateProjectionMatrix();
    requestRender();
  }

  // render only while something moves, and not while the stage is off screen
  let visible = true, pending = true;
  function requestRender(){ pending = true; }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(stage);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const moved = controls.update();
    if (moved || pending || controls.autoRotate){
      renderer.render(scene, camera);
      pending = false;
    }
  });

  controls.target.set(0, 0.125, 0);
  // start turned so the W of the hoop faces the viewer, as in the photo
  const az = THREE.MathUtils.degToRad(15);
  camera.position.set(Math.sin(az), 0.3, Math.cos(az)).add(controls.target);
  new ResizeObserver(resize).observe(stage);
  resize();

  function onLoad(gltf){
    gltf.scene.traverse(obj => {
      if (!obj.isMesh) return;
      // parts are named on their parent node: shade / hoop / base
      let part = obj;
      while (part && !materials[part.name]) part = part.parent;
      obj.material = materials[part ? part.name : 'shade'];
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    scene.add(gltf.scene);
    apply(window.duneState);
    window.dune3d = { update: apply };
    stage.classList.add('has-3d');
  }

  // dune.glb is meshopt-compressed (~1 MB) and needs WebAssembly to unpack;
  // where that is blocked, fall back to dune-plain.glb (~4 MB, no decoder).
  // If both fail, the photo underneath simply stays visible.
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load('models/dune.glb', onLoad, undefined, () => {
    new GLTFLoader().load('models/dune-plain.glb', onLoad);
  });
}

try {
  init();
} catch (e) {
  // no WebGL: keep the photo
}
