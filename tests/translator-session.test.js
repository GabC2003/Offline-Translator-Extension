import test from "node:test";
import assert from "node:assert/strict";
import {
  TranslatorSessionManager,
  TranslatorUnavailableError
} from "../src/sidepanel/translator-session.js";

function createFakeTranslatorApi(overrides = {}) {
  let createCalls = 0;

  const api = {
    async availability() {
      return "available";
    },
    async create({ monitor } = {}) {
      createCalls += 1;
      if (monitor) {
        const monitorTarget = {
          addEventListener() {}
        };
        if (typeof monitor === "function") {
          monitor(monitorTarget);
        } else if (monitor.addEventListener) {
          monitor.addEventListener("downloadprogress", () => {});
        }
      }
      return {
        ready: Promise.resolve(),
        async translate(text) {
          return `tx:${text}`;
        }
      };
    },
    get createCalls() {
      return createCalls;
    },
    ...overrides
  };

  return api;
}

test("session manager caches translator by language pair", async () => {
  const api = createFakeTranslatorApi();
  const manager = new TranslatorSessionManager({ translatorApi: api });

  const first = await manager.getTranslator({
    sourceLanguage: "en",
    targetLanguage: "zh"
  });
  const second = await manager.getTranslator({
    sourceLanguage: "en",
    targetLanguage: "zh"
  });

  assert.equal(first, second);
  assert.equal(api.createCalls, 1);
});

test("session manager throws when translator is unavailable", async () => {
  const api = createFakeTranslatorApi({
    async availability() {
      return "unavailable";
    }
  });
  const manager = new TranslatorSessionManager({ translatorApi: api });

  await assert.rejects(
    () =>
      manager.getTranslator({
        sourceLanguage: "en",
        targetLanguage: "ja"
      }),
    TranslatorUnavailableError
  );
});

test("session manager throws clear error when offline and pack is only downloadable", async () => {
  const api = createFakeTranslatorApi({
    async availability() {
      return "downloadable";
    },
    async create() {
      throw new Error("Network unavailable");
    }
  });
  const manager = new TranslatorSessionManager({ translatorApi: api });

  await assert.rejects(
    () =>
      manager.getTranslator({
        sourceLanguage: "en",
        targetLanguage: "ja",
        isOnline: false
      }),
    (error) =>
      error instanceof TranslatorUnavailableError &&
      /offline/i.test(error.message) &&
      /download/i.test(error.message)
  );
});

test("session manager can invalidate cached translator session", async () => {
  const api = createFakeTranslatorApi();
  const manager = new TranslatorSessionManager({ translatorApi: api });

  const first = await manager.getTranslator({
    sourceLanguage: "en",
    targetLanguage: "zh"
  });

  manager.invalidateSession("en", "zh");

  const second = await manager.getTranslator({
    sourceLanguage: "en",
    targetLanguage: "zh"
  });

  assert.notEqual(first, second);
  assert.equal(api.createCalls, 2);
});
