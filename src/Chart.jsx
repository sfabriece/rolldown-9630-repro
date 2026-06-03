import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts'

// RadarChart is the consumer that pulls es-toolkit's compat maxBy/minBy (the CJS
// modules that throw). Any other chart type (bar/line) does not hit this path.
const data = [
  { subject: 'A', value: 120 },
  { subject: 'B', value: 98 },
  { subject: 'C', value: 86 },
  { subject: 'D', value: 99 },
]

export default function Chart() {
  return (
    <RadarChart width={400} height={300} data={data}>
      <PolarGrid />
      <PolarAngleAxis dataKey="subject" />
      <Radar dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
    </RadarChart>
  )
}
