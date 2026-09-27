import { GEMINI_KEY_STORAGE } from "./config";
import { canvasToJpegDataUrl } from "./image";
import type { Mood } from "./atmosphere";

export type Caption = {
  title: string;
  detail: string;
  mood: Mood;
};

const moods: Mood[] = ["original", "dusk", "snow", "neon"];

export function loadGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) ?? "";
}

export function saveGeminiKey(value: string) {
  if (value.trim()) localStorage.setItem(GEMINI_KEY_STORAGE, value.trim());
  else localStorage.removeItem(GEMINI_KEY_STORAGE);
}

export async function captionPhoto(textureCanvas: HTMLCanvasElement): Promise<Caption | null> {
  const key = loadGeminiKey();
  if (!key) return null;

  const compact = document.createElement("canvas");
  const scale = Math.min(1, 640 / Math.max(textureCanvas.width, textureCanvas.height));
  compact.width = Math.round(textureCanvas.width * scale);
  compact.height = Math.round(textureCanvas.height * scale);
  compact.getContext("2d")?.drawImage(textureCanvas, 0, 0, compact.width, compact.height);
  const dataUrl = canvasToJpegDataUrl(compact, 0.7);
  const base64 = dataUrl.split(",")[1] ?? "";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'この写真の場所を、短い日本語のタイトルと一文の案内にしてください。雰囲気は original / dusk / snow / neon のどれか1つ。JSONだけ返してください。{"title":"","detail":"","mood":"original"}',
              },
              { inline_data: { mime_type: "image/jpeg", data: base64 } },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as Caption;
  return {
    title: parsed.title || "写真の中",
    detail: parsed.detail || "",
    mood: moods.includes(parsed.mood) ? parsed.mood : "original",
  };
}
