import * as THREE from "three";

export type Mood = "original" | "dusk" | "snow" | "neon";

type Lights = {
  ambient: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  fill: THREE.PointLight;
};

export function createAtmosphere(scene: THREE.Scene, lights: Lights) {
  const snow = makeSnow();
  scene.add(snow);
  applyMood("original", scene, lights, snow);

  return {
    snow,
    setMood(mood: Mood) {
      applyMood(mood, scene, lights, snow);
    },
    tick(delta: number) {
      const positions = snow.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i += 1) {
        let y = positions.getY(i) - delta * (0.6 + (i % 5) * 0.12);
        if (y < -6) y = 8;
        positions.setY(i, y);
        positions.setX(i, positions.getX(i) + Math.sin(y + i) * delta * 0.15);
      }
      positions.needsUpdate = true;
    },
  };
}

function applyMood(mood: Mood, scene: THREE.Scene, lights: Lights, snow: THREE.Points) {
  snow.visible = mood === "snow";
  const fogColors: Record<Mood, number> = {
    original: 0x0b0c10,
    dusk: 0x2a140c,
    snow: 0x8ea0b3,
    neon: 0x120616,
  };
  scene.background = new THREE.Color(fogColors[mood]);
  scene.fog = new THREE.FogExp2(fogColors[mood], mood === "snow" ? 0.034 : 0.046);

  if (mood === "dusk") {
    lights.ambient.color.set(0xffb27a);
    lights.ambient.intensity = 0.55;
    lights.key.color.set(0xff7a3c);
    lights.key.intensity = 2.1;
    lights.fill.color.set(0x6a4cff);
    lights.fill.intensity = 1.4;
  } else if (mood === "snow") {
    lights.ambient.color.set(0xd7e6ff);
    lights.ambient.intensity = 0.9;
    lights.key.color.set(0xffffff);
    lights.key.intensity = 1.3;
    lights.fill.color.set(0x9ec6ff);
    lights.fill.intensity = 0.8;
  } else if (mood === "neon") {
    lights.ambient.color.set(0x4b1d6b);
    lights.ambient.intensity = 0.35;
    lights.key.color.set(0x66fff2);
    lights.key.intensity = 2.4;
    lights.fill.color.set(0xff2bd6);
    lights.fill.intensity = 2.2;
  } else {
    lights.ambient.color.set(0xffffff);
    lights.ambient.intensity = 0.7;
    lights.key.color.set(0xfff4e2);
    lights.key.intensity = 1.6;
    lights.fill.color.set(0xbfd4ff);
    lights.fill.intensity = 0.6;
  }
}

function makeSnow() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = Math.random() * 14 - 4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.06,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}
