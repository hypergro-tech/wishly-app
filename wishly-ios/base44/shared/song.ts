// Making one song: lyrics, singing, and checking the name was heard. Used by the
// makeSong function and by scripts/song-tests (which runs it on a Mac with the
// same keys, without using Base44). Keep it free of Base44 calls.

import { listen, sing, suggestSpellings, writeLyrics } from './ai.ts'
import { isTricky, plainName, singable, testedSpelling } from './names.ts'

export const MAX_TRIES = 3
const LISTENS = 3

export type Keys = { gemini: string; openai: string }
// deno-lint-ignore no-explicit-any
export type Order = any
export type Try = { spelling: string; heard: number; audio?: Uint8Array<ArrayBuffer>; refused?: boolean; lines?: string[] }

// Lowercase letters and spaces only: "O'Sheen!" -> "osheen".
const spoken = (s: string) => plainName(s).replace(/['’-]/g, '').replace(/[^a-z]+/g, ' ').trim()

// Spellings of the same sound made equal, so "Kiva" heard matches Keeva sung.
const sound = (s: string) => s.replace(/ee|ea|ie|y/g, 'i').replace(/oo/g, 'u').replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/(.)\1+/g, '$1')

// Within a letter or two (one per four letters; none under four), so a
// near-miss in how the transcriber spells a sung name still counts, but Ava
// doesn't pass for Alvah, or "tag" for Tig.
function near(a: string, b: string) {
  if (!a || !b) return false
  const allowed = Math.floor(b.length / 4)
  if (Math.abs(a.length - b.length) > allowed) return false
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = row
  }
  return prev[b.length] <= allowed
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Writes the lyrics (if asked), then sings and checks up to three takes.
// `order.song` is updated in place with the new lyrics.
export async function makeTakes(order: Order, keys: Keys, lyrics: { prompt: string; schema: object } | null) {
  if (lyrics) {
    try {
      const written = await writeLyrics(lyrics.prompt, lyrics.schema, order.recipient.name.trim(), keys.gemini)
      if (written?.sections?.length) order.song = { ...order.song, ...written }
    } catch (error) {
      console.error('Writing lyrics failed, singing the template', order.id, error)
    }
  }
  const name: string = order.recipient.name.trim()
  const { spellings } = await plan(name, order.recipient.pronunciation, keys.gemini)

  // Counts as heard: the transcriber wrote the real name, or something within a
  // letter or two of it or of a spelling we sang ("Oshin" for Osheen, "Kiva" for
  // Keeva). Not Gemini's list of how a listener might write it: that included
  // wrong names like Alba and Ocean, so wrong songs passed. Spaces don't count,
  // so "Mary-Kate" heard matches Mary Kate sung, and "Anne Marie" matches Annmarie.
  const heardIn = (text: string) => {
    const targets = [name, ...spellings].map((s) => sound(spoken(s).replace(/ /g, '')))
    const words = spoken(text).split(' ')
    return targets.some((target) => words.some((_, i) => [1, 2, 3].some((size) => near(sound(words.slice(i, i + size).join('')), target))))
  }

  // Each try is sung and listened to. Lyria refuses some names outright: famous
  // singers' first names (Taylor, Selena, Ariana, Adele) and a few sounds-like
  // spellings. A refusal comes back at once and costs nothing, so it doesn't use
  // up a try; a same-sounding spelling (Tayler, Selina) usually gets through.
  const tries: Try[] = []
  let askedGemini = isTricky(name)
  for (let i = 0; i < spellings.length; i++) {
    const spelling = spellings[i]
    if (tries.filter((t) => !t.refused).length >= MAX_TRIES) break
    let audio: Uint8Array<ArrayBuffer>
    try {
      audio = await sing(songPrompt(order, spelling), keys.gemini)
    } catch (error) {
      if (!/no audio/i.test(String((error as Error).message))) throw error
      console.error('Lyria refused', order.id, spelling, (error as Error).message)
      tries.push({ spelling, heard: 0, refused: true })
      // Everything planned was refused: ask for spellings that sound the same.
      if (i === spellings.length - 1 && !askedGemini) {
        askedGemini = true
        try {
          const s = await suggestSpellings(name, keys.gemini)
          for (const alt of s.spellings.map(singable)) if (!spellings.some((x) => x.toLowerCase() === alt.toLowerCase())) spellings.push(alt)
        } catch (e) {
          console.error('suggestSpellings failed', name, e)
        }
      }
      continue
    }
    const texts = await Promise.all(Array.from({ length: LISTENS }, () => listen(audio, keys.openai)))
    const heard = texts.filter(heardIn).length
    tries.push({ spelling, heard, audio, lines: texts.map((t) => (t.match(/[^.!?\n]*birthday[^.!?\n]*/i) || [''])[0].trim()) })
    if (heard >= 2) break
  }

  const sung = tries.filter((t) => t.audio)
  if (!sung.length) throw new Error(`Lyria refused every spelling: ${tries.map((t) => t.spelling).join(', ')}`)
  const best = sung.reduce((a, b) => (b.heard > a.heard ? b : a))
  return { tries, best, passed: best.heard >= 2 }
}

// Spellings to try, best first.
async function plan(name: string, chosen: string | undefined, geminiKey: string) {
  const spellings: string[] = []
  if (chosen?.trim()) spellings.push(singable(chosen))
  if (isTricky(name)) {
    const tested = testedSpelling(name)
    if (tested) spellings.push(tested)
    try {
      const s = await suggestSpellings(name, geminiKey)
      spellings.push(...s.spellings.map(singable))
    } catch (error) {
      console.error('suggestSpellings failed', name, error)
    }
  }
  const seen = new Set<string>()
  const unique = spellings.filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
  // Extra spellings stand by in case Lyria refuses some. A tricky name as
  // written usually comes out wrong, so it goes last: only if Lyria refuses
  // every sounds-like spelling (it blocks some that sound like a famous name,
  // such as Neave / Neve). A person then checks that take before the buyer.
  const tried = unique.slice(0, MAX_TRIES + 3)
  const written = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  if (!tried.some((s) => s.toLowerCase() === written.toLowerCase())) tried.push(written)
  return { spellings: tried }
}

// The lyrics keep the real name; the singer gets the sounds-like spelling.
export function songPrompt(order: Order, spelling: string) {
  const name = new RegExp(`\\b${escape(order.recipient.name.trim())}\\b`, 'gi')
  const lyrics = order.song.sections
    .map((s: { label: string; lines: string[] }) => `[${s.label}]\n${s.lines.map((l) => l.replace(name, spelling)).join('\n')}`)
    .join('\n\n')
  const { mood, genre, voice, language } = order.music || {}
  const sound = [mood, genre].filter(Boolean).join(' ').toLowerCase() || 'warm acoustic pop'
  const singer = voice && voice !== 'No preference' ? `, clear ${voice.toLowerCase().replace('vocal', 'lead vocal')}` : ''
  const occasion = (order.occasion || 'celebration').toLowerCase()
  // A plain style line, then the lyrics. Wording like "a song for Birthday, a
  // personal gift" made Lyria refuse whole songs, even for Emily (30 Oct 2026).
  const style = `${sound} ${occasion} song${singer}, ${language || 'English'}, about 1 minute.`
  return `${style[0].toUpperCase()}${style.slice(1)}\n\nLyrics:\n${lyrics}`
}
