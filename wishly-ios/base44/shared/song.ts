// Making one song: lyrics, singing, and checking the name was heard. Used by the
// makeSong function and by scripts/song-tests (which runs it on a Mac with the
// same keys, without using Base44). Keep it free of Base44 calls.

import { listen, sing, suggestSpellings, writeLyrics } from './ai.ts'
import { isTricky, plainName, singable, testedSpelling } from './names.ts'

export const MAX_TRIES = 3
const LISTENS = 3

export type Keys = { gemini: string }
// deno-lint-ignore no-explicit-any
export type Order = any
export type Try = { spelling: string; heard: number; audio?: Uint8Array<ArrayBuffer>; refused?: boolean; lines?: string[] }

// Lowercase letters and spaces only: "O'Sheen!" -> "osheen".
const spoken = (s: string) => plainName(s).replace(/['’-]/g, '').replace(/[^a-z]+/g, ' ').trim()

// Spellings of the same sound made equal, so "Kiva" heard matches Keeva sung,
// "Shavonne" matches Shivawn and "Efa" matches Eefa. Gemini writes what it hears
// as an everyday name spelling, so these come up often. A final "ei" is "ay",
// so "May" heard matches Mei sung (6 Nov 2026).
const sound = (s: string) => s.replace(/^e(?=[^aeiouy])/, 'i').replace(/ee|ea|ie|y/g, 'i').replace(/oo/g, 'u').replace(/aw|au/g, 'o')
  .replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/(.)\1+/g, '$1').replace(/([^aeiou])e$/, '$1').replace(/ei$/, 'ai')

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

// Counts as heard: the transcriber wrote the real name, or something within a
// letter or two of it or of a spelling we sang ("Oshin" for Osheen, "Kiva" for
// Keeva). Not Gemini's list of how a listener might write it: that included
// wrong names like Alba and Ocean, so wrong songs passed. Spaces don't count,
// so "Mary-Kate" heard matches Mary Kate sung, and "Anne Marie" matches Annmarie.
export function nameHeard(text: string, name: string, spellings: string[]) {
  const targets = [name, ...spellings].map((s) => sound(spoken(s).replace(/ /g, '')))
  const words = spoken(text).split(' ')
  return targets.some((target) => words.some((_, i) => [1, 2, 3].some((size) => near(sound(words.slice(i, i + size).join('')), target))))
}

// deno-lint-ignore no-explicit-any
const nameCount = (song: any, name: string) =>
  (song?.sections || []).flatMap((s: { lines: string[] }) => s.lines).join('\n').split(new RegExp(`\\b${escape(name)}\\b`, 'i')).length - 1

// deno-lint-ignore no-explicit-any
const words = (song: any) => (song?.sections || []).flatMap((s: { lines: string[] }) => s.lines).join(' ').split(/\s+/).filter(Boolean).length
export const MAX_WORDS = 90
// deno-lint-ignore no-explicit-any
const fits = (song: any, name: string) => nameCount(song, name) >= 4 && words(song) <= MAX_WORDS
// Fitting beats not; then more names; then fewer words.
// deno-lint-ignore no-explicit-any
const score = (song: any, name: string) => (fits(song, name) ? 1000 : 0) + Math.min(nameCount(song, name), 4) * 100 - words(song)

// Writes the lyrics (if asked), then sings and checks up to three takes.
// `order.song` is updated in place with the new lyrics.
export async function makeTakes(order: Order, keys: Keys, lyrics: { prompt: string; schema: object } | null) {
  if (lyrics) {
    const n = order.recipient.name.trim()
    try {
      // The name has to be heard, and the song has to end by about a minute,
      // so lyrics with the name fewer than four times or over 90 words are
      // written once more (Gemini sometimes stops at three names, or runs long).
      let written = await writeLyrics(lyrics.prompt, lyrics.schema, n, keys.gemini)
      if (!fits(written, n)) {
        const again = await writeLyrics(lyrics.prompt, lyrics.schema, n, keys.gemini).catch(() => null)
        if (again?.sections?.length && score(again, n) > score(written, n)) written = again
      }
      if (written?.sections?.length) order.song = { ...order.song, ...written }
    } catch (error) {
      console.error('Writing lyrics failed, singing the template', order.id, error)
    }
  }
  const name: string = order.recipient.name.trim()
  const { spellings } = await plan(name, order.recipient.pronunciation, keys.gemini)

  const heardIn = (text: string) => nameHeard(text, name, spellings)

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
    const texts = await Promise.all(Array.from({ length: LISTENS }, () => listen(audio, keys.gemini)))
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
// The song opens on a short instrumental intro and closes with a melodic
// fade and an explicit end, so it resolves cleanly at around 50–60 seconds
// (the same tags as lyricsText in src/services/lyricGenerator.ts). Always
// sung in English.
export function songPrompt(order: Order, spelling: string) {
  const name = new RegExp(`\\b${escape(order.recipient.name.trim())}\\b`, 'gi')
  const sung = order.song.sections
    .map((s: { label: string; lines: string[] }) => `[${s.label === 'Outro' ? 'Outro - Melodic fade' : s.label}]\n${s.lines.map((l) => l.replace(name, spelling)).join('\n')}`)
    .join('\n\n')
  const lyrics = `[Short Intro]\n\n${sung}\n\n[Fade Out]\n[End]`
  const { mood, genre, voice } = order.music || {}
  const occasion = (order.occasion || 'celebration').toLowerCase()
  // A plain style line, then the lyrics. Wording like "a song for Birthday, a
  // personal gift" made Lyria refuse whole songs, even for Emily (30 Oct 2026).
  // Orders since 6 Nov 2026 carry sound tags (src/services/soundMapper.ts).
  const tags: string | undefined = order.song.style_tags
  const ending = 'sung in English (en), 50 to 60 seconds, short intro, clean resolved ending.'
  let style: string
  if (tags) style = `${tags}, ${occasion} song, ${ending}`
  else {
    const sound = [mood, genre].filter(Boolean).join(' ').toLowerCase() || 'warm acoustic pop'
    const singer = voice && voice !== 'No preference' ? `, clear ${voice.toLowerCase().replace('vocal', 'lead vocal')}` : ''
    style = `${sound} ${occasion} song${singer}, ${ending}`
  }
  return `${style[0].toUpperCase()}${style.slice(1)}\n\nLyrics:\n${lyrics}`
}
