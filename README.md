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
reproduce (no cross-chunk split).

## Not a regression

Bisected with natural `vite ⇄ rolldown` pairs (same repro structure) — it reproduces
on every stable Vite 8 / Rolldown 1.0.x back to the first stable release:

| vite | rolldown | result |
|---|---|---|
| 8.0.16 | 1.0.3 | crash — cross-chunk `r is not a function` |
| 8.0.14 | 1.0.2 | crash — byte-identical output to 1.0.3 |
| 8.0.0 | 1.0.0-rc.9 | crash — `t is not a function`, **within** the entry chunk |

The manifestation shifts (within-chunk `t` on rc.9/1.0.0, cross-chunk `r` on 1.0.2+),
but the es-toolkit CJS mis-handling is present throughout. Pre-stable betas couldn't be
tested: `@vitejs/plugin-react@6` peer-conflicts with vite betas. This repro pins
rolldown 1.0.3 via `overrides`; bump that (≥1.0.2) or pin an older `vite` to test others.

## Workarounds (both confirmed to fix it here)

1. `output.strictExecutionOrder: true` — enforces chunk execution order.
2. A `manualChunks` group co-locating recharts + es-toolkit in one chunk (commented
   in `vite.config.js` — uncomment and rebuild; the crash disappears and a
   `charts-*.js` chunk is emitted).
