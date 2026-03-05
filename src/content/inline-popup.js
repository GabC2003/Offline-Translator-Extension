(() => {
  const POPUP_ID = "translator-inline-popup";
  const DEFAULT_TARGET_LANGUAGE = "zh";
  const EDGE_MARGIN = 8;
  const translatorCache = new Map();
  let lastSelectionRect = null;
  let lastContextPoint = null;

  const CJK_RE = /[\u4e00-\u9fff]/;
  const HIRAGANA_KATAKANA_RE = /[\u3040-\u30ff]/;
  const HANGUL_RE = /[\uac00-\ud7af]/;

  document.addEventListener(
    "contextmenu",
    (event) => {
      lastContextPoint = { x: event.clientX, y: event.clientY };
      lastSelectionRect = getSelectionRect();
    },
    true
  );

  chrome.runtime.onMessage.addListener((message) => {
    if (!isSelectionMessage(message)) {
      return;
    }
    void showInlineTranslation(message.text, message.targetLanguage);
  });

  function isSelectionMessage(message) {
    return (
      Boolean(message) &&
      message.type === "selection-translate" &&
      typeof message.text === "string" &&
      typeof message.targetLanguage === "string"
    );
  }

  function normalizeTargetLanguage(value) {
    const normalized = normalizeLanguageCode(value);
    if (normalized === "en" || normalized === "zh") {
      return normalized;
    }
    return DEFAULT_TARGET_LANGUAGE;
  }

  function getLanguageLabel(code) {
    if (code === "zh") {
      return "Chinese";
    }
    if (code === "en") {
      return "English";
    }
    return code;
  }

  function normalizeLanguageCode(value) {
    if (!value || typeof value !== "string") {
      return "";
    }
    return value.toLowerCase().split("-")[0];
  }

  function inferSourceLanguageFromText(text) {
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

  async function detectSourceLanguage(text) {
    const value = String(text || "").trim();
    if (!value) {
      return "en";
    }

    if (!("LanguageDetector" in self)) {
      return inferSourceLanguageFromText(value);
    }

    try {
      const availability = await LanguageDetector.availability();
      if (availability === "unavailable") {
        return inferSourceLanguageFromText(value);
      }

      const detector = await LanguageDetector.create();
      if (detector?.ready) {
        await detector.ready;
      }

      const results = await detector.detect(value);
      const language = normalizeLanguageCode(results?.[0]?.detectedLanguage);
      return language || inferSourceLanguageFromText(value);
    } catch {
      return inferSourceLanguageFromText(value);
    }
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

  function getPairKey(sourceLanguage, targetLanguage) {
    return `${sourceLanguage}->${targetLanguage}`;
  }

  async function getTranslator(sourceLanguage, targetLanguage, onDownloadProgress) {
    if (!("Translator" in self)) {
      throw new Error("Translator API unavailable in this page context.");
    }

    const key = getPairKey(sourceLanguage, targetLanguage);
    if (translatorCache.has(key)) {
      return translatorCache.get(key);
    }

    const availability = await Translator.availability({
      sourceLanguage,
      targetLanguage
    });

    if (availability === "unavailable") {
      throw new Error(`Unsupported language pair: ${sourceLanguage} -> ${targetLanguage}.`);
    }

    let translator;
    try {
      translator = await Translator.create({
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
      if (availability === "downloadable" && navigator.onLine === false) {
        throw new Error(
          `Offline unavailable for ${sourceLanguage} -> ${targetLanguage}. Go online once to download this pack.`
        );
      }
      throw error;
    }

    if (translator?.ready) {
      try {
        await translator.ready;
      } catch (error) {
        if (availability === "downloadable" && navigator.onLine === false) {
          throw new Error(
            `Offline unavailable for ${sourceLanguage} -> ${targetLanguage}. Go online once to download this pack.`
          );
        }
        throw error;
      }
    }

    translatorCache.set(key, translator);
    return translator;
  }

  function getSelectionRect() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect && (rect.width > 0 || rect.height > 0)) {
      return rect;
    }
    const rects = range.getClientRects();
    if (rects?.length) {
      return rects[0];
    }
    return null;
  }

  function ensurePopupElement() {
    let root = document.getElementById(POPUP_ID);
    if (root) {
      return root;
    }

    root = document.createElement("div");
    root.id = POPUP_ID;
    root.innerHTML = `
      <div class="txp-head">
        <span class="txp-title">Translator</span>
        <button class="txp-close" type="button" aria-label="Close">x</button>
      </div>
      <div class="txp-status"></div>
      <div class="txp-result"></div>
      <div class="txp-actions">
        <button class="txp-copy" type="button">Copy</button>
      </div>
    `;
    document.body.appendChild(root);

    const closeButton = root.querySelector(".txp-close");
    closeButton?.addEventListener("click", () => {
      root.remove();
    });

    const copyButton = root.querySelector(".txp-copy");
    copyButton?.addEventListener("click", async () => {
      const resultEl = root.querySelector(".txp-result");
      const value = String(resultEl?.textContent || "").trim();
      if (!value) {
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        setPopupStatus(root, "Copied");
      } catch {
        setPopupStatus(root, "Copy failed", "err");
      }
    });

    return root;
  }

  function setPopupStatus(root, text, kind = "") {
    const statusEl = root.querySelector(".txp-status");
    if (!statusEl) {
      return;
    }
    statusEl.textContent = text;
    statusEl.classList.toggle("err", kind === "err");
  }

  function setPopupResult(root, text) {
    const resultEl = root.querySelector(".txp-result");
    if (!resultEl) {
      return;
    }
    resultEl.textContent = text;
  }

  function computePopupPosition(anchorRect, point, popupWidth, popupHeight) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = point ? point.x + scrollX : scrollX + EDGE_MARGIN;
    let top = point ? point.y + scrollY + EDGE_MARGIN : scrollY + EDGE_MARGIN;

    if (anchorRect) {
      left = anchorRect.left + scrollX;
      top = anchorRect.bottom + scrollY + EDGE_MARGIN;
      if (top + popupHeight > scrollY + viewportHeight - EDGE_MARGIN) {
        top = anchorRect.top + scrollY - popupHeight - EDGE_MARGIN;
      }
    }

    if (left + popupWidth > scrollX + viewportWidth - EDGE_MARGIN) {
      left = scrollX + viewportWidth - popupWidth - EDGE_MARGIN;
    }
    if (left < scrollX + EDGE_MARGIN) {
      left = scrollX + EDGE_MARGIN;
    }
    if (top + popupHeight > scrollY + viewportHeight - EDGE_MARGIN) {
      top = scrollY + viewportHeight - popupHeight - EDGE_MARGIN;
    }
    if (top < scrollY + EDGE_MARGIN) {
      top = scrollY + EDGE_MARGIN;
    }

    return { left, top };
  }

  function placePopup(root) {
    root.style.visibility = "hidden";
    root.style.left = "0";
    root.style.top = "0";

    const anchorRect = getSelectionRect() || lastSelectionRect;
    const width = root.offsetWidth || 320;
    const height = root.offsetHeight || 180;
    const { left, top } = computePopupPosition(anchorRect, lastContextPoint, width, height);

    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(top)}px`;
    root.style.visibility = "visible";
  }

  function setPopupTitle(root, text) {
    const titleEl = root.querySelector(".txp-title");
    if (!titleEl) {
      return;
    }
    titleEl.textContent = text;
  }

  async function showInlineTranslation(rawText, requestedTargetLanguage) {
    const text = String(rawText || "").trim();
    const targetLanguage = normalizeTargetLanguage(requestedTargetLanguage);
    if (!text) {
      return;
    }

    const root = ensurePopupElement();
    setPopupTitle(root, `Translate to ${getLanguageLabel(targetLanguage)}`);
    setPopupStatus(root, "Translating...");
    setPopupResult(root, "");
    placePopup(root);

    try {
      const sourceLanguage = await detectSourceLanguage(text);
      if (sourceLanguage === targetLanguage) {
        setPopupStatus(root, `Already ${getLanguageLabel(targetLanguage)}.`);
        setPopupResult(root, text);
        placePopup(root);
        return;
      }

      const translator = await getTranslator(sourceLanguage, targetLanguage, (progress) => {
        const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
        setPopupStatus(root, `Downloading pack ${percent}%...`);
      });

      setPopupStatus(root, `Detected ${sourceLanguage}, translating...`);
      const output = await translator.translate(text);
      setPopupStatus(root, `${sourceLanguage} -> ${targetLanguage}`);
      setPopupResult(root, output);
      placePopup(root);
    } catch (error) {
      setPopupStatus(root, "Translation failed", "err");
      setPopupResult(root, error?.message || "Unknown error");
      placePopup(root);
    }
  }
})();
