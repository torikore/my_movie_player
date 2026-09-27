import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const SPEED = 2.6;
const TOUCH_LOOK = 0.0034;

export class Walker {
  readonly controls: PointerLockControls;
  private readonly keys = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly lookEuler = new THREE.Euler(0, 0, 0, "YXZ");
  private obstacles: THREE.Object3D[] = [];
  private touchLook = false;
  private lastTouch: { id: number; x: number; y: number } | null = null;
  stick = { x: 0, z: 0 };
  mobile = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.controls = new PointerLockControls(camera, canvas);
    this.mobile = matchMedia("(pointer: coarse)").matches;
    this.bind();
  }

  setObstacles(objects: THREE.Object3D[]) {
    this.obstacles = objects;
  }

  reset(position: THREE.Vector3, lookAt: THREE.Vector3) {
    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
    this.velocity.set(0, 0, 0);
    this.lookEuler.setFromQuaternion(this.camera.quaternion);
  }

  tick(delta: number) {
    const damping = Math.exp(-8 * delta);
    this.velocity.x *= damping;
    this.velocity.z *= damping;

    this.direction.set(0, 0, 0);
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this.direction.z += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this.direction.z -= 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this.direction.x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this.direction.x += 1;
    this.direction.x += this.stick.x;
    this.direction.z += this.stick.z;
    if (this.direction.lengthSq() > 1) this.direction.normalize();

    const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? 1.7 : 1;
    const frame = this.direction.multiplyScalar(SPEED * sprint * delta);
    const right = new THREE.Vector3();
    const forward = new THREE.Vector3();
    this.controls.object.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const next = this.camera.position.clone();
    next.addScaledVector(right, frame.x);
    next.addScaledVector(forward, frame.z);
    next.y = this.camera.position.y;
    if (!this.hits(next)) this.camera.position.copy(next);
  }

  private hits(next: THREE.Vector3) {
    if (this.obstacles.length === 0) return false;
    const move = next.clone().sub(this.camera.position);
    if (move.lengthSq() < 1e-8) return false;
    this.raycaster.set(this.camera.position, move.normalize());
    this.raycaster.far = 0.85;
    return this.raycaster.intersectObjects(this.obstacles, false).length > 0;
  }

  private bind() {
    window.addEventListener("keydown", (event) => this.keys.add(event.code));
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    this.canvas.addEventListener("click", () => {
      if (!this.mobile) this.controls.lock();
    });
    this.canvas.addEventListener("touchstart", (event) => this.onTouchStart(event), { passive: false });
    this.canvas.addEventListener("touchmove", (event) => this.onTouchMove(event), { passive: false });
    this.canvas.addEventListener("touchend", () => {
      this.lastTouch = null;
    });
  }

  private onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    if (touch.clientX < window.innerWidth * 0.42) return;
    event.preventDefault();
    this.touchLook = true;
    this.lastTouch = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
  }

  private onTouchMove(event: TouchEvent) {
    if (!this.touchLook || !this.lastTouch) return;
    const touch = [...event.changedTouches].find((item) => item.identifier === this.lastTouch?.id);
    if (!touch) return;
    event.preventDefault();
    const dx = touch.clientX - this.lastTouch.x;
    const dy = touch.clientY - this.lastTouch.y;
    this.lastTouch = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
    this.lookEuler.setFromQuaternion(this.camera.quaternion);
    this.lookEuler.y -= dx * TOUCH_LOOK;
    this.lookEuler.x -= dy * TOUCH_LOOK;
    this.lookEuler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.lookEuler.x));
    this.camera.quaternion.setFromEuler(this.lookEuler);
  }
}

export function bindJoystick(
  root: HTMLElement,
  knob: HTMLElement,
  walker: Walker,
) {
  const setFrom = (clientX: number, clientY: number) => {
    const rect = root.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const max = rect.width / 2 - 8;
    const len = Math.hypot(dx, dy);
    const scale = len > max ? max / len : 1;
    const x = dx * scale;
    const y = dy * scale;
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    walker.stick.x = x / max;
    walker.stick.z = -y / max;
  };

  const end = () => {
    knob.style.transform = "translate(-50%, -50%)";
    walker.stick.x = 0;
    walker.stick.z = 0;
  };

  root.addEventListener("pointerdown", (event) => {
    root.setPointerCapture(event.pointerId);
    setFrom(event.clientX, event.clientY);
  });
  root.addEventListener("pointermove", (event) => {
    if (!root.hasPointerCapture(event.pointerId)) return;
    setFrom(event.clientX, event.clientY);
  });
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
}
