import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const app = join(root, "apps/photo-3d-walkthrough");
const from = join(app, "dist/assets");
const to = join(app, "assets");

await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });

for (const name of await readdir(from)) {
  if (name.endsWith(".map") || name.endsWith(".wasm")) continue;
  await cp(join(from, name), join(to, name));
}

console.log("apps/photo-3d-walkthrough/assets を更新しました。");
