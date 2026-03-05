import { STORAGE_KEY_PENDING_SELECTION } from "../common/messages.js";
import {
  TranslatorSessionManager,
  TranslatorUnavailableError,
  isTranslatorApiSupported
} from "../sidepanel/translator-session.js";
import { detectSourceLanguage } from "./translation-engine.js";

const TARGET_LANGUAGE = "zh";

const sourceText = document.querySelector("#source-text");
const targetText = document.querySelector("#target-text");
const translateButton = document.querySelector("#translate-btn");
const clearButton = document.querySelector("#clear-btn");
const copyButton = document.querySelector("#copy-btn");
const statusChip = document.querySelector("#status-chip");
const statusMessage = document.querySelector("#status-message");
const downloadProgress = document.querySelector("#download-progress");

const sessionManager = new TranslatorSessionManager();

function isRetryableTranslateFailure(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("other generic failures occurred") ||
    message.includes("invalid state") ||
    message.includes("no longer usable") ||
    message.includes("aborted")
  );
}

function setStatus(text, kind = "") {
  statusChip.textContent = text;
  statusChip.classList.remove("ok", "warn", "err");
  if (kind) {
    statusChip.classList.add(kind);
  }
}

function setStatusMessage(text, kind = "") {
  const message = String(text || "").trim();
  if (!message) {
    statusMessage.textContent = "";
    statusMessage.hidden = true;
    statusMessage.classList.remove("err");
    return;
  }
  statusMessage.hidden = false;
  statusMessage.textContent = message;
  statusMessage.classList.toggle("err", kind === "err");
}

function setProgress(value, visible) {
  downloadProgress.hidden = !visible;
  downloadProgress.value = Math.max(0, Math.min(1, Number(value) || 0));
}

async function translateToChinese() {
  const text = sourceText.value.trim();
  if (!text) {
    setStatus("Error", "err");
    setStatusMessage("Input text is empty.", "err");
    return;
  }

  if (!isTranslatorApiSupported()) {
    setStatus("Error", "err");
    setStatusMessage("Translator API unavailable in current Chrome.", "err");
    return;
  }

  const sourceLanguage = await detectSourceLanguage(text);
  if (sourceLanguage === TARGET_LANGUAGE) {
    targetText.value = text;
    setStatus("Done", "ok");
    setStatusMessage("Source text is already Chinese.");
    return;
  }

  try {
    if (!sessionManager.hasSession(sourceLanguage, TARGET_LANGUAGE)) {
      setStatus("Downloading", "warn");
      setStatusMessage(
        `Preparing offline pack for ${sourceLanguage} -> ${TARGET_LANGUAGE}. Keep network on for first run.`
      );
      setProgress(0, true);
      translateButton.disabled = true;
    }

    const getTranslator = () =>
      sessionManager.getTranslator({
        sourceLanguage,
        targetLanguage: TARGET_LANGUAGE,
        isOnline: navigator.onLine,
        onDownloadProgress(progress) {
          setProgress(progress, true);
        }
      });

    let translator = await getTranslator();

    setStatus("Translating", "warn");
    setStatusMessage(`Detected source: ${sourceLanguage}. Translating to Chinese.`);
    translateButton.disabled = true;

    let output;
    try {
      output = await translator.translate(text);
    } catch (error) {
      if (!isRetryableTranslateFailure(error)) {
        throw error;
      }
      sessionManager.invalidateSession(sourceLanguage, TARGET_LANGUAGE);
      translator = await getTranslator();
      output = await translator.translate(text);
    }
    targetText.value = output;
    setStatus("Done", "ok");
    setStatusMessage(`Translated from ${sourceLanguage} -> ${TARGET_LANGUAGE}.`);
    setProgress(1, true);
  } catch (error) {
    setStatus("Error", "err");
    if (error instanceof TranslatorUnavailableError) {
      setStatusMessage(error.message, "err");
    } else {
      setStatusMessage(error?.message || "Translation failed.", "err");
    }
  } finally {
    translateButton.disabled = false;
  }
}

function clearAll() {
  sourceText.value = "";
  targetText.value = "";
  setStatus("Idle");
  setStatusMessage("");
  setProgress(0, false);
}

async function copyOutput() {
  const value = targetText.value.trim();
  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setStatus("Copied", "ok");
    setStatusMessage("");
  } catch {
    setStatus("Error", "err");
    setStatusMessage("Copy failed.", "err");
  }
}

async function hydrateFromSelection() {
  const data = await chrome.storage.local.get(STORAGE_KEY_PENDING_SELECTION);
  const pending = data[STORAGE_KEY_PENDING_SELECTION];
  if (typeof pending === "string" && pending.trim()) {
    sourceText.value = pending.trim();
    await chrome.storage.local.remove(STORAGE_KEY_PENDING_SELECTION);
    await translateToChinese();
  }
}

function bindEvents() {
  translateButton.addEventListener("click", () => {
    void translateToChinese();
  });
  clearButton.addEventListener("click", clearAll);
  copyButton.addEventListener("click", () => {
    void copyOutput();
  });
}

async function init() {
  setStatus("Idle");
  setStatusMessage("");
  setProgress(0, false);
  bindEvents();
  await hydrateFromSelection();
}

void init();
