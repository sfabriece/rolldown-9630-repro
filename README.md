# rolldown#9630 — automatic code splitting produces a circular CJS chunk → `is not a function`

Minimal reproduction for https://github.com/rolldown/rolldown/issues/9630.

In a **production build only** (dev + `vite` work fine), a lazy-loaded Recharts
`RadarChart` crashes at runtime with `TypeError: r is not a function`. The error
looks like a minified variable collision, but the real cause is a **circular chunk
import where a CommonJS binding is read before its defining chunk has initialized**.

## Stack

- `vite@8.0.14` (bundler: `rolldown`, pinned to **1.0.3** via `overrides`)
- `recharts@3.8.1` → `es-toolkit@1.47.0`
- `@vitejs/plugin-react@6`
- No `codeSplitting.groups` / no custom chunking — plain Vite automatic splitting.

## Reproduce

```bash
npm install
npm run build
npm run preview   # http://localhost:4173
```

Open the page. The console shows:

```
TypeError: r is not a function
    at assets/Chart-*.js          # the lazy chunk — es-toolkit compat maxBy
    at assets/index-*.js          # the entry chunk — shared es-toolkit internals
    at assets/Chart-*.js
    at assets/index-*.js
    ...
```

The call stack bouncing between the **lazy chunk** and the **entry chunk** is the
tell: `maxBy` (lazy chunk) reads an es-toolkit binding (`identity`/`iteratee`) that
lives in the entry chunk and is still uninitialized when the lazy chunk evaluates.

## What sets it up

- `src/Chart.jsx` renders `<RadarChart>`, whose only-here use of es-toolkit's
  `compat/maxBy` + `compat/minBy` lands those CJS modules in the **lazy** chunk.
- `src/main.jsx` eagerly renders a `<LineChart>` in the shell, pulling the **shared**
  es-toolkit internals (`identity`, `iteratee`, …) into the **entry** chunk.
- Result: `maxBy` (lazy) → `identity`/`iteratee` (entry) across a chunk boundary,
  with an init order that reads the binding before it exists.

A single lazy chunk that contains *all* of recharts + es-toolkit does **not**
reproduce (no cross-chunk split). Pinning rolldown to **1.0.2** instead of 1.0.3 is
worth checking on your side — this repro pins 1.0.3, which is where we hit it.

## Workarounds (both confirmed to fix it here)

1. `output.strictExecutionOrder: true` — enforces chunk execution order.
2. A `manualChunks` group co-locating recharts + es-toolkit in one chunk (commented
   in `vite.config.js` — uncomment and rebuild; the crash disappears and a
   `charts-*.js` chunk is emitted).
