// node scripts/song-tests/show-order.mjs <order id>
import { signIn } from './client.mjs'

const base44 = await signIn()
const o = await base44.entities.Order.get(process.argv[2])
console.log(JSON.stringify({ status: o.status, name: o.recipient.name, sounds_like: o.recipient.pronunciation,
  sung_as: o.song?.sung_as, audio_url: o.song?.audio_url, name_check: o.name_check, title: o.song?.title }, null, 1))
