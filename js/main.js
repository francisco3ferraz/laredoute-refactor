import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Variables for animations
let suporteAction, bracolongoAction, bracocurtoAction, encaixeAction, abajurAction;
let lampPieces = [];
let clips = [];
let suporte, suportBackup;
let abajurDefaultMesh;

var lightBulb;
const defaultcol = new THREE.Color("darkgrey");

// Canvas and renderer setup
const canvas = document.getElementById("productCanvas");
const width = document.getElementById("inner").offsetWidth;
const height = document.getElementById("inner").offsetHeight;

var isNight = false;
var isBulbOn = false;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  powerPreference: "high-performance",
  precision: "lowp",
});
renderer.setSize(width, height);
renderer.setPixelRatio(1.5);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f3f1);

// Camera setup
const fov = 45, near = 0.1, far = 100;
const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
camera.position.set(-14, 8, 20);

// Update renderer and camera on resize
window.addEventListener("resize", () => {
  const newWidth = document.getElementById("inner").offsetWidth;
  const newHeight = document.getElementById("inner").offsetHeight;

  renderer.setSize(newWidth, newHeight);
  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();
});

// Lighting setup
const directionalLight = new THREE.DirectionalLight(0xffffff);
directionalLight.position.set(5, 10, 8);
directionalLight.target.position.set(0, 0, 0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.bias = -0.0005;
scene.add(directionalLight);

const rectLight1 = new THREE.RectAreaLight(0xecc391, 0, 10, 0.3);
rectLight1.position.set(-2, 2.8, -1.8);
scene.add(rectLight1);

const rectLight2 = new THREE.RectAreaLight(0xecc391, 0, 10, 0.3);
rectLight2.position.set(-2, 2.9, -1.8);
rectLight2.rotation.set(180, 0, 0);
scene.add(rectLight2);

// Plane for shadows
const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
planeGeometry.rotateX(-Math.PI / 2);
const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.4 });
const plane = new THREE.Mesh(planeGeometry, shadowMaterial);
scene.add(plane);

// Load environment map
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader()
  .setDataType(THREE.FloatType)
  .load("assets/SceneEnvironments/StudioLighting_Day.hdr", (texture) => {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    texture.dispose();
    pmremGenerator.dispose();
  });

const mixer = new THREE.AnimationMixer(scene);

// Load 3D model
const gltfLoader = new GLTFLoader();
gltfLoader.load("/assets/model/ApliqueArticuladoPecaUnica.gltf", (gltf) => {
  scene.add(gltf.scene);

  scene.traverse((child) => {
    if (child.isMesh) {
      child.receiveShadow = true;
      child.castShadow = true;
    }
    
    if (
      ["SupportJoint", "LongArm", "ShortArm", "ArmToAbajurJoint", "AbajurJoint"].some((name) =>
        child.name.includes(name)
      )
    ) {
      lampPieces.push(child);
    }
  });

  lightBulb = scene.getObjectByName("S_LightBulb");
        if (lightBulb && lightBulb.children.length > 0) {
            lightBulb.children[0].material.emissive = defaultcol; // Altera a cor da lâmpada
        } else {
            console.warn('Objeto "S_LightBulb" ou seu filho não encontrado.');
        }

  suporte = scene.getObjectByName("Support");
  suportBackup = suporte.clone();

  abajurDefaultMesh = scene.getObjectByName("AbajurMesh").material;

  suporteAction = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "SuporteAnimacao")).setLoop(THREE.LoopOnce);
  bracolongoAction = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "BracoLongoAnimacao")).setLoop(THREE.LoopOnce);
  bracocurtoAction = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "BracoCurtoAnimacao")).setLoop(THREE.LoopOnce);
  encaixeAction = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "EncaixeBracoCurtoAnimacao")).setLoop(THREE.LoopOnce);
  abajurAction = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "AbajurAnimacao")).setLoop(THREE.LoopOnce);

  clips.push(suporteAction, bracolongoAction, bracocurtoAction, encaixeAction, abajurAction);
  clips.forEach((action) => (action.clampWhenFinished = true));

  // Adjust camera
  const box = new THREE.Box3().setFromObject(suporte);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const cameraDistance = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
  camera.position.set(center.x, center.y + size.y / 2, center.z + cameraDistance);
  camera.lookAt(center);

  changeOriginal();

  controls.target.copy(center);
  controls.update();
});

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1;
controls.maxDistance = 30;
controls.minDistance = 5;
controls.zoomSpeed = 0.4;
controls.enablePan = false;

// Animation and render loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  mixer.update(deltaTime);

  controls.update();
  renderer.render(scene, camera);
}
animate();

function toggleAnimation(action) {
  if (action) {
    if (action.isRunning()) {
      action.paused = !action.paused;
    } else {
      action.timeScale = 1;
      action.reset().play();
    }
  }
}

function changeOriginal() {
  const obj1 = scene.getObjectByName("AbajurMesh");

  ['Support', 'SupportJointHolder', 'SupportJoint',
      'CircleJoint', 'LongArm', 'ShortArm',
      'ArmToAbajurJoint', 'AbajurJoint', 'AbajurMesh'].forEach(name => {
          const obj = scene.getObjectByName(name);
          obj.material = obj1.material;
      });
}

