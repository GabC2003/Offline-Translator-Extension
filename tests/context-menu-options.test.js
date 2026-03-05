import test from "node:test";
import assert from "node:assert/strict";
import {
  getTargetLanguageByMenuId,
  MENU_TARGET_LANGUAGE_OPTIONS
} from "../src/background/context-menu-options.js";

test("menu options include english and chinese targets", () => {
  const languages = MENU_TARGET_LANGUAGE_OPTIONS.map((item) => item.targetLanguage).sort();
  assert.deepEqual(languages, ["en", "zh"]);
});

test("getTargetLanguageByMenuId resolves known menu ids", () => {
  assert.equal(getTargetLanguageByMenuId("translate-selection-to-zh"), "zh");
  assert.equal(getTargetLanguageByMenuId("translate-selection-to-en"), "en");
  assert.equal(getTargetLanguageByMenuId("translate-selection"), "zh");
  assert.equal(getTargetLanguageByMenuId("other"), null);
});
