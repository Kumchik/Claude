/* =========================================================
   3D-прев'ю чай-органайзера для конструктора на organizers.html.

   models/tea-organizer.glb зібрано з ваших STL-файлів: корпус і 3
   вставки (об'єднані в один меш, той самий колір для всіх трьох) —
   два окремі вузли ('body' і 'insert' в glTF, як 'shade'/'hoop'/'base'
   у dune.glb), фарбуються незалежно, як абажур і база в Dune. Модель
   стиснута для сайту (gltfpack -kn, meshopt) — див.
   models/tea-organizer-plain.glb для запасного варіанту без
   WebAssembly-декодера.

   app.js кладе обрані кольори у window.teaState (base/insert) і
   викликає window.tea3d.update(), коли вони змінюються.
   ========================================================= */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const stage = document.getElementById('teaStage');
const canvas = document.getElementById('teaCanvas');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function backdrop(inner, outer){
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 200, 20, 256, 260, 420);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Same fuzzy-skin bump as base/hoop on Dune (lamp3d.js) — the print's
   rough, pebbly surface, drawn as noise so it never shimmers. */
function tweakMaterial(mat, grain){
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
          vec3 gp = vWPos * 650.0;
          float fade = 1.0 - smoothstep(0.7, 1.8, length(fwidth(gp)));
          float n = vnoise(gp) * 0.6 + vnoise(gp * 2.4 + 17.0) * 0.4;
          float h = n * uGrain * fade;
          normal = bumpNormal(-vViewPosition, normal, vec2(dFdx(h), dFdy(h)));
        }`);
  };
}

function init(){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const dpr = Math.min(window.devicePixelRatio, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const bg = backdrop('#FBF7F1', '#DDD0C0');

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 10);
  // the model (and this whole local scene: cube, lights, camera) uses the
  // organizer's own native up axis — which, confirmed against the
  // reference photo, is the STL files' X axis (not Z): the object stands
  // with its 3 ribbed columns side by side across its Y axis, its depth
  // along Z, and each column's arch cutout near the X-min end. Keeping
  // the model unrotated and making the local scene match its axis avoids
  // ever repeating a rotation-math mistake
  camera.up.set(1, 0, 0);
  const backdropCard = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ map: bg, toneMapped: false, depthWrite: true })
  );
  backdropCard.position.z = -5;
  camera.add(backdropCard);
  scene.add(camera);

  // front of the organizer faces roughly -Z/-Y here (see camera position
  // below), with X up — the key light comes from that same front-ish
  // side, elevated, and the rim from the opposite (back) side
  const key = new THREE.DirectionalLight(0xfff4e8, 1.5);
  key.position.set(0.5, -0.6, -0.75);
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
  const rim = new THREE.DirectionalLight(0xe8eeff, 0.5);
  rim.position.set(-0.3, 0.6, 0.7);
  scene.add(rim);
  const fill = new THREE.HemisphereLight(0xfff6ea, 0x6a5646, 0.55);
  scene.add(fill);

  // stands on the same white display cube used for Dune
  const CUBE = 0.34, CUBE_R = 0.006;
  const cube = new THREE.Mesh(
    new RoundedBoxGeometry(CUBE, CUBE, CUBE, 5, CUBE_R),
    new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: 0.9, sheen: 0.2, sheenColor: 0xffffff })
  );
  cube.position.x = -CUBE / 2;
  cube.receiveShadow = true;
  scene.add(cube);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.rotateSpeed = 0.7;
  // polar angle (elevation) is locked further down, once viewDir is known
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.8;
  canvas.style.touchAction = 'pan-y';
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    stage.classList.add('touched');
  });

  // matte printed plastic, same fuzzy-skin grain as Dune's base/hoop —
  // one material for the body, one for the 3 ribbed inserts, painted
  // independently
  const plastic = () => new THREE.MeshPhysicalMaterial({
    roughness: 0.88, metalness: 0, specularIntensity: 0.35,
    sheen: 0.25, sheenRoughness: 0.7,
  });
  const materials = { body: plastic(), insert: plastic() };
  tweakMaterial(materials.body, 0.0006);
  tweakMaterial(materials.insert, 0.0006);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.updateGtaoMaterial({ radius: 0.01, distanceExponent: 1, thickness: 0.4, scale: 1, samples: 24 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 10, rings: 3, samples: 24 });
  gtao.blendIntensity = 0.7;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());

  function apply(s){
    if (!s) return;
    const base = new THREE.Color(s.base);
    const insert = new THREE.Color(s.insert);
    materials.body.color.copy(base);
    materials.body.sheenColor.copy(base).lerp(new THREE.Color(1, 1, 1), 0.35);
    materials.insert.color.copy(insert);
    materials.insert.sheenColor.copy(insert).lerp(new THREE.Color(1, 1, 1), 0.35);
    requestRender();
  }

  let fitDist = 0.5;
  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  }

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

  controls.target.set(0.08, 0, 0);
  // a fixed elevated 3/4 angle that shows all three ribbed columns at
  // once, like a product photo — found by test-rendering the raw model
  // offline (X up, front toward -Z/-Y) against the reference photo, then
  // reproduced here exactly
  const viewDir = new THREE.Vector3(60, -280, -350).normalize();
  camera.position.copy(controls.target).addScaledVector(viewDir, fitDist);
  controls.minPolarAngle = controls.maxPolarAngle = Math.acos(viewDir.x);
  new ResizeObserver(resize).observe(stage);
  resize();

  function onLoad(gltf){
    const obj = gltf.scene;
    // no rotation here: this whole local scene (cube, lights, camera.up
    // above) is built to match the model's own native axis (X up),
    // deliberately, to avoid a rotation-math mistake ever turning it on
    // its side again
    obj.scale.setScalar(0.001); // millimetres -> metres, same convention as dune.glb
    obj.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    obj.position.x -= box.min.x; // rests on the display cube, like Dune
    obj.position.y -= center.y;
    obj.position.z -= center.z;

    obj.traverse(o => {
      if (!o.isMesh) return;
      // parts are named on their parent node: body / insert (see dune.glb's
      // shade/hoop/base in lamp3d.js — same export pattern, gltfpack -kn)
      let part = o;
      while (part && !materials[part.name]) part = part.parent;
      o.material = materials[part ? part.name : 'body'];
      o.castShadow = true;
      o.receiveShadow = true;
    });
    scene.add(obj);

    // fit the whole box (plus a little air) in frame from the current angle
    const radius = size.length() / 2;
    fitDist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.1;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, fitDist);
    camera.updateProjectionMatrix();

    apply(window.teaState);
    window.tea3d = { update: apply };
    stage.classList.add('has-3d');
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load('models/tea-organizer.glb', onLoad, undefined, () => {
    new GLTFLoader().load('models/tea-organizer-plain.glb', onLoad);
  });
}

try {
  init();
} catch (e) {
  // no WebGL: the stage stays an empty (but themed) panel
}
