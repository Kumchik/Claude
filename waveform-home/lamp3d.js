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
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const stage = document.getElementById('lampStage');
const canvas = document.getElementById('lampCanvas');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// warm bulb colour used for the "light on" state
const BULB = new THREE.Color('#FFB866');

// studio backdrop, painted into the scene itself (the post-processing
// passes below need an opaque frame): warm paper by day, dim room at night
function backdrop(inner, outer){
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 170, 20, 256, 230, 420);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Shader tweaks on top of three.js' physical material.
   - grain: the fine fuzzy texture of the printed base and hoop, as a
     tiny bump (≈1 mm) on the surface. It fades out when a grain would be
     smaller than a pixel, so it never shimmers.
   - glow: with the lamp on, light passing through the shade is brighter
     where the wall faces you and dimmer on the slopes of each wave, so
     the relief still reads while it glows. */
function tweakMaterial(mat, { grain = 0, glow = false }){
  mat.onBeforeCompile = shader => {
    shader.uniforms.uGrain = { value: grain };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos;
        uniform float uGrain;
        float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float vnoise(vec3 x){
          vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        vec3 bumpNormal(vec3 pos, vec3 n, vec2 dH){
          vec3 sx = dFdx(pos), sy = dFdy(pos);
          vec3 r1 = cross(sy, n), r2 = cross(n, sx);
          float det = dot(sx, r1);
          return normalize(abs(det) * n - sign(det) * (dH.x * r1 + dH.y * r2));
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uGrain > 0.0) {
          vec3 gp = vWPos * 900.0;
          float fade = 1.0 - smoothstep(0.35, 0.9, length(fwidth(gp)));
          float h = vnoise(gp) * uGrain * fade;
          normal = bumpNormal(-vViewPosition, normal, vec2(dFdx(h), dFdy(h)));
        }`);
    if (glow){
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float facing = abs(dot(normal, normalize(vViewPosition)));
        totalEmissiveRadiance *= mix(0.3, 1.2, pow(facing, 1.4));`);
    }
  };
}

function init(){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const dpr = Math.min(window.devicePixelRatio, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral keeps filament colours true (ACES would wash Chocolate out to salmon)
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap; // soft, blurred shadow edges

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const bgDay = backdrop('#FBF7F1', '#DDD0C0');
  const bgNight = backdrop('#4A3A2E', '#171210');

  // long lens, like a product shot: no wide-angle distortion
  const camera = new THREE.PerspectiveCamera(18, 1, 0.05, 10);
  // the backdrop is a real card behind the lamp that travels with the
  // camera — an empty background would confuse the ambient-occlusion pass
  const backdropCard = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ map: bgDay, toneMapped: false, depthWrite: true })
  );
  backdropCard.position.z = -5;
  camera.add(backdropCard);
  scene.add(camera);

  // big soft window light from the upper left, like the product photo
  const key = new THREE.DirectionalLight(0xfff4e8, 1.5);
  key.position.set(-0.5, 0.32, 1.0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 14;
  key.shadow.blurSamples = 20;
  key.shadow.camera.left = key.shadow.camera.bottom = -0.4;
  key.shadow.camera.right = key.shadow.camera.top = 0.4;
  key.shadow.camera.near = 0.3;
  key.shadow.camera.far = 3;
  key.shadow.bias = -0.0004;
  scene.add(key);
  // cool rim from behind-right so the silhouette separates from the backdrop
  const rim = new THREE.DirectionalLight(0xe8eeff, 0.5);
  rim.position.set(0.7, 0.5, -0.8);
  scene.add(rim);
  const fill = new THREE.HemisphereLight(0xfff6ea, 0x6a5646, 0.45);
  scene.add(fill);

  // the bulb inside the shade — only on when the light toggle is on
  const bulb = new THREE.PointLight(BULB, 0, 0.6, 1.5);
  bulb.position.set(0, 0.13, 0);
  scene.add(bulb);

  // floor that only shows the lamp's shadow
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.ShadowMaterial({ opacity: 0.2 })
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

  // matte printed plastic: rough, a soft sheen at grazing angles, weak highlights
  const plastic = () => new THREE.MeshPhysicalMaterial({
    roughness: 0.6, metalness: 0, specularIntensity: 0.35,
    sheen: 0.6, sheenRoughness: 0.7,
  });
  const materials = { shade: plastic(), hoop: plastic(), base: plastic() };
  materials.shade.roughness = 0.72;
  tweakMaterial(materials.shade, { glow: true });
  tweakMaterial(materials.hoop, { grain: 0.0006 });
  tweakMaterial(materials.base, { grain: 0.0008 });

  // post-processing: ambient occlusion darkens the folds of the waves and
  // the contact points (hoop in the dents, lamp on the table) the way real
  // light does; bloom only when the lamp is on, for the glow around it
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.updateGtaoMaterial({ radius: 0.008, distanceExponent: 1, thickness: 0.4, scale: 1, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  gtao.blendIntensity = 0.75;
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.8, 0.72);
  bloom.enabled = false;
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function apply(s){
    if (!s) return;
    const shade = new THREE.Color(s.shade);
    const base = new THREE.Color(s.base);
    materials.shade.color.copy(shade);
    materials.hoop.color.copy(base);
    materials.base.color.copy(base);
    materials.shade.sheenColor.copy(shade).lerp(new THREE.Color(1, 1, 1), 0.5);
    materials.hoop.sheenColor.copy(base).lerp(new THREE.Color(1, 1, 1), 0.3);
    materials.base.sheenColor.copy(materials.hoop.sheenColor);
    // lit from inside: the shade glows in its own colour warmed by the bulb
    materials.shade.emissive.copy(shade).lerp(BULB, 0.55);
    materials.shade.emissiveIntensity = s.lightOn ? 0.8 : 0;
    bulb.intensity = s.lightOn ? 0.35 : 0;
    key.intensity = s.lightOn ? 0.25 : 1.5;
    rim.intensity = s.lightOn ? 0.1 : 0.5;
    fill.intensity = s.lightOn ? 0.1 : 0.45;
    scene.environmentIntensity = s.lightOn ? 0.12 : 0.5;
    backdropCard.material.map = s.lightOn ? bgNight : bgDay;
    bloom.enabled = !!s.lightOn;
    requestRender();
  }

  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // keep the whole lamp (≈ 26 cm tall, 21 cm wide) in frame at any aspect
    const fitH = 0.2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = fitH * Math.max(1, 0.8 / camera.aspect);
    const dist = Math.max(fitH, fitW) * 0.88;
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
      composer.render();
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
