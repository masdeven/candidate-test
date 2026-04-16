import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById("illustration-3d-container");
const width = window.innerWidth;
const height = window.innerHeight;

// --- Core Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const axesHelper = new THREE.AxesHelper(5);
axesHelper.position.set(0.5, 0, 1.0);
scene.add(axesHelper);

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
camera.position.set(-6.5, 5, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
scene.add(ambientLight, directionalLight);

// --- Textures ---
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
const textureLoader = new THREE.TextureLoader();

const loadTexture = (path, isColor = false) => {
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const textures = {
  colorStraight: loadTexture("model/wood/wood.fbm/Color_A02.jpg", true),
  normalStraight: loadTexture("model/wood/wood.fbm/normal_map.png"),
  colorEnd: loadTexture("model/wood/wood.fbm/Colormap.png", true),
  normalEnd: loadTexture("model/wood/wood.fbm/NormalMap.png"),
};

// --- Utilities ---
function createDimensionAnnotation(start, end, textLabel) {
  const group = new THREE.Group();
  const geometryLine = new THREE.BufferGeometry().setFromPoints([start, end]);

  group.add(
    new THREE.Line(
      geometryLine,
      new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
    ),
  );
  group.add(
    new THREE.Points(
      geometryLine,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.03,
        depthTest: false,
      }),
    ),
  );

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";
  ctx.strokeText(textLabel, 128, 32);
  ctx.fillStyle = "white";
  ctx.fillText(textLabel, 128, 32);

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,
      transparent: true,
    }),
  );

  sprite.position.copy(
    new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
  );
  sprite.position.y += 0.05;
  sprite.scale.set(0.35, 0.0875, 1);

  group.add(sprite);
  group.renderOrder = 999;
  return group;
}

// --- Model Loading ---
const loader = new FBXLoader();
loader.load(
  "model/wood/wood.fbx",
  (fbx) => {
    const createWoodBlock = (w, h, l, x, y, z) => {
      const block = fbx.clone();
      const size = new THREE.Box3()
        .setFromObject(block)
        .getSize(new THREE.Vector3());
      block.scale.set(w / size.x, h / size.y, l / size.z);

      block.traverse((child) => {
        if (!child.isMesh) return;

        child.castShadow = true;
        child.receiveShadow = true;

        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat) => {
            const newMat = mat.clone();
            const isEndFace = mat.name.toLowerCase().match(/depan|belakang/);

            newMat.map = isEndFace
              ? textures.colorEnd.clone()
              : textures.colorStraight.clone();
            newMat.normalMap = isEndFace
              ? textures.normalEnd.clone()
              : textures.normalStraight.clone();

            if (isEndFace) {
              newMat.map.repeat.set(1.5, 1.5);
              newMat.normalMap.repeat.set(1.5, 1.5);
            } else {
              newMat.map.rotation = Math.PI / 2;
              newMat.normalMap.rotation = Math.PI / 2;
              newMat.map.center.set(0.5, 0.5);
              newMat.normalMap.center.set(0.5, 0.5);
              newMat.map.repeat.set(l, 1);
              newMat.normalMap.repeat.set(l, 1);
            }

            newMat.color.setHex(0xffffff);
            newMat.normalScale.set(1.5, 1.5);
            newMat.shininess = 2;
            newMat.needsUpdate = true;

            return newMat;
          });
        }
      });

      const center = new THREE.Box3()
        .setFromObject(block)
        .getCenter(new THREE.Vector3());
      block.position.set(x - center.x, y - center.y, z - center.z);
      return block;
    };

    scene.add(createWoodBlock(0.5, 0.2, 3.0, 0.25, 0.1, -0.5));
    scene.add(createWoodBlock(0.5, 0.2, 2.0, -0.25, 0.1, -0.54));
    scene.add(createWoodBlock(0.4, 0.2, 2.0, 0.0, 0.3, -0.56));

    // Render Annotations dynamically
    const dimensions = [
      [[0.0, 0, 1.0], [0.5, 0, 1.0], "0.5m"],
      [[0.5, 0, 1.0], [0.5, 0.2, 1.0], "0.2m"],
      [[0.5, 0.2, 1.0], [0.5, 0.2, -2.0], "3m"],
      [[0.0, 0, 1.0], [0.0, 0, 0.46], "0.54m"],
      [[0.0, 0, 0.46], [-0.5, 0, 0.46], "0.5m"],
      [[-0.5, 0, 0.46], [-0.5, 0.2, 0.46], "0.2m"],
      [[-0.5, 0.2, 0.46], [-0.5, 0.2, -1.54], "2m"],
      [[-0.2, 0.2, 0.46], [-0.2, 0.2, 0.44], "0.02m"],
      [[-0.2, 0.2, 0.44], [0.2, 0.2, 0.44], "0.4m"],
      [[0.2, 0.2, 0.44], [0.2, 0.4, 0.44], "0.2m"],
      [[-0.2, 0.4, 0.44], [-0.2, 0.4, -1.56], "2m"],
    ];

    dimensions.forEach(([start, end, label]) => {
      scene.add(
        createDimensionAnnotation(
          new THREE.Vector3(...start),
          new THREE.Vector3(...end),
          label,
        ),
      );
    });
  },
  undefined,
  console.error,
);

// --- Event Listeners & Render Loop ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
