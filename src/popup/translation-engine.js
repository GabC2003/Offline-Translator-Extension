const CJK_RE = /[\u4e00-\u9fff]/;
const HIRAGANA_KATAKANA_RE = /[\u3040-\u30ff]/;
const HANGUL_RE = /[\uac00-\ud7af]/;

function normalizeLanguageCode(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.toLowerCase().split("-")[0];
}

export function inferSourceLanguageFromText(text) {
  if (HIRAGANA_KATAKANA_RE.test(text)) {
    return "ja";
  }
  if (HANGUL_RE.test(text)) {
    return "ko";
  }
  if (CJK_RE.test(text)) {
    return "zh";
  }
  return "en";
}

export async function detectSourceLanguage(
  text,
  { detectorApi = globalThis.LanguageDetector, fallbackLanguage = "en" } = {}
) {
  const value = String(text || "").trim();
  if (!value) {
    return fallbackLanguage;
  }

  try {
    if (!detectorApi?.availability || !detectorApi?.create) {
      return inferSourceLanguageFromText(value);
    }

    const availability = await detectorApi.availability();
    if (availability === "unavailable") {
      return inferSourceLanguageFromText(value);
    }

    const detector = await detectorApi.create();
    if (detector?.ready) {
      await detector.ready;
    }

    const results = await detector.detect(value);
    const language = normalizeLanguageCode(results?.[0]?.detectedLanguage);
    return language || inferSourceLanguageFromText(value) || fallbackLanguage;
  } catch {
    return inferSourceLanguageFromText(value) || fallbackLanguage;
  }
}
