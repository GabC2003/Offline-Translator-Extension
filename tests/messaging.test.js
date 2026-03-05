import test from "node:test";
import assert from "node:assert/strict";
import {
  MESSAGE_TYPE_SELECTION_TRANSLATE,
  createSelectionMessage,
  isSelectionMessage
} from "../src/common/messages.js";

test("createSelectionMessage builds valid payload", () => {
  const payload = createSelectionMessage("hello", "en");

  assert.equal(payload.type, MESSAGE_TYPE_SELECTION_TRANSLATE);
  assert.equal(payload.text, "hello");
  assert.equal(payload.targetLanguage, "en");
  assert.equal(isSelectionMessage(payload), true);
});

test("isSelectionMessage rejects malformed payload", () => {
  assert.equal(isSelectionMessage({ type: "other", text: "x" }), false);
  assert.equal(isSelectionMessage({ type: MESSAGE_TYPE_SELECTION_TRANSLATE }), false);
  assert.equal(isSelectionMessage({ type: MESSAGE_TYPE_SELECTION_TRANSLATE, text: "x" }), false);
});
