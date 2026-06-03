import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Repro for rolldown#9630. A lazy-loaded RadarChart pulls recharts -> es-toolkit's
// CJS `compat/*` helpers; in the production build Rolldown splits them across chunks
// and a binding is read before its chunk initializes -> "n is not a function".
//
// Uncomment the block below to apply the workaround (co-locate the charts vendor
// stack in one chunk) and confirm the crash disappears.
export default defineConfig({
  plugins: [react()],
  // Workaround — uncomment to co-locate the charts vendor stack in one chunk so the
  // es-toolkit CJS modules never split across the chunk boundary. The crash disappears.
  // build: {
  //   rollupOptions: {
  //     output: {
  //       manualChunks(id) {
  //         if (id.includes('/recharts/') || id.includes('/es-toolkit/')) return 'charts'
  //       },
  //     },
  //   },
  // },
})
