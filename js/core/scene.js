import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(() => {
  const t = document.createElement('canvas');
  const gl = t.getContext('webgl2') || t.getContext('webgl');
  if (!gl) {
    document.getElementById('no-webgl').classList.add('show');
    document.getElementById('app').style.display = 'none';
    throw new Error('WebGL unsupported');
  }
})();

// ============================================================ RENDERER
const canvas = document.getElementById('three-canvas');
const wrapper = document.getElementById('canvas-wrapper');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();

// IBL environment for soft, high-quality material shading
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Warm gradient background
scene.background = makeBgGradient();
// (no fog — keep the view clear at every zoom level)

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
const DEFAULT_CAM_POS = new THREE.Vector3(8.5, 9.5, 9.5);
camera.position.copy(DEFAULT_CAM_POS);


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// ============================================================ LIGHTING (cozy)
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const hemi = new THREE.HemisphereLight(0xfff4e0, 0xdcc9a8, 0.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1dc, 1.35);
sun.position.set(7, 12, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 44;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 4;
scene.add(sun);

const rim = new THREE.DirectionalLight(0xcfe3ff, 0.35);
rim.position.set(-6, 7, -5);
scene.add(rim);

function makeBgGradient() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#e2ebe6'); g.addColorStop(0.55, '#ece4d6'); g.addColorStop(1, '#f1e9da');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export { canvas, wrapper, renderer, MAX_ANISO, scene, camera, DEFAULT_CAM_POS, raycaster, mouse, floorPlane, sun, hemi, rim, makeBgGradient };
