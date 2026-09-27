import { MAX_TEXTURE_EDGE } from "./config";

export async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

export async function bitmapFromUrl(url: string): Promise<ImageBitmap> {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("デモ写真を取得できませんでした。");
  const blob = await response.blob();
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

export function textureCanvasFrom(source: ImageBitmap): HTMLCanvasElement {
  const scale = Math.min(1, MAX_TEXTURE_EDGE / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(source.width * scale));
  canvas.height = Math.max(2, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が使えません。");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality = 0.72): string {
  return canvas.toDataURL("image/jpeg", quality);
}
