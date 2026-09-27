import * as THREE from "three";
import { createAtmosphere, type Mood } from "./atmosphere";
import type { DepthMap } from "./depth";
import { meshFromDepth } from "./mesh-from-depth";
import { Walker } from "./walker";

export class World {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.08, 80);
  readonly renderer: THREE.WebGLRenderer;
  readonly walker: Walker;
  private readonly clock = new THREE.Clock();
  private readonly ambient = new THREE.AmbientLight(0xffffff, 0.7);
  private readonly key = new THREE.DirectionalLight(0xfff4e2, 1.6);
  private readonly fill = new THREE.PointLight(0xbfd4ff, 0.6, 18);
  private readonly atmosphere: ReturnType<typeof createAtmosphere>;
  private photoMesh: THREE.Mesh | null = null;
  private floor: THREE.Mesh;
  private frame = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.key.position.set(-3, 6, 5);
    this.fill.position.set(3.5, 2.2, 3);
    this.scene.add(this.ambient, this.key, this.fill);
    this.floor = new THREE.Mesh(
      new THREE.CircleGeometry(36, 72),
      new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.95 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.scene.add(this.floor);
    this.atmosphere = createAtmosphere(this.scene, {
      ambient: this.ambient,
      key: this.key,
      fill: this.fill,
    });
    this.walker = new Walker(this.camera, canvas);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  loadPhoto(textureCanvas: HTMLCanvasElement, depth: DepthMap) {
    if (this.photoMesh) {
      this.scene.remove(this.photoMesh);
      this.photoMesh.geometry.dispose();
      const material = this.photoMesh.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.map?.dispose();
        material.dispose();
      }
    }
    const built = meshFromDepth(textureCanvas, depth);
    this.photoMesh = built.mesh;
    this.scene.add(this.photoMesh);
    this.floor.position.y = 0;
    const eye = built.height * 0.46;
    const start = new THREE.Vector3(0, eye, Math.max(3.8, built.width * 0.42));
    this.walker.reset(start, new THREE.Vector3(0, eye, 0));
    this.walker.setObstacles([this.photoMesh]);
  }

  setMood(mood: Mood) {
    this.atmosphere.setMood(mood);
  }

  start() {
    if (this.frame) return;
    const loop = () => {
      const delta = Math.min(0.05, this.clock.getDelta());
      this.walker.tick(delta);
      this.atmosphere.tick(delta);
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(loop);
    };
    loop();
  }

  private resize() {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}
