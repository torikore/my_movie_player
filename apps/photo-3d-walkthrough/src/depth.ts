import { env, pipeline, RawImage } from "@huggingface/transformers";
import { MAX_INFER_EDGE, MODEL_ID } from "./config";

env.allowLocalModels = false;
env.useBrowserCache = true;

export type DepthMap = {
  data: Float32Array;
  width: number;
  height: number;
};

export type ProgressInfo = {
  status?: string;
  progress?: number;
  file?: string;
};

type Estimator = (input: RawImage) => Promise<{
  predicted_depth?: { data: ArrayLike<number>; dims: number[] };
  depth?: { width: number; height: number; data: Uint8Array };
}>;

let estimatorPromise: Promise<Estimator> | null = null;

async function pickDevice(): Promise<{ device: "webgpu" | "wasm"; dtype: "fp16" | "q8" }> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  if (gpu) {
    try {
      const adapter = await gpu.requestAdapter();
      if (adapter) return { device: "webgpu", dtype: "fp16" };
    } catch {
      // fall through
    }
  }
  return { device: "wasm", dtype: "q8" };
}

async function loadEstimator(
  device: "webgpu" | "wasm",
  dtype: "fp16" | "q8",
  onProgress?: (info: ProgressInfo) => void,
): Promise<Estimator> {
  const created = await pipeline("depth-estimation", MODEL_ID, {
    device,
    dtype,
    progress_callback: onProgress,
  } as never);
  return created as unknown as Estimator;
}

export async function prepareEstimator(onProgress: (info: ProgressInfo) => void): Promise<void> {
  if (!estimatorPromise) {
    estimatorPromise = (async () => {
      const device = await pickDevice();
      return loadEstimator(device.device, device.dtype, onProgress);
    })();
  }
  await estimatorPromise;
}

export async function estimateDepth(source: ImageBitmap, onFallback?: () => void): Promise<DepthMap> {
  if (!estimatorPromise) {
    await prepareEstimator(() => undefined);
  }
  const infer = resizeForInference(source);
  const raw = new RawImage(infer.rgba, infer.width, infer.height, 4);

  try {
    return readDepth(await (await estimatorPromise!)(raw));
  } catch {
    onFallback?.();
    estimatorPromise = loadEstimator("wasm", "q8");
    return readDepth(await (await estimatorPromise)(raw));
  }
}

function readDepth(result: Awaited<ReturnType<Estimator>>): DepthMap {
  if (result.predicted_depth) {
    const [height, width] = result.predicted_depth.dims;
    return {
      data: Float32Array.from(result.predicted_depth.data),
      width,
      height,
    };
  }
  if (result.depth) {
    const { width, height, data } = result.depth;
    const out = new Float32Array(width * height);
    for (let i = 0; i < out.length; i += 1) out[i] = data[i] / 255;
    return { data: out, width, height };
  }
  throw new Error("奥行きデータを取得できませんでした。");
}

function resizeForInference(source: ImageBitmap): { rgba: Uint8Array; width: number; height: number } {
  const scale = Math.min(1, MAX_INFER_EDGE / Math.max(source.width, source.height));
  const width = Math.max(2, Math.round(source.width * scale));
  const height = Math.max(2, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が使えません。");
  ctx.drawImage(source, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return { rgba: new Uint8Array(data.buffer.slice(0)), width, height };
}
