// Deterministic sender-name colors in the Internal Tech Emails style.
// The first participant in a thread gets blue, the second red, then the rest
// of the palette — matching the iconic two-tone look for most threads.

export const PALETTE = [
  '#1a0dab', // blue
  '#e03c31', // red
  '#188038', // green
  '#7b1fa2', // purple
  '#e37400', // orange
  '#0b7285', // teal
]

export function colorMap(addresses: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  let i = 0
  for (const a of addresses) {
    const key = a.toLowerCase()
    if (!(key in map)) {
      map[key] = PALETTE[i % PALETTE.length]
      i++
    }
  }
  return map
}
