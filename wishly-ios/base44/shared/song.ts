// Making one song: lyrics, singing, and checking the name was heard. Used by the
// makeSong function and by scripts/song-tests (which runs it on a Mac with the
// same keys, without using Base44). Keep it free of Base44 calls.

import { listen, sing, suggestSpellings, vocalStart, writeLyrics } from './ai.ts'
import { hasWish, honourees, isTricky, plainName, singable, testedSpelling, wishLine } from './names.ts'

export const MAX_TRIES = 3
const LISTENS = 3
// The singing must start within this many seconds; a longer music-only
// opening is sung again (15 Nov 2026: some songs waited 23 seconds).
export const MAX_LEAD_IN = 8

export type Keys = { gemini: string }
// deno-lint-ignore no-explicit-any
export type Order = any
export type Try = { spelling: string; sung?: string[]; heard: number; startsAt?: number | null; audio?: Uint8Array<ArrayBuffer>; refused?: boolean; lines?: string[] }

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
export const MAX_WORDS = 100
// One name is sung at least four times; a couple's names at least three times each.
const NEEDED = (names: string[]) => (names.length > 1 ? 3 : 4)
// deno-lint-ignore no-explicit-any
const lines = (song: any): string[] => (song?.sections || []).flatMap((s: { lines: string[] }) => s.lines)
// deno-lint-ignore no-explicit-any
const wished = (song: any, occasion: string, names: string[]) => hasWish(lines(song), occasion, names)
// A milestone's note ("Promotion to Head of Design") counts as sung when a
// main word of it is in the lyrics. Words match on their first five letters,
// so "promotion" and "promoted", or "graduation" and "graduate", both count.
const SMALL = new Set(['their', 'there', 'about', 'after', 'being', 'from', 'into', 'with', 'this', 'that', 'your', 'have', 'just', 'finally', 'first', 'new'])
const main = (text: string) =>
  text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !SMALL.has(w)).map((w) => w.slice(0, 5))
// deno-lint-ignore no-explicit-any
const celebrated = (song: any, note: string) => {
  const wanted = main(note)
  if (!wanted.length) return true
  const sung = new Set(main(lines(song).join(' ')))
  return wanted.some((w) => sung.has(w))
}
// deno-lint-ignore no-explicit-any
const fits = (song: any, names: string[], occasion = '', note = '') =>
  names.every((n) => nameCount(song, n) >= NEEDED(names)) && words(song) <= MAX_WORDS && wished(song, occasion, names) && celebrated(song, note)
// Fitting beats not; then the wish; then the milestone; then more names; then fewer words.
// deno-lint-ignore no-explicit-any
const score = (song: any, names: string[], occasion = '', note = '') =>
  (fits(song, names, occasion, note) ? 1000 : 0) + (wished(song, occasion, names) ? 500 : 0) + (celebrated(song, note) ? 300 : 0) +
  names.reduce((t, n) => t + Math.min(nameCount(song, n), NEEDED(names)) * 100, 0) - words(song)

// Last guardrail: lyrics that still don't wish them end on the wish
// ("Happy birthday, Rebel") as the outro line.
// deno-lint-ignore no-explicit-any
function withWish(song: any, occasion: string, names: string[]) {
  const wish = wishLine(occasion, names.join(' and '))
  if (!wish || wished(song, occasion, names)) return song
  const sections = [...(song.sections || [])]
  const outro = sections.findIndex((s: { label: string }) => /^outro/i.test(s.label))
  if (outro >= 0) sections[outro] = { ...sections[outro], lines: [wish] }
  else sections.push({ label: 'Outro', lines: [wish] })
  return { ...song, sections }
}

