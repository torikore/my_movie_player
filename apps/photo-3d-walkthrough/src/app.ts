import type { Mood } from "./atmosphere";
import { captionPhoto, loadGeminiKey, saveGeminiKey } from "./caption";
import { DEMO_PHOTO } from "./config";
import type { ProgressInfo } from "./depth";
import { bitmapFromFile, bitmapFromUrl, textureCanvasFrom } from "./image";
import { bindJoystick } from "./walker";
import { World } from "./world";

const $ = <T extends HTMLElement>(id: string) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} がありません`);
  return node as T;
};

export function startApp() {
  const gate = $("gate");
  const loading = $("loading");
  const hud = $("hud");
  const settings = $("settings");
  const drop = $("drop");
  const file = $<HTMLInputElement>("file");
  const demo = $<HTMLButtonElement>("demo");
  const loadBar = $("load-bar");
  const loadTitle = $("load-title");
  const loadMessage = $("load-message");
  const loadDetail = $("load-detail");
  const sceneTitle = $("scene-title");
  const sceneKicker = $("scene-kicker");
  const help = $("help");
  const joystick = $("joystick");
  const stick = $("stick");
  const geminiKey = $<HTMLInputElement>("gemini-key");
  const world = new World($<HTMLCanvasElement>("view"));

  geminiKey.value = loadGeminiKey();
  bindJoystick(joystick, stick, world.walker);
  bindGate(drop, file, (picked) => void run(picked));
  demo.addEventListener("click", () => void run(DEMO_PHOTO));
  $("settings-open").addEventListener("click", () => show(settings, [gate]));
  $("settings-save").addEventListener("click", () => {
    saveGeminiKey(geminiKey.value);
    show(gate, [settings]);
  });
  $("settings-clear").addEventListener("click", () => {
    geminiKey.value = "";
    saveGeminiKey("");
  });
  $("reset").addEventListener("click", () => {
    world.walker.controls.unlock();
    show(gate, [hud, joystick, loading]);
  });
  $("moods").addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-mood]");
    if (!button) return;
    setMood(button.dataset.mood as Mood, world);
  });
  world.walker.controls.addEventListener("lock", () => {
    help.textContent = "W A S D で歩く　マウスで見る　Esc で解除";
  });
  world.walker.controls.addEventListener("unlock", () => {
    help.textContent = "クリックで視点を固定　W A S D で歩く　マウスで見る";
  });

  async function run(source: File | string) {
    try {
      show(loading, [gate, settings, hud]);
      setLoad("準備しています", "立体化モデルを読み込んでいます", "初回は数分かかることがあります。", 8);
      const { prepareEstimator, estimateDepth } = await import("./depth");
      await prepareEstimator((info) => reportModel(info, loadBar, loadDetail));
      setLoad("写真を読んでいます", "奥行きを測っています", "この写真は端末の外に出ていません。", 62);
      const bitmap = typeof source === "string" ? await bitmapFromUrl(source) : await bitmapFromFile(source);
      const textureCanvas = textureCanvasFrom(bitmap);
      const depth = await estimateDepth(bitmap, () => {
        setLoad("切り替えました", "GPUが使えないので、少し遅い方法で測っています", "そのまま待ってください。", 70);
      });
      setLoad("世界を組み立てています", "歩ける場所にしています", "", 90);
      world.loadPhoto(textureCanvas, depth);
      world.start();
      sceneTitle.textContent = "写真の中";
      sceneKicker.textContent = "Your world";
      setMood("original", world);
      show(hud, [loading, gate, settings]);
      joystick.classList.toggle("hidden", !world.walker.mobile);
      help.textContent = world.walker.mobile
        ? "左の円で歩く　右をドラッグして見る"
        : "クリックで視点を固定　W A S D で歩く　マウスで見る";

      void captionPhoto(textureCanvas).then((caption) => {
        if (!caption) return;
        sceneTitle.textContent = caption.title;
        sceneKicker.textContent = caption.detail || "Your world";
        setMood(caption.mood, world);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "処理に失敗しました。";
      setLoad("うまくいきませんでした", message, "別の写真か、Chrome でもう一度試してください。", 0);
    }
  }

  function setLoad(title: string, message: string, detail: string, percent: number) {
    loadTitle.textContent = title;
    loadMessage.textContent = message;
    loadDetail.textContent = detail;
    loadBar.style.width = `${percent}%`;
  }
}

function bindGate(drop: HTMLElement, file: HTMLInputElement, onPick: (file: File) => void) {
  drop.addEventListener("click", () => file.click());
  file.addEventListener("change", () => {
    const picked = file.files?.[0];
    if (picked) onPick(picked);
  });
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("over");
    const picked = event.dataTransfer?.files[0];
    if (picked) onPick(picked);
  });
}

function setMood(mood: Mood, world: World) {
  world.setMood(mood);
  for (const button of document.querySelectorAll<HTMLButtonElement>("#moods button")) {
    button.classList.toggle("on", button.dataset.mood === mood);
  }
}

function show(target: HTMLElement, hide: HTMLElement[]) {
  target.classList.remove("hidden");
  for (const node of hide) node.classList.add("hidden");
}

function reportModel(info: ProgressInfo, bar: HTMLElement, detail: HTMLElement) {
  if (typeof info.progress === "number") {
    bar.style.width = `${Math.max(8, Math.round(info.progress * 0.55))}%`;
  }
  if (info.file) detail.textContent = `${info.file} を取得しています`;
}
