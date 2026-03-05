export const CONTEXT_MENU_TRANSLATE_SELECTION = "translate-selection";
export const CONTEXT_MENU_TRANSLATE_TO_ZH = "translate-selection-to-zh";
export const CONTEXT_MENU_TRANSLATE_TO_EN = "translate-selection-to-en";
export const MESSAGE_TYPE_SELECTION_TRANSLATE = "selection-translate";
export const STORAGE_KEY_PENDING_SELECTION = "pendingSelectionText";
export const STORAGE_KEY_LANGUAGE_SETTINGS = "languageSettings";

export function createSelectionMessage(text, targetLanguage = "zh") {
  return {
    type: MESSAGE_TYPE_SELECTION_TRANSLATE,
    text,
    targetLanguage
  };
}

export function isSelectionMessage(payload) {
  return (
    Boolean(payload) &&
    payload.type === MESSAGE_TYPE_SELECTION_TRANSLATE &&
    typeof payload.text === "string" &&
    typeof payload.targetLanguage === "string"
  );
}
