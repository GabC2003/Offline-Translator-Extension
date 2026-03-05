import test from "node:test";
import assert from "node:assert/strict";
import { isSidePanelUserGestureError } from "../src/background/sidepanel-error.js";

test("detects sidePanel.open user gesture restriction error", () => {
  const error = new Error("`sidePanel.open()` may only be called in response to a user gesture.");
  assert.equal(isSidePanelUserGestureError(error), true);
});

test("does not match unrelated errors", () => {
  const error = new Error("network unavailable");
  assert.equal(isSidePanelUserGestureError(error), false);
});
