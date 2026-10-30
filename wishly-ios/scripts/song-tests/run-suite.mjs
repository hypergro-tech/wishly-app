// Aggressive end-to-end test of the deployed song backend.
//
//   node scripts/song-tests/run-suite.mjs [out dir] [case ids...]
//
// Signs in as the test buyer, checks the functions refuse bad calls, then for
// each name places an order exactly like the app (template lyrics plus the
// app's lyrics prompt), runs makeSong, downloads the song and has it heard
// three more times here, independently of makeSong's own check. Writes
// results.json and the songs to the out dir. Needs OPEN_AI_TOKEN in
// ~/Downloads/.env for the independent listening.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@base44/sdk'

import { buildSongPrompt, SONG_SCHEMA, writeSong } from '../../src/lib/songwriter.ts'
import { CASES } from './cases.mjs'
import { signIn } from './client.mjs'

const OUT = process.argv[2] || join(homedir(), 'Downloads/Claude working files/wishly-song-tests/suite')
const ONLY = process.argv.slice(3)
const PARALLEL = 5
mkdirSync(join(OUT, 'songs'), { recursive: true })

const OPENAI = readFileSync(join(homedir(), 'Downloads/.env'), 'utf8').match(/^OPEN_AI_TOKEN=(.*)$/m)[1].trim().replace(/^"|"$/g, '')
const APP_ID = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').match(/^EXPO_PUBLIC_BASE44_APP_ID=(.*)$/m)[1].trim()


const plain = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

async function listen(file) {
  const form = new FormData()
  form.append('model', 'gpt-4o-transcribe')
  form.append('language', 'en')
  form.append('file', new Blob([readFileSync(file)], { type: 'audio/mpeg' }), 'song.mp3')
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', body: form, headers: { Authorization: `Bearer ${OPENAI}` } })
    if (res.ok) return (await res.json()).text
    if (attempt === 3) throw new Error(`transcribe ${res.status}`)
    await new Promise((r) => setTimeout(r, 3000 * attempt))
  }
}

const nameLines = (text, pattern) =>
  [...text.matchAll(/[^.!?\n]*birthday[^.!?\n]*/gi)].map((m) => m[0].trim()).filter(Boolean).slice(0, 3)
    .concat(pattern.test(plain(text)) ? [] : ['(name not heard)'])

async function runCase(base44, c) {
  const started = Date.now()
  const order = {
    status: 'in_production',
    recipient: { name: c.name, pronunciation: c.sounds_like || '', pronouns: c.who === 'man' ? 'he/him' : 'she/her', relationship: 'Partner' },
    occasion: 'Birthday',
    memories: { memory: 'Sunday pancakes on the porch, and the first one always burns', nickname: '' },
    music: { mood: 'Joyful', genre: 'Acoustic', voice: c.who === 'man' ? 'Female vocal' : 'Male vocal', language: 'English' },
    package: { delivery: 'standard', extras: [] },
    buyer: { name: 'Sam', email: 'test@example.com' },
    price_total: 0, corrections: [], song_version: 1, gift: null,
  }
  const result = { ...c, order_id: null, seconds: null, function: null, error: null }
  try {
    const created = await base44.entities.Order.create({ ...order, song: writeSong(order) })
    result.order_id = created.id
    const res = await base44.functions.invoke('makeSong', { order_id: created.id, lyrics_prompt: buildSongPrompt(created), lyrics_schema: SONG_SCHEMA })
    result.function = res.data
  } catch (error) {
    result.error = String(error?.data?.error || error?.message || error)
  }
  result.seconds = Math.round((Date.now() - started) / 1000)
  if (!result.order_id) return result

  const saved = await base44.entities.Order.get(result.order_id)
  Object.assign(result, { status: saved.status, sung_as: saved.song?.sung_as, title: saved.song?.title, name_check: saved.name_check, audio_url: saved.song?.audio_url })
  if (!saved.song?.audio_url) return result

  const file = join(OUT, 'songs', `${c.id}.mp3`)
  writeFileSync(file, Buffer.from(await (await fetch(saved.song.audio_url)).arrayBuffer()))
  result.file = `songs/${c.id}.mp3`
  // Count as heard: the case's own list, or the spelling that was sung.
  const pattern = new RegExp(`\\b(${c.heard}|${plain(saved.song.sung_as || c.name).replace(/[^a-z ]/g, '')})\\b`, 'i')
  const texts = await Promise.all([1, 2, 3].map(() => listen(file)))
  result.our_heard = texts.filter((t) => pattern.test(plain(t))).length
  result.our_lines = texts.map((t) => nameLines(t, pattern))
  return result
}

async function safetyChecks(base44) {
  const out = []
  const expectFail = async (label, fn) => {
    try { await fn(); out.push({ check: label, passed: false, detail: 'was allowed' }) }
    catch (error) { out.push({ check: label, passed: true, detail: `refused (${error?.status ?? '?'}: ${String(error?.data?.error || error?.message).slice(0, 80)})` }) }
  }
  const stranger = createClient({ appId: APP_ID })
  await expectFail('makeSong refuses someone signed out', () => stranger.functions.invoke('makeSong', { order_id: 'x' }))
  await expectFail('suggestSpelling refuses someone signed out', () => stranger.functions.invoke('suggestSpelling', { name: 'Ailbhe' }))
  await expectFail('makeSong refuses a made-up order', () => base44.functions.invoke('makeSong', { order_id: '000000000000000000000000' }))
  await expectFail('makeSong refuses a call with no order', () => base44.functions.invoke('makeSong', {}))
  await expectFail('suggestSpelling refuses an empty name', () => base44.functions.invoke('suggestSpelling', { name: ' ' }))
  await expectFail('suggestSpelling refuses a very long name', () => base44.functions.invoke('suggestSpelling', { name: 'x'.repeat(200) }))
  const suggestions = {}
  for (const name of ['Ailbhe', 'Gráinne', 'Tadhg', 'Eoghan', 'Oisín', 'Taylor', 'Siobhan']) {
    try { suggestions[name] = (await base44.functions.invoke('suggestSpelling', { name })).data } catch (error) { suggestions[name] = { error: String(error?.message) } }
  }
  return { checks: out, suggestions }
}

const base44 = await signIn()
const startedAt = new Date().toISOString()
console.log('safety checks…')
const safety = await safetyChecks(base44)
for (const c of safety.checks) console.log(`${c.passed ? 'PASS' : 'FAIL'}  ${c.check}  ${c.detail}`)

const todo = CASES.filter((c) => !ONLY.length || ONLY.includes(c.id))
const results = []
let next = 0
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  while (next < todo.length) {
    const c = todo[next++]
    const r = await runCase(base44, c)
    results.push(r)
    const tries = (r.name_check?.tries || []).map((t) => `${t.spelling}${t.refused ? '✗' : `:${t.heard}`}`).join(' ')
    console.log(`${r.id.padEnd(14)} ${String(r.seconds).padStart(4)}s  ${r.status ?? 'ERROR'}  sung as ${r.sung_as ?? '-'}  makeSong ${r.name_check?.passed ?? '-'}  ours ${r.our_heard ?? '-'}/3  [${tries}] ${r.error ?? ''}`)
    writeFileSync(join(OUT, 'results.json'), JSON.stringify({ startedAt, safety, results }, null, 1))
  }
}))
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), safety, results }, null, 1))
console.log('done', results.length)
