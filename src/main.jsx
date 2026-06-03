import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Line, LineChart } from 'recharts'

// The eager LineChart pulls recharts + es-toolkit's shared compat internals
// (identity / iteratee / …) into the ENTRY chunk. The lazy RadarChart below pulls
// maxBy / minBy into a SEPARATE chunk, which then references those entry-chunk
// bindings cross-chunk — the circular-chunk uninitialized-binding condition.
const RadarDemo = lazy(() => import('./Chart.jsx'))

const lineData = [
  { x: 1, y: 2 },
  { x: 2, y: 5 },
  { x: 3, y: 3 },
]

function App() {
  return (
    <>
      <LineChart width={300} height={150} data={lineData}>
        <Line dataKey="y" />
      </LineChart>
      <Suspense fallback={<p>loading…</p>}>
        <RadarDemo />
      </Suspense>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
