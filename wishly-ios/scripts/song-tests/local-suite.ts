// Runs makeSong's own song-making code (base44/shared/song.ts) on this Mac with
// the keys in ~/Downloads/.env, so fixes can be tested without Base44 (no
// orders, no uploads, no Base44 credits). Each song is then heard three more
// times, independently, like run-suite.mjs.
//
//   deno run -A scripts/song-tests/local-suite.ts [out dir] [case ids...]

import { buildSongPrompt, SONG_SCHEMA, writeSong } from '../../src/lib/songwriter.ts'
import { listen } from '../../base44/shared/ai.ts'
import { makeTakes } from '../../base44/shared/song.ts'
import { CASES } from './cases.mjs'

const HOME = Deno.env.get('HOME')!
const OUT = Deno.args[0] || `${HOME}/Downloads/Claude working files/wishly-song-tests/suite-local`
const ONLY = Deno.args.slice(1)
const PARALLEL = 5
await Deno.mkdir(`${OUT}/songs`, { recursive: true })

const env = Object.fromEntries((await Deno.readTextFile(`${HOME}/Downloads/.env`)).split('\n')
  .filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const keys = { gemini: env.GEMINI_API_KEY, openai: env.OPEN_AI_TOKEN }
const plain = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

// deno-lint-ignore no-explicit-any
async function runCase(c: any) {
  const started = Date.now()
  const order = {
    id: `local-${c.id}`,
    recipient: { name: c.name, pronunciation: c.sounds_like || '', pronouns: c.who === 'man' ? 'he/him' : 'she/her', relationship: 'Partner' },
    occasion: 'Birthday',
    memories: { memory: 'Sunday pancakes on the porch, and the first one always burns' },
    music: { mood: 'Joyful', genre: 'Acoustic', voice: c.who === 'man' ? 'Female vocal' : 'Male vocal', language: 'English' },
    buyer: { name: 'Sam' },
  }
  // deno-lint-ignore no-explicit-any
  const result: any = { ...c, error: null }
  try {
    // deno-lint-ignore no-explicit-any
    const o: any = { ...order, song: writeSong(order) }
    const { tries, best, passed } = await makeTakes(o, keys, { prompt: buildSongPrompt(o), schema: SONG_SCHEMA })
    const nameInLyrics = o.song.sections.flatMap((s: { lines: string[] }) => s.lines).join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .split(new RegExp(`\\b${c.name.normalize('NFKD').replace(/[̀-ͯ]/g, '')}\\b`, 'i')).length - 1
    result.name_check = { passed, needs_person: !passed, tries: tries.map(({ spelling, heard, refused }) => ({ spelling, heard, refused: Boolean(refused) })) }
    result.sung_as = best.spelling
    result.status = passed ? 'ready_for_review' : 'in_production'
    result.name_in_lyrics = nameInLyrics
    const file = `${OUT}/songs/${c.id}.mp3`
    await Deno.writeFile(file, best.audio!)
    result.file = `songs/${c.id}.mp3`
    const pattern = new RegExp(`\\b(${c.heard}|${plain(best.spelling).replace(/[^a-z ]/g, '')})\\b`, 'i')
    const texts = await Promise.all([1, 2, 3].map(() => listen(best.audio!, keys.openai)))
    result.our_heard = texts.filter((t) => pattern.test(plain(t))).length
    result.our_lines = texts.map((t) => [...t.matchAll(/[^.!?\n]*birthday[^.!?\n]*/gi)].map((m) => m[0].trim()).slice(0, 3))
  } catch (error) {
    result.error = String((error as Error).message).slice(0, 300)
  }
  result.seconds = Math.round((Date.now() - started) / 1000)
  return result
}

const todo = CASES.filter((c) => !ONLY.length || ONLY.includes(c.id))
// deno-lint-ignore no-explicit-any
const results: any[] = []
const startedAt = new Date().toISOString()
let next = 0
const save = () => Deno.writeTextFile(`${OUT}/results.json`, JSON.stringify({ startedAt, safety: { checks: [], suggestions: {} }, results }, null, 1))
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  while (next < todo.length) {
    const r = await runCase(todo[next++])
    results.push(r)
    const tries = (r.name_check?.tries || []).map((t: { spelling: string; heard: number; refused: boolean }) => `${t.spelling}${t.refused ? '✗' : `:${t.heard}`}`).join(' ')
    console.log(`${r.id.padEnd(14)} ${String(r.seconds).padStart(4)}s  name x${r.name_in_lyrics ?? '-'} in lyrics  sung as ${r.sung_as ?? '-'}  check ${r.name_check?.passed ?? '-'}  ours ${r.our_heard ?? '-'}/3  [${tries}] ${r.error ?? ''}`)
    await save()
  }
}))
await save()
console.log('done', results.length)
