import {
  CONTEXT_MENU_TRANSLATE_TO_EN,
  CONTEXT_MENU_TRANSLATE_TO_ZH
} from "../common/messages.js";

export const MENU_TARGET_LANGUAGE_OPTIONS = [
  {
    id: CONTEXT_MENU_TRANSLATE_TO_ZH,
    title: "Translate to Chinese (中文)",
    targetLanguage: "zh"
  },
  {
    id: CONTEXT_MENU_TRANSLATE_TO_EN,
    title: "Translate to English",
    targetLanguage: "en"
  }
];

export function getTargetLanguageByMenuId(menuItemId) {
  for (const item of MENU_TARGET_LANGUAGE_OPTIONS) {
    if (item.id === menuItemId) {
      return item.targetLanguage;
    }
  }
  return null;
}
