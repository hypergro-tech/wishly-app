// A buyer fixes the name on a finished song, and it's made again.
//   node scripts/song-tests/correction.mjs <order id> <new sounds-like spelling>
// Checks the new version is sung with the new spelling and the name is heard.

import { signIn } from './client.mjs'

const [orderId, spelling] = process.argv.slice(2)
const base44 = await signIn()
const before = await base44.entities.Order.get(orderId)
// Like the app: save the correction, then startSong makes the next version.
await base44.entities.Order.update(orderId, {
  recipient: { ...before.recipient, pronunciation: spelling },
  corrections: [...(before.corrections || []), { kind: 'name', note: `It should sound like ${spelling}`, changes: {}, at: new Date().toISOString(), resolved: false }],
})
const started = Date.now()
await base44.functions.invoke('startSong', { order_id: orderId })
const res = await base44.functions.invoke('makeSong', { order_id: orderId })
const after = await base44.entities.Order.get(orderId)
console.log(JSON.stringify({
  seconds: Math.round((Date.now() - started) / 1000), reply: res.data,
  version: `${before.song_version} -> ${after.song_version}`, status: after.status,
  sung_as: `${before.song?.sung_as} -> ${after.song?.sung_as}`, new_audio: after.song?.audio_url !== before.song?.audio_url,
  name_check: after.name_check,
}, null, 1))
