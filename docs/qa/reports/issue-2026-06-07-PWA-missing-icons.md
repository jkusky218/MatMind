---
title: "[Bug] PWA icons missing — install fails with blank icon on all platforms"
labels: ["bug"]
---

## Summary

`public/icon-192.png` and `public/icon-512.png` do not exist. The PWA manifest (in `vite.config.js`) references both. PWA installation will fail or display a blank icon on Chrome/Android and iOS.

- **Checklist ID (if any):** PWA-01, PWA-08
- **Severity:** 🟧 High
- **Build / commit:** 6177b63
- **Environment:** Any deployed build
- **Role:** Any
- **Device / browser:** Chrome/Android (install prompt), iOS Safari (Add to Home Screen)

## Steps to reproduce

1. Deploy the app
2. On Chrome/Android: tap "Add to Home Screen"
3. Observe install prompt shows blank/broken icon
4. On iOS: tap Share → Add to Home Screen
5. Observe blank icon on home screen

## Expected

MatMind icon (192×192 and 512×512 PNG) appears during install and on home screen.

## Actual

Only `public/favicon.svg` exists. Both PNG icon references return 404.

## Evidence

`vite.config.js` PWA manifest icons block:
```js
icons: [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },   // ← 404
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },   // ← 404
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
],
```

`ls public/` output: `favicon.svg` (only)

## Tenant-safety check

- [x] This bug does **not** expose another team's data.

## Suspected area

`public/` directory. Icons need to be generated and committed.

## Notes

Use `vite-plugin-pwa`'s `pwa-assets-generator` or any icon generator tool with the Lovett Lions logo as source. Generate 192×192 and 512×512 PNGs. The maskable icon should have safe-zone padding (~10% inset).
