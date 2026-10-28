// A small Web Audio music box that stands in for the recorded song, so the
// listening experience can be tried before real audio is generated.

const PROGRESSIONS = {
  tender: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
  joyful: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
  playful: [[50, 53, 57], [55, 59, 62], [48, 52, 55], [57, 60, 64]],
  nostalgic: [[53, 57, 60], [48, 52, 55], [57, 60, 64], [55, 59, 62]],
  reflective: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [48, 52, 55]],
}

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12)

export function createMusicBox(mood = 'tender', secondsPerLine = 3.2) {
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  const out = ctx.createGain()
  out.gain.value = 0.18
  out.connect(ctx.destination)
  const prog = PROGRESSIONS[mood] || PROGRESSIONS.tender
  let timer = null
  let bar = 0

  function note(midi, at, len, vol = 1) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o.frequency.value = hz(midi)
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(0.5 * vol, at + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, at + len)
    o.connect(g).connect(out)
    o.start(at)
    o.stop(at + len + 0.05)
  }

  // One chord per lyric line, arpeggiated in eighths.
  function scheduleBar() {
    const chord = prog[bar % prog.length]
    const t0 = ctx.currentTime + 0.05
    const step = secondsPerLine / 8
    note(chord[0] - 12, t0, secondsPerLine, 0.7)
    const pattern = [0, 1, 2, 1, 0 + 12, 2, 1, 2]
    pattern.forEach((p, i) => {
      const midi = p >= 12 ? chord[p - 12] + 12 : chord[p] + 12
      note(midi, t0 + i * step, step * 2.5, 0.55)
    })
    bar++
  }

  return {
    start() {
      ctx.resume()
      scheduleBar()
      timer = setInterval(scheduleBar, secondsPerLine * 1000)
    },
    stop() {
      clearInterval(timer)
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.1)
      setTimeout(() => ctx.close(), 400)
    },
  }
}
