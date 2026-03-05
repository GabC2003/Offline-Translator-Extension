# Offline Chrome Translator Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-first Chrome extension that translates user text with Chrome Translator API, works offline after model/language-pack download, and provides a clean wood-tone UI.

**Architecture:** Use a Manifest V3 extension with a side panel UI as the primary surface. Run `Translator` and `LanguageDetector` only in extension document contexts (side panel/popup), not in service worker, because these APIs are not available in Web Workers. Service worker handles only browser integration (context menu, message routing). Cache translator sessions by language pair in UI runtime to reduce repeated setup.

**Tech Stack:** Vanilla HTML/CSS/JS, Chrome Extensions MV3 APIs (`sidePanel`, `contextMenus`, `storage`), Translator API, Language Detector API, optional Vitest for pure logic unit tests.

---

## Brainstormed approaches

1. Popup-only translator (fastest, least features)
2. Side panel translator with selected-text handoff (recommended)
3. In-page floating translator injected by content script (most complex)

**Recommendation:** Approach 2. It keeps UI stable for long text, supports repeated translations better than popup, and avoids heavy DOM injection complexity while still giving one-click “translate selection” via context menu.

### Task 1: Bootstrap extension skeleton

**Files:**
- Create: `manifest.json`
- Create: `src/background/service-worker.js`
- Create: `src/sidepanel/sidepanel.html`
- Create: `src/sidepanel/sidepanel.css`
- Create: `src/sidepanel/sidepanel.js`
- Create: `src/common/constants.js`

**Step 1: Write the failing test**

Create `tests/manifest.test.js` asserting manifest has MV3, `side_panel.default_path`, and required permissions.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/manifest.test.js`
Expected: FAIL because files do not exist.

**Step 3: Write minimal implementation**

Add manifest and empty module stubs, wire `action` click to open side panel.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/manifest.test.js`
Expected: PASS.

**Step 5: Commit**

`git add manifest.json src tests && git commit -m "feat: scaffold mv3 side panel extension"`

### Task 2: Implement translation core (offline-first)

**Files:**
- Modify: `src/sidepanel/sidepanel.js`
- Create: `src/sidepanel/translator-session.js`
- Create: `src/sidepanel/language-detector.js`
- Create: `tests/translator-session.test.js`

**Step 1: Write the failing test**

Test `getTranslator(source,target)` caches by language pair and rejects unsupported availability states.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/translator-session.test.js`
Expected: FAIL with missing module/functions.

**Step 3: Write minimal implementation**

Implement:
- Feature detection (`'Translator' in self`, `'LanguageDetector' in self`)
- `Translator.availability({ sourceLanguage, targetLanguage })`
- `Translator.create({ ..., monitor })` with `downloadprogress`
- `await translator.ready`, then `translate()` / `translateStreaming()` for long text
- Optional auto-detect source language using `LanguageDetector`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/translator-session.test.js`
Expected: PASS.

**Step 5: Commit**

`git add src tests && git commit -m "feat: add translator and detector session layer"`

### Task 3: Build wood-tone UI and interaction states

**Files:**
- Modify: `src/sidepanel/sidepanel.html`
- Modify: `src/sidepanel/sidepanel.css`
- Modify: `src/sidepanel/sidepanel.js`
- Create: `src/assets/icons/*`

**Step 1: Write the failing test**

Create `tests/ui-state.test.js` for state transitions: idle -> downloading -> ready -> translating -> done/error.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui-state.test.js`
Expected: FAIL due missing reducer/state helpers.

**Step 3: Write minimal implementation**

Implement UI with:
- Palette tokens: oak, walnut, parchment, charcoal
- Two-panel layout (input/output), compact language selectors, swap button
- Progress bar bound to `downloadprogress`
- Buttons: Translate, Copy, Clear
- Status chips: Offline Ready / Downloading / API Unsupported

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui-state.test.js`
Expected: PASS.

**Step 5: Commit**

`git add src tests && git commit -m "feat: implement wood-tone side panel ui and states"`

### Task 4: Browser integration and persistence

**Files:**
- Modify: `src/background/service-worker.js`
- Create: `src/content/selection-bridge.js`
- Modify: `manifest.json`
- Create: `tests/messaging.test.js`

**Step 1: Write the failing test**

Test message schema for selection-to-sidepanel handoff and settings persistence contract.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/messaging.test.js`
Expected: FAIL because message handlers are absent.

**Step 3: Write minimal implementation**

Implement:
- Context menu: “Translate selected text”
- Send selected text to side panel via runtime messaging
- Persist target language and last mode in `chrome.storage.local`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/messaging.test.js`
Expected: PASS.

**Step 5: Commit**

`git add manifest.json src tests && git commit -m "feat: add selection integration and settings persistence"`

### Task 5: Verification and packaging

**Files:**
- Create: `README.md`
- Create: `docs/qa/offline-checklist.md`

**Step 1: Write the failing test**

Define manual QA checklist: first-run download, airplane-mode translation, unsupported-device fallback.

**Step 2: Run verification**

Commands:
- `npm test`
- Load unpacked extension in `chrome://extensions`
- Open side panel and run first translation online (downloads model/packs)
- Disconnect network and verify translation still works

**Step 3: Document results**

Record observed behavior and known constraints in `README.md`.

**Step 4: Commit**

`git add README.md docs && git commit -m "docs: add setup and offline validation guide"`

