import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { PointerLockControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/PointerLockControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());
scene.add(controls.getObject());

const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(light);

const loader = new THREE.TextureLoader();
const wallTex  = loader.load('textures/wall.jpeg');
const floorTex = loader.load('textures/floor.jpg');
const ceilTex  = loader.load('textures/ceiling.jpg');

function makeRGBMaterial(tex, r, g, b, tx, ty) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(tx, ty);
  const mat = new THREE.MeshStandardMaterial({ map: tex });
  mat.color.setRGB(r, g, b);
  return mat;
}

const wallMat  = makeRGBMaterial(wallTex, 0.9, 0.8, 0.8, 2, 1);
const floorMat = makeRGBMaterial(floorTex, 1.1, 1.1, 1.1, 8, 8);
const ceilMat  = makeRGBMaterial(ceilTex, 0.75, 0.7, 0.4, 2, 2);

const wallGeo = new THREE.BoxGeometry(1, 2, 1);
const floorGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const ceilGeo = new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2);

const collisionBoxes = [];

function generateFromAsciiMap(asciiMap) {
  const offsetX = asciiMap[0].length / 2;
  const offsetZ = asciiMap.length / 2;

  asciiMap.forEach((row, z) => {
    [...row].forEach((ch, x) => {
      const px = x - offsetX;
      const pz = z - offsetZ;

      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.set(px, 0, pz);
      scene.add(floor);

      const ceil = new THREE.Mesh(ceilGeo, ceilMat);
      ceil.position.set(px, 2, pz);
      scene.add(ceil);

      if (ch === '#') {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(px, 1, pz);
        scene.add(wall);
        collisionBoxes.push(new THREE.Box3().setFromObject(wall));
      } else if (ch === 'S') {
        controls.getObject().position.set(px, 1.8, pz);
      }
    });
  });
}

fetch('maps/level1.txt')
  .then(res => res.text())
  .then(text => generateFromAsciiMap(text.trim().split('\n')));

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const speed = 1;
const jumpSpeed = 10;
let canJump = false;

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && canJump) {
    velocity.y += jumpSpeed;
    canJump = false;
  }
});

const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function animate() {
  requestAnimationFrame(animate);

  const delta = 0.02;
  direction.set(
    (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0),
    0,
    (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0)
  );
  direction.normalize();

  const camDir = new THREE.Vector3();
  controls.getDirection(camDir);
  camDir.y = 0;
  camDir.normalize();

  const sideDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camDir);
  const move = camDir.multiplyScalar(direction.z).add(sideDir.multiplyScalar(direction.x));
  move.multiplyScalar(speed * delta);

  controls.getObject().position.add(move);

  velocity.y -= 30 * delta;
  controls.getObject().position.y += velocity.y * delta;

  if (controls.getObject().position.y < 1.8) {
    velocity.y = 0;
    controls.getObject().position.y = 1.8;
    canJump = true;
  }

  const playerBox = new THREE.Box3().setFromCenterAndSize(
    controls.getObject().position,
    new THREE.Vector3(0.5, 1.8, 0.5)
  );
  for (const box of collisionBoxes) {
    if (playerBox.intersectsBox(box)) {
      controls.getObject().position.sub(move);
      break;
    }
  }

  renderer.render(scene, camera);
}
animate();
