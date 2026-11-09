// A few live songs in different moods and styles, made by the deployed backend.
//   node scripts/song-tests/styles.mjs [out dir]
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { signIn } from './client.mjs'

const OUT = process.argv[2] || join(homedir(), 'Downloads/Claude working files/wishly-song-tests/styles')
mkdirSync(OUT, { recursive: true })
const CASES = [
  { name: 'Emily', mood: 'romantic', genre: 'R&B', voice: 'Male vocal', occasion: 'Anniversary' },
  { name: 'Siobhan', sounds_like: 'Shivawn', mood: 'energetic', genre: 'Electronic', voice: 'Male vocal', occasion: 'Birthday' },
  { name: 'Taylor', mood: 'upbeat', genre: 'Hip Hop', voice: 'Female vocal', occasion: 'Birthday' },
  { name: 'Caoimhe', sounds_like: 'Keeva', mood: 'emotional', genre: 'Classical', voice: 'Female vocal', occasion: "Mother's Day" },
]
const base44 = await signIn()
const results = await Promise.all(CASES.map(async (c) => {
  const started = Date.now()
  const draft = {
    recipient: { name: c.name, pronunciation: c.sounds_like || '', pronouns: 'she/her', relationship: 'Partner' },
    occasion: c.occasion,
    memories: { memory: 'Sunday pancakes on the porch, and the first one always burns', nickname: '' },
    music: { mood: c.mood, genre: c.genre, voice: c.voice, language: 'English' },
    package: { delivery: 'standard', extras: [] },
    buyer: { name: 'Sam', email: 'test@example.com' },
    price_total: 0, corrections: [], gift: null,
  }
  const order = await base44.entities.Order.create(draft)
  const res = await base44.functions.invoke('startSong', { order_id: order.id })
    .then(() => base44.functions.invoke('makeSong', { order_id: order.id }))
    .catch((e) => ({ data: { error: e.message } }))
  const after = await base44.entities.Order.get(order.id)
  const file = `${c.name.toLowerCase()}-${c.mood}-${c.genre.toLowerCase().replace(/\W+/g, '')}.mp3`
  if (after.song?.audio_url) writeFileSync(join(OUT, file), Buffer.from(await (await fetch(after.song.audio_url)).arrayBuffer()))
  const r = { ...c, order_id: order.id, seconds: Math.round((Date.now() - started) / 1000), reply: res.data, status: after.status, sung_as: after.song?.sung_as, tries: after.name_check?.tries, file: after.song?.audio_url ? file : null }
  console.log(`${c.name.padEnd(8)} ${c.mood}/${c.genre}  ${r.seconds}s  ${r.status}  sung as ${r.sung_as}  ${JSON.stringify(r.tries)} ${res.data?.error || ''}`)
  return r
}))
writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 1))