function changeAbajurMaterial(material) {
  const obj = scene.getObjectByName("AbajurMesh");
  if (obj) {
    obj.material = new THREE.MeshStandardMaterial({ map: material, side: THREE.DoubleSide });
    obj.material.needsUpdate = true;
  }
}

function changeAbajurMaterialDefault() {
  const obj = scene.getObjectByName("AbajurMesh");
  if (obj) {
    obj.material = abajurDefaultMesh;
    obj.material.needsUpdate = true;
  }
}

function toggleLightBulb(isOn) {
  isBulbOn = isOn;

  const ponto_luminoso = scene.getObjectByName("Point");
  const cone_luminoso = scene.getObjectByName("Spot");

  if (isBulbOn) {
    ponto_luminoso.intensity = 3;
    cone_luminoso.intensity = 16;
  } else {
    ponto_luminoso.intensity = 0;
    cone_luminoso.intensity = 0;
  }
}

document.getElementById("btn_on")?.addEventListener('click', () => {
  toggleLightBulb(true);
});

document.getElementById("btn_off")?.addEventListener('click', () => {
  toggleLightBulb(false);
});

document.getElementById("btn_default")?.addEventListener('click', () => {
  changeAbajurMaterialDefault();
});

document.getElementById("btn_material1")?.addEventListener('click', () => {
  changeAbajurMaterial(new THREE.TextureLoader().load("assets/Materials/Metal/gold_1/gold_1_baseColor.jpeg"));
});

document.getElementById("btn_material2")?.addEventListener('click', () => {
  changeAbajurMaterial(new THREE.TextureLoader().load("assets/Materials/Metal/gold_1/gold_1_normal.jpeg"));
});

document.getElementById("btn_Support")?.addEventListener('click', () => {
  toggleAnimation(suporteAction);
});

document.getElementById("btn_Long")?.addEventListener('click', () => {
  toggleAnimation(bracolongoAction);
});

document.getElementById("btn_Short")?.addEventListener('click', () => {
  toggleAnimation(bracocurtoAction);
});

document.getElementById("btn_Rotator")?.addEventListener('click', () => {
  toggleAnimation(encaixeAction);
});

document.getElementById("btn_Abajur")?.addEventListener('click', () => {
  toggleAnimation(abajurAction);
});

document.getElementById("btn_Repor")?.addEventListener('click', () => {
  suporte = suportBackup.clone();

  clips.forEach((clip) => {
    clip.stop();
    clip.reset();
  });
});

document.getElementById("btn_frontView").onclick = function frontView() {
  controls.autoRotate = false;
  gsap
    .to(camera.position, 2, {
      x: 0,
      y: 5,
      z: 20,
      ease: Power4.easeInOut,
    })
    .play();
};

document.getElementById("btn_topView").onclick = function topView() {
  controls.autoRotate = false;
  gsap
    .to(camera.position, 2, {
      x: 0,
      y: 25,
      z: 0,
      ease: Power4.easeInOut,
    })
    .play();
};

document.getElementById("btn_rightView").onclick = function rightView() {
  controls.autoRotate = false;
  gsap
    .to(camera.position, 2, {
      x: -25,
      y: 5,
      z: 0,
      ease: Power4.easeInOut,
    })
    .play();
};

document.getElementById("btn_leftView").onclick = function leftView() {
  controls.autoRotate = false;
  gsap
    .to(camera.position, 2, {
      x: 25,
      y: 5,
      z: 0,
      ease: Power4.easeInOut,
    })
    .play();
};

document.getElementById("btn_night").onclick = function leftView() {
  if (isNight == false) {

    rectLight1.intensity = 10;
    rectLight2.intensity = 150;
    directionalLight.intensity = 0.75;
    new RGBELoader()
      .setDataType(THREE.FloatType)
      .load(
        "assets/SceneEnvironments/StudioLighting_Night.hdr",
        function (texture) {
          const envMap = pmremGenerator.fromEquirectangular(texture).texture;
          scene.environment = envMap;
          texture.dispose();
          pmremGenerator.dispose();
        }
      );
    new RGBELoader()
      .setDataType(THREE.FloatType)
      .load(
        "assets/SceneEnvironments/StudioLighting_Night_World.hdr",
        function (texture) {
          const envMap = pmremGenerator.fromEquirectangular(texture).texture;
          scene.background = envMap;
          texture.dispose();
          pmremGenerator.dispose();
        }
      );
    isNight = true;
  } else {
    directionalLight.intensity = 1;
    rectLight1.intensity = 0;
    rectLight2.intensity = 0;
    new RGBELoader()
      .setDataType(THREE.FloatType)
      .load(
        "assets/SceneEnvironments/StudioLighting_Day.hdr",
        function (texture) {
          const envMap = pmremGenerator.fromEquirectangular(texture).texture;
          scene.environment = envMap;
          texture.dispose();
          pmremGenerator.dispose();
        }
      );
    scene.background = new THREE.Color(0xf4f3f1);
    isNight = false;
  }
};