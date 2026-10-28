// Renders the music-box preview loops played while a real recording doesn't
// exist yet: one 4-bar loop per mood, one chord per lyric line (3.2 s), the same
// progressions as the web app's Web Audio music box. Output: assets/audio/<mood>.wav
// Run: node scripts/make-music-box.mjs

import fs from 'node:fs'

const RATE = 22050
const SECONDS_PER_LINE = 3.2
const PROGRESSIONS = {
  tender: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
  joyful: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
  playful: [[50, 53, 57], [55, 59, 62], [48, 52, 55], [57, 60, 64]],
  nostalgic: [[53, 57, 60], [48, 52, 55], [57, 60, 64], [55, 59, 62]],
  reflective: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [48, 52, 55]],
}

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12)
const triangle = (phase) => 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25))

function render(prog) {
  const total = Math.round(prog.length * SECONDS_PER_LINE * RATE)
  const buf = new Float32Array(total)
  const note = (midi, start, len, vol) => {
    const f = hz(midi)
    const s0 = Math.round(start * RATE)
    const n = Math.round(len * RATE)
    for (let i = 0; i < n; i++) {
      const t = i / RATE
      const env = Math.min(1, t / 0.02) * Math.exp(-4.5 * t / len)
      buf[(s0 + i) % total] += triangle(f * t) * env * vol // wraps so the loop is seamless
    }
  }
  const step = SECONDS_PER_LINE / 8
  prog.forEach((chord, bar) => {
    const t0 = bar * SECONDS_PER_LINE
    note(chord[0] - 12, t0, SECONDS_PER_LINE, 0.35)
    ;[0, 1, 2, 1, 12, 2, 1, 2].forEach((p, i) => {
      const midi = p >= 12 ? chord[p - 12] + 24 : chord[p] + 12
      note(midi, t0 + i * step, step * 2.5, 0.28)
    })
  })
  let peak = 0
  for (const v of buf) peak = Math.max(peak, Math.abs(v))
  return buf.map((v) => (v / peak) * 0.8)
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((v, i) => data.writeInt16LE(Math.round(v * 32767), i * 2))
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

fs.mkdirSync('assets/audio', { recursive: true })
for (const [mood, prog] of Object.entries(PROGRESSIONS)) {
  fs.writeFileSync(`assets/audio/${mood}.wav`, wav(render(prog)))
  console.log(`assets/audio/${mood}.wav`)
}
