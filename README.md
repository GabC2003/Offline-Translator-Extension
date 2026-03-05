# Offline Translator Wood (Chrome Extension)

A Manifest V3 Chrome extension using Chrome built-in `Translator` API for local-first translation.

## Features

- Inline translation bubble near selected text
- Right-click selected text -> choose target language (Chinese/English)
- Bubble appears beside selection and supports one-click copy
- Click extension icon -> open full side panel translator
- Wood-tone minimalist interface
- Futuristic tech-style extension icon
- Offline after first model/language-pack download

## Local Run

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `Translator-extension`

## Usage

1. Select text on any page, right-click, then choose **Translate selected text**.
2. Choose **Translate to Chinese (中文)** or **Translate to English**.
3. An inline bubble appears near selection and shows translation result.
4. Click **Copy** in the bubble to copy translated text.
5. Click extension icon to open side panel for full translator controls.
6. First run may download required resources; after that it can work offline for cached language pairs.

## Offline Notes

- Offline translation is **language-pair specific**.
- Keep network connected for the first successful translation of each pair (for example `en -> ja`) so Chrome can cache that pack.
- If offline and a pair is not cached yet, the UI now shows a clear error asking you to pre-download online once.

## Test

Run:

```bash
npm test
```
