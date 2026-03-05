import {
  CONTEXT_MENU_TRANSLATE_SELECTION,
  STORAGE_KEY_PENDING_SELECTION,
  createSelectionMessage
} from "../common/messages.js";
import {
  MENU_TARGET_LANGUAGE_OPTIONS,
  getTargetLanguageByMenuId
} from "./context-menu-options.js";

async function ensureSidePanelBehavior() {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return;
  }
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

async function ensureContextMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: CONTEXT_MENU_TRANSLATE_SELECTION,
    title: "Translate selected text",
    contexts: ["selection"]
  });

  for (const option of MENU_TARGET_LANGUAGE_OPTIONS) {
    chrome.contextMenus.create({
      id: option.id,
      parentId: CONTEXT_MENU_TRANSLATE_SELECTION,
      title: option.title,
      contexts: ["selection"]
    });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSidePanelBehavior();
  await ensureContextMenu();
});

chrome.runtime.onStartup?.addListener(async () => {
  await ensureSidePanelBehavior();
  await ensureContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetLanguage = getTargetLanguageByMenuId(String(info.menuItemId || ""));
  if (!targetLanguage) {
    return;
  }

  const text = (info.selectionText || "").trim();
  if (!text) {
    return;
  }

  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, createSelectionMessage(text, targetLanguage));
      return;
    } catch {
      // Ignore and fallback to storage for manual retrieval.
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEY_PENDING_SELECTION]: text });
  if (tab?.windowId && chrome.sidePanel?.open) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
