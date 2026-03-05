import test from "node:test";
import assert from "node:assert/strict";
import {
  detectSourceLanguage,
  inferSourceLanguageFromText
} from "../src/popup/translation-engine.js";

test("detectSourceLanguage uses LanguageDetector result when available", async () => {
  const detectorApi = {
    async availability() {
      return "available";
    },
    async create() {
      return {
        ready: Promise.resolve(),
        async detect() {
          return [{ detectedLanguage: "es", confidence: 0.91 }];
        }
      };
    }
  };

  const detected = await detectSourceLanguage("hola", { detectorApi });
  assert.equal(detected, "es");
});

test("inferSourceLanguageFromText returns zh for CJK text", () => {
  assert.equal(inferSourceLanguageFromText("你好，世界"), "zh");
});

test("detectSourceLanguage falls back to english for latin text", async () => {
  const detected = await detectSourceLanguage("proxy", { detectorApi: null });
  assert.equal(detected, "en");
});
