export class TranslatorUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "TranslatorUnavailableError";
  }
}

export function isTranslatorApiSupported(runtime = globalThis) {
  return Boolean(runtime && runtime.Translator);
}

function getPairKey(sourceLanguage, targetLanguage) {
  return `${sourceLanguage}->${targetLanguage}`;
}

function resolveOnlineState(override) {
  if (typeof override === "boolean") {
    return override;
  }
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

function extractProgressValue(event) {
  if (!event || typeof event !== "object") {
    return 0;
  }
  if (typeof event.loaded === "number" && typeof event.total === "number" && event.total > 0) {
    return event.loaded / event.total;
  }
  if (typeof event.loaded === "number") {
    return event.loaded;
  }
  if (typeof event.progress === "number") {
    return event.progress;
  }
  return 0;
}

export class TranslatorSessionManager {
  constructor({ translatorApi = globalThis.Translator } = {}) {
    this.translatorApi = translatorApi;
    this.cache = new Map();
  }

  hasSession(sourceLanguage, targetLanguage) {
    return this.cache.has(getPairKey(sourceLanguage, targetLanguage));
  }

  invalidateSession(sourceLanguage, targetLanguage) {
    this.cache.delete(getPairKey(sourceLanguage, targetLanguage));
  }

  clearSessions() {
    this.cache.clear();
  }

  async getTranslator({ sourceLanguage, targetLanguage, onDownloadProgress, isOnline } = {}) {
    if (!this.translatorApi) {
      throw new TranslatorUnavailableError("Translator API not supported in this context.");
    }

    const cacheKey = getPairKey(sourceLanguage, targetLanguage);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const availability = await this.translatorApi.availability({
      sourceLanguage,
      targetLanguage
    });

    if (availability === "unavailable") {
      throw new TranslatorUnavailableError(
        `Unsupported language pair: ${sourceLanguage} -> ${targetLanguage}.`
      );
    }

    let translator;
    try {
      translator = await this.translatorApi.create({
        sourceLanguage,
        targetLanguage,
        monitor(monitorTarget) {
          if (!onDownloadProgress || !monitorTarget?.addEventListener) {
            return;
          }
          monitorTarget.addEventListener("downloadprogress", (event) => {
            onDownloadProgress(extractProgressValue(event));
          });
        }
      });
    } catch (error) {
      if (availability === "downloadable" && resolveOnlineState(isOnline) === false) {
        throw new TranslatorUnavailableError(
          `Offline mode is unavailable for ${sourceLanguage} -> ${targetLanguage} because the language pack is not downloaded yet. Go online once and translate with this pair to cache it locally.`
        );
      }
      throw error;
    }

    if (translator?.ready) {
      try {
        await translator.ready;
      } catch (error) {
        if (availability === "downloadable" && resolveOnlineState(isOnline) === false) {
          throw new TranslatorUnavailableError(
            `Offline mode is unavailable for ${sourceLanguage} -> ${targetLanguage} because the language pack is not downloaded yet. Go online once and translate with this pair to cache it locally.`
          );
        }
        throw error;
      }
    }

    this.cache.set(cacheKey, translator);
    return translator;
  }
}
