import * as THREE from "three";
import { DEPTH_SCALE, MESH_WIDTH, VERTEX_COLUMNS } from "./config";
import type { DepthMap } from "./depth";

export function meshFromDepth(textureCanvas: HTMLCanvasElement, depth: DepthMap) {
  const aspect = textureCanvas.width / textureCanvas.height;
  const width = MESH_WIDTH;
  const height = MESH_WIDTH / aspect;
  const columns = VERTEX_COLUMNS;
  const rows = Math.max(80, Math.round(VERTEX_COLUMNS / aspect));
  const geometry = new THREE.PlaneGeometry(width, height, columns, rows);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const { min, max } = rangeOf(depth.data);
  const span = Math.max(1e-5, max - min);

  for (let i = 0; i < positions.count; i += 1) {
    const col = i % (columns + 1);
    const row = Math.floor(i / (columns + 1));
    const u = col / columns;
    const v = 1 - row / rows;
    const sample = sampleDepth(depth, u, v);
    const near = (sample - min) / span;
    positions.setZ(i, -(1 - near) * DEPTH_SCALE);
  }

  geometry.computeVertexNormals();

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.78,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = height / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return { mesh, width, height };
}

function rangeOf(data: Float32Array) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of data) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function sampleDepth(depth: DepthMap, u: number, v: number) {
  const x = Math.min(depth.width - 1, Math.max(0, u * (depth.width - 1)));
  const y = Math.min(depth.height - 1, Math.max(0, v * (depth.height - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(depth.width - 1, x0 + 1);
  const y1 = Math.min(depth.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const a = depth.data[y0 * depth.width + x0];
  const b = depth.data[y0 * depth.width + x1];
  const c = depth.data[y1 * depth.width + x0];
  const d = depth.data[y1 * depth.width + x1];
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}
