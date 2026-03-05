import test from "node:test";
import assert from "node:assert/strict";
import { initialUiState, uiStateReducer } from "../src/sidepanel/ui-state.js";

test("ui state transitions idle -> downloading -> ready -> translating -> done", () => {
  const downloading = uiStateReducer(initialUiState, {
    type: "download-start"
  });
  assert.equal(downloading.phase, "downloading");

  const ready = uiStateReducer(downloading, {
    type: "download-progress",
    progress: 1
  });
  assert.equal(ready.phase, "ready");
  assert.equal(ready.downloadProgress, 1);

  const translating = uiStateReducer(ready, {
    type: "translate-start"
  });
  assert.equal(translating.phase, "translating");

  const done = uiStateReducer(translating, {
    type: "translate-success",
    output: "你好"
  });
  assert.equal(done.phase, "done");
  assert.equal(done.outputText, "你好");
});

test("ui state moves to error on translation failure", () => {
  const translating = uiStateReducer(initialUiState, {
    type: "translate-start"
  });
  const errored = uiStateReducer(translating, {
    type: "translate-error",
    message: "boom"
  });

  assert.equal(errored.phase, "error");
  assert.equal(errored.errorMessage, "boom");
});