// Writes the lyrics (if asked), then sings and checks up to three takes.
// `order.song` is updated in place with the new lyrics. For an anniversary
// with two names, every name must be heard in the same listen.
export async function makeTakes(order: Order, keys: Keys, lyrics: { prompt: string; schema: object } | null) {
  const people = honourees(order.recipient)
  const names = people.map((p) => p.name)
  if (lyrics) {
    try {
      // The names have to be heard, and the song has to end by about 1:10,
      // so lyrics with too few names or over 100 words are written once more
      // (Gemini sometimes stops at three names, or runs long).
      const occasion = order.occasion || ''
      // What a milestone celebrates, if the buyer said ("Promotion").
      const note = occasion === 'Milestone' ? (order.occasion_note || '').trim() : ''
      let written = await writeLyrics(lyrics.prompt, lyrics.schema, names, keys.gemini)
      if (!fits(written, names, occasion, note)) {
        const again = await writeLyrics(lyrics.prompt, lyrics.schema, names, keys.gemini).catch(() => null)
        if (again?.sections?.length && score(again, names, occasion, note) > score(written, names, occasion, note)) written = again
      }
      if (written?.sections?.length) order.song = { ...order.song, ...withWish(written, occasion, names) }
    } catch (error) {
      console.error('Writing lyrics failed, singing the template', order.id, error)
    }
  }
  // Spellings to try for each name, best first.
  const lists = await Promise.all(people.map((p) => plan(p.name, p.pronunciation, keys.gemini).then((r) => r.spellings)))
  const heardIn = (text: string) => names.every((n, k) => nameHeard(text, n, lists[k]))

  // Each try is sung and listened to. Lyria refuses some names outright: famous
  // singers' first names (Taylor, Selena, Ariana, Adele) and a few sounds-like
  // spellings. A refusal comes back at once and costs nothing, so it doesn't use
  // up a try; a same-sounding spelling (Tayler, Selina) usually gets through.
  // Try i sings each name's i-th spelling (or its last one, if it has fewer).
  const tries: Try[] = []
  const asked = names.map((n) => isTricky(n))
  const longest = () => Math.max(...lists.map((l) => l.length))
  for (let i = 0; i < longest(); i++) {
    const sung = lists.map((l) => l[Math.min(i, l.length - 1)])
    const spelling = sung.join(' & ')
    if (tries.filter((t) => !t.refused).length >= MAX_TRIES) break
    let audio: Uint8Array<ArrayBuffer>
    try {
      audio = await sing(songPrompt(order, sung), keys.gemini)
    } catch (error) {
      if (!/no audio/i.test(String((error as Error).message))) throw error
      console.error('Lyria refused', order.id, spelling, (error as Error).message)
      tries.push({ spelling, sung, heard: 0, refused: true })
      // Everything planned was refused: ask for spellings that sound the same.
      if (i === longest() - 1) {
        for (let k = 0; k < names.length; k++) {
          if (asked[k]) continue
          asked[k] = true
          try {
            const s = await suggestSpellings(names[k], keys.gemini)
            for (const alt of s.spellings.map(singable)) if (!lists[k].some((x) => x.toLowerCase() === alt.toLowerCase())) lists[k].push(alt)
          } catch (e) {
            console.error('suggestSpellings failed', names[k], e)
          }
        }
      }
      continue
    }
    const [startsAt, ...texts] = await Promise.all([vocalStart(audio, keys.gemini), ...Array.from({ length: LISTENS }, () => listen(audio, keys.gemini))]) as [number | null, ...string[]]
    const heard = texts.filter(heardIn).length
    tries.push({ spelling, sung, heard, startsAt, audio, lines: texts.map((t) => (t.match(/[^.!?\n]*birthday[^.!?\n]*/i) || [''])[0].trim()) })
    if (heard >= 2 && !late(startsAt)) break
    // The names were right but the music ran on too long before the
    // singing: sing the same spellings again.
    if (heard >= 2) i--
  }

  const done = tries.filter((t) => t.audio)
  if (!done.length) throw new Error(`Lyria refused every spelling: ${tries.map((t) => t.spelling).join(', ')}`)
  // Names heard first, then an opening that gets to the singing quickly.
  const rank = (t: Try) => (t.heard >= 2 ? 100 : 0) + (late(t.startsAt) ? 0 : 50) + t.heard * 10 - (t.startsAt ?? 0) / 10
  const best = done.reduce((a, b) => (rank(b) > rank(a) ? b : a))
  return { tries, best, passed: best.heard >= 2 }
}

const late = (startsAt?: number | null) => typeof startsAt === 'number' && startsAt > MAX_LEAD_IN

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

// The lyrics keep the real names; the singer gets the sounds-like spellings
// (one per name, in honourees() order).
// The singing starts straight away (no instrumental intro) and the song closes
// with a melodic fade and an explicit end, so it resolves cleanly at around 65–70 seconds
// (the same tags as lyricsText in lyricGenerator.ts). Always
// sung in English.
export function songPrompt(order: Order, spelling: string | string[]) {
  const people = honourees(order.recipient)
  const spellings = Array.isArray(spelling) ? spelling : [spelling]
  const swap = (line: string) =>
    people.reduce((l, p, k) => l.replace(new RegExp(`\\b${escape(p.name)}\\b`, 'gi'), spellings[k] ?? p.name), line)
  const sung = order.song.sections
    .map((s: { label: string; lines: string[] }) => `[${s.label === 'Outro' ? 'Outro - Melodic fade' : s.label}]\n${s.lines.map(swap).join('\n')}`)
    .join('\n\n')
  // No intro tag: an [Intro] let Lyria play 7 to 23 seconds of music before
  // anyone sang (15 Nov 2026). The singing starts with the first verse.
  const lyrics = `${sung}\n\n[Fade Out]\n[End]`
  const { mood, genre, voice } = order.music || {}
  const occasion = (order.occasion || 'celebration').toLowerCase()
  // A plain style line, then the lyrics. Wording like "a song for Birthday, a
  // personal gift" made Lyria refuse whole songs, even for Emily (30 Oct 2026).
  // Orders since 6 Nov 2026 carry sound tags (soundMapper.ts).
  const tags: string | undefined = order.song.style_tags
  const ending = 'sung in English (en), about 65 to 70 seconds long, vocals start right away in the first 2 seconds with no instrumental intro, clean resolved ending.'
  let style: string
  if (tags) style = `${tags}, ${occasion} song, ${ending}`
  else {
    const sound = [mood, genre].filter(Boolean).join(' ').toLowerCase() || 'warm acoustic pop'
    const singer = voice && voice !== 'No preference' ? `, clear ${voice.toLowerCase().replace('vocal', 'lead vocal')}` : ''
    style = `${sound} ${occasion} song${singer}, ${ending}`
  }
  return `${style[0].toUpperCase()}${style.slice(1)}\n\nLyrics:\n${lyrics}`
}
