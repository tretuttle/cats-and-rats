# Cats & Rats

[github.com/tretuttle/cats-and-rats](https://github.com/tretuttle/cats-and-rats)

Find images on the active page, select, download. Works in **Chrome / Edge / Brave** (toolbar popup) and **Firefox / Zen** (popup + sidebar).

This package is an MV3 extension you can:
- sideload for QA
- zip for Chrome Web Store
- submit to Firefox AMO

## Load unpacked (dev)

### Chrome / Edge / Brave

1. `chrome://extensions` → Developer mode  
2. **Load unpacked** → `C:\Users\trent\cats-and-rats\src`

### Firefox / Zen

1. `about:debugging#/runtime/this-firefox`  
2. **Load Temporary Add-on** → pick `src\manifest.json`  
   (Temp = gone after restart. For permanent, use AMO or signed XPI.)

Or permanent unsigned only on Nightly/Dev/ESR with `xpinstall.signatures.required=false` (not for end users).

## Build store packages

```bash
cd C:\Users\trent\cats-and-rats
npm run pack
```

Outputs:

| File | Use |
|------|-----|
| `dist/cats-and-rats-chrome.zip` | Chrome Web Store upload |
| `dist/cats-and-rats-firefox.zip` | Firefox AMO upload (or rename to `.xpi` for self-host) |

## Publish checklist

### Chrome Web Store

1. [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) ($5 one-time)
2. New item → upload `dist/cats-and-rats-chrome.zip`
3. Store listing: screenshots, description, category (Productivity)
4. Privacy: single purpose, host permissions justification (`http(s)://*/*` for page image URLs)
5. Submit for review

### Firefox AMO

1. [AMO Developer Hub](https://addons.mozilla.org/developers/)
2. Submit new add-on → upload `dist/cats-and-rats-firefox.zip`
3. Set gecko id in `src/manifest.json` → `browser_specific_settings.gecko.id`  
   **Change to your real email-style id before listed publish** (currently configured as `trent@trents.tech`).
4. Source code is this repo (AMO may request it for listed)
5. Submit

### Change the public extension id (Firefox)

Edit `src/manifest.json`:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "trent@trents.tech",
    "strict_min_version": "121.0"
  }
}
```

## Layout

```
cats-and-rats/
  src/                 ← load this folder / zip this
    manifest.json
    background.js
    popup.html
    popup.css
    popup.js
    scrape.js
    icons/
  scripts/             ← pack helpers
  dist/                ← built zips
  LICENSE
  README.md
  store/               ← listing copy (optional)
```

## Features (v1.0.4)

- Scan active tab for `<img>`, srcset, CSS backgrounds, og:image
- Grid UI, select / select-all, min size filter
- Sort: page order / largest / smallest / file name
- View density: 1 / 2 / 3 columns
- Light / dark theme — follows system, manual toggle in header
- All preferences persisted via `chrome.storage`
- Download via `chrome.downloads` into `CatsAndRats/`
- Cream / rust brand, full-height sidebar-friendly layout
- Toolbar popup always set (no dead button)

## Next

- ZIP multi-download  
- Right-click context menu  
