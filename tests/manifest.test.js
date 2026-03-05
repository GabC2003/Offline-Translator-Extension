import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("manifest config enables inline popup and side panel", async () => {
  const raw = await readFile(new URL("../manifest.json", import.meta.url), "utf8");
  const manifest = JSON.parse(raw);

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, "src/background/service-worker.js");
  assert.equal(manifest.side_panel.default_path, "src/sidepanel/sidepanel.html");
  assert.equal(manifest.action.default_popup, undefined);
  assert.equal(manifest.action.default_icon["16"], "src/assets/icons/icon16.png");
  assert.equal(manifest.action.default_icon["48"], "src/assets/icons/icon48.png");
  assert.equal(manifest.icons["128"], "src/assets/icons/icon128.png");
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.ok(manifest.permissions.includes("storage"));
  assert.ok(manifest.permissions.includes("sidePanel"));
  assert.ok(Array.isArray(manifest.content_scripts));
  assert.ok(
    manifest.content_scripts.some(
      (item) =>
        item.matches?.includes("<all_urls>") &&
        item.js?.includes("src/content/inline-popup.js") &&
        item.css?.includes("src/content/inline-popup.css")
    )
  );
});
