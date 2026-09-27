import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "dist");
const skip = new Set([
  ".git",
  ".gitignore",
  ".cursor",
  "apps",
  "dist",
  "node_modules",
  "package.json",
  "package-lock.json",
  "scripts",
  "wrangler.toml",
]);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const name of await readdir(root)) {
  if (skip.has(name)) continue;
  await cp(join(root, name), join(out, name), { recursive: true });
}

const appDist = join(root, "apps/photo-3d-walkthrough/dist");
if (!(await exists(appDist))) {
  throw new Error("apps/photo-3d-walkthrough/dist がありません。先に Vite ビルドを実行してください。");
}

await mkdir(join(out, "apps/photo-3d-walkthrough"), { recursive: true });
await cp(join(root, "apps/index.html"), join(out, "apps/index.html"));
await cp(
  join(root, "apps/photo-3d-walkthrough/index.html"),
  join(out, "apps/photo-3d-walkthrough/index.html"),
);
const appAssets = join(root, "apps/photo-3d-walkthrough/assets");
if (await exists(appAssets)) {
  await cp(appAssets, join(out, "apps/photo-3d-walkthrough/assets"), { recursive: true });
} else {
  await cp(appDist, join(out, "apps/photo-3d-walkthrough"), { recursive: true });
}

console.log("Pages 用 dist を作成しました。");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
