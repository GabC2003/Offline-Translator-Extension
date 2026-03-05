import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, LANGUAGE_OPTIONS } from "../common/constants.js";
import {
  MESSAGE_TYPE_SELECTION_TRANSLATE,
  STORAGE_KEY_LANGUAGE_SETTINGS,
  STORAGE_KEY_PENDING_SELECTION,
  isSelectionMessage
} from "../common/messages.js";
import { TranslatorSessionManager, TranslatorUnavailableError, isTranslatorApiSupported } from "./translator-session.js";
import { initialUiState, uiStateReducer } from "./ui-state.js";

const sourceSelect = document.querySelector("#source-language");
const targetSelect = document.querySelector("#target-language");
const sourceText = document.querySelector("#source-text");
const targetText = document.querySelector("#target-text");
const translateButton = document.querySelector("#translate-btn");
const clearButton = document.querySelector("#clear-btn");
const copyButton = document.querySelector("#copy-btn");
const swapButton = document.querySelector("#swap-languages");
const statusChip = document.querySelector("#status-chip");
const statusMessage = document.querySelector("#status-message");
const downloadProgress = document.querySelector("#download-progress");

const sessionManager = new TranslatorSessionManager();

let state = { ...initialUiState };

function isRetryableTranslateFailure(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("other generic failures occurred") ||
    message.includes("invalid state") ||
    message.includes("no longer usable") ||
    message.includes("aborted")
  );
}

function dispatch(action) {
  state = uiStateReducer(state, action);
  renderState();
}

function renderLanguages() {
  const options = LANGUAGE_OPTIONS.map(
    ({ value, label }) => `<option value="${value}">${label}</option>`
  ).join("");
  sourceSelect.innerHTML = options;
  targetSelect.innerHTML = options;
}

async function restoreLanguageSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY_LANGUAGE_SETTINGS);
  const settings = stored[STORAGE_KEY_LANGUAGE_SETTINGS] || {};

  sourceSelect.value = settings.sourceLanguage || DEFAULT_SOURCE_LANGUAGE;
  targetSelect.value = settings.targetLanguage || DEFAULT_TARGET_LANGUAGE;
}

async function saveLanguageSettings() {
  await chrome.storage.local.set({
    [STORAGE_KEY_LANGUAGE_SETTINGS]: {
      sourceLanguage: sourceSelect.value,
      targetLanguage: targetSelect.value
    }
  });
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

function renderState() {
  targetText.value = state.outputText;

  switch (state.phase) {
    case "idle":
      setStatus("Idle");
      setStatusMessage("");
      downloadProgress.hidden = true;
      downloadProgress.value = 0;
      translateButton.disabled = false;
      break;
    case "downloading":
      setStatus("Downloading language pack", "warn");
      setStatusMessage("Please keep network connected until the first download finishes.");
      downloadProgress.hidden = false;
      downloadProgress.value = state.downloadProgress;
      translateButton.disabled = true;
      break;
    case "ready":
      setStatus("Offline ready", "ok");
      setStatusMessage(`Current pair is ready: ${sourceSelect.value} -> ${targetSelect.value}`);
      downloadProgress.hidden = false;
      downloadProgress.value = 1;
      translateButton.disabled = false;
      break;
    case "translating":
      setStatus("Translating...", "warn");
      setStatusMessage("");
      translateButton.disabled = true;
      break;
    case "done":
      setStatus("Done", "ok");
      setStatusMessage("");
      translateButton.disabled = false;
      break;
    case "error":
      setStatus("Error", "err");
      setStatusMessage(state.errorMessage || "Unknown error", "err");
      translateButton.disabled = false;
      break;
    default:
      break;
  }
}

async function translateCurrentText() {
  const text = sourceText.value.trim();
  if (!text) {
    dispatch({ type: "translate-error", message: "Input text is empty." });
    return;
  }

  if (!isTranslatorApiSupported()) {
    dispatch({
      type: "translate-error",
      message: "Translator API unavailable in current Chrome."
    });
    return;
  }

  const sourceLanguage = sourceSelect.value;
  const targetLanguage = targetSelect.value;

  if (sourceLanguage === targetLanguage) {
    dispatch({
      type: "translate-error",
      message: "Source and target languages must be different."
    });
    return;
  }

  try {
    if (!sessionManager.hasSession(sourceLanguage, targetLanguage)) {
      dispatch({ type: "download-start" });
    }

    const getTranslator = () =>
      sessionManager.getTranslator({
        sourceLanguage,
        targetLanguage,
        isOnline: navigator.onLine,
        onDownloadProgress(progress) {
          dispatch({
            type: "download-progress",
            progress
          });
        }
      });

    dispatch({ type: "translate-start" });
    let translator = await getTranslator();
    let output;
    try {
      output = await translator.translate(text);
    } catch (error) {
      if (!isRetryableTranslateFailure(error)) {
        throw error;
      }
      sessionManager.invalidateSession(sourceLanguage, targetLanguage);
      translator = await getTranslator();
      output = await translator.translate(text);
    }

    dispatch({ type: "translate-success", output });
  } catch (error) {
    if (error instanceof TranslatorUnavailableError) {
      dispatch({ type: "translate-error", message: error.message });
      return;
    }
    dispatch({
      type: "translate-error",
      message: error?.message || "Translation failed."
    });
  }
}

function swapLanguages() {
  const oldSource = sourceSelect.value;
  sourceSelect.value = targetSelect.value;
  targetSelect.value = oldSource;
  void saveLanguageSettings();
}

async function copyOutputText() {
  if (!targetText.value.trim()) {
    return;
  }
  try {
    await navigator.clipboard.writeText(targetText.value);
    setStatus("Copied output", "ok");
  } catch {
    setStatus("Copy failed", "err");
  }
}

function clearAll() {
  sourceText.value = "";
  targetText.value = "";
  dispatch({ type: "clear" });
}

async function hydrateSelectionFromStorage() {
  const data = await chrome.storage.local.get(STORAGE_KEY_PENDING_SELECTION);
  const pending = data[STORAGE_KEY_PENDING_SELECTION];
  if (typeof pending === "string" && pending.trim()) {
    sourceText.value = pending.trim();
    await chrome.storage.local.remove(STORAGE_KEY_PENDING_SELECTION);
  }
}

function bindEvents() {
  translateButton.addEventListener("click", () => {
    void translateCurrentText();
  });

  clearButton.addEventListener("click", clearAll);
  copyButton.addEventListener("click", () => {
    void copyOutputText();
  });
  swapButton.addEventListener("click", swapLanguages);

  sourceSelect.addEventListener("change", () => {
    void saveLanguageSettings();
  });
  targetSelect.addEventListener("change", () => {
    void saveLanguageSettings();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (!isSelectionMessage(message)) {
      return;
    }
    sourceText.value = message.text.trim();
    if (message.type === MESSAGE_TYPE_SELECTION_TRANSLATE) {
      void translateCurrentText();
    }
  });
}

async function init() {
  renderLanguages();
  await restoreLanguageSettings();
  await hydrateSelectionFromStorage();
  bindEvents();
  renderState();
}

void init();
