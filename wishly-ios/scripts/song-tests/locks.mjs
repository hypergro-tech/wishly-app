// Checks the deployed backend keeps a buyer's hands off what only it may set:
// the status, the song and its audio, and the gift link. Makes no song, so it
// costs nothing.
//   node scripts/song-tests/locks.mjs
// Signs in as the test buyer, places one order, tries each forbidden change,
// and prints a pass or fail per check.

import { anonymous, signIn } from './client.mjs'

const base44 = await signIn()
const Orders = base44.entities.Order
const results = []
const check = async (label, fn, { allowed = false } = {}) => {
  try {
    await fn()
    results.push({ check: label, passed: allowed, detail: 'was allowed' })
  } catch (error) {
    results.push({ check: label, passed: !allowed, detail: `refused (${error?.status ?? '?'}: ${String(error?.data?.error || error?.data?.message || error?.message).slice(0, 90)})` })
  }
}

const brief = {
  recipient: { name: 'Maya', pronunciation: '', pronouns: 'she/her', relationship: 'Friend' },
  occasion: 'Birthday',
  memories: { memory: 'Sunday pancakes on the porch' },
  music: { mood: 'Upbeat', genre: 'Pop', voice: 'Female vocal', language: 'English' },
  package: { delivery: 'standard', extras: [] },
  buyer: { name: 'Sam', email: 'test@example.com' },
  price_total: 0, corrections: [],
}

await check('Create an order with an approved status', () => Orders.create({ ...brief, status: 'approved' }))
await check('Create an order with a gift link', () => Orders.create({ ...brief, gift_token: 'locktest0000000000' }))
await check('Create an order with a song already sung', () => Orders.create({ ...brief, song: { title: 'x', sections: [], audio_url: 'https://example.com/x.mp3' } }))

const order = await Orders.create(brief)
await check('Create a plain order, like the app', async () => {}, { allowed: true })
await check('Sing before startSong', () => base44.functions.invoke('makeSong', { order_id: order.id }))
await check('Approve a song that was never sung', () => base44.functions.invoke('approveSong', { order_id: order.id, message: 'hi', from_name: 'Sam' }))
await check('Set the status to approved', () => Orders.update(order.id, { status: 'approved' }))
await check('Set a gift link', () => Orders.update(order.id, { gift_token: 'locktest0000000000' }))
await check('Swap in any audio', () => Orders.update(order.id, { song: { title: 'x', sections: [], audio_url: 'https://example.com/x.mp3' } }))
await check('Change the song version', () => Orders.update(order.id, { song_version: 9 }))
await check('Clear the name check', () => Orders.update(order.id, { name_check: { passed: true, needs_person: false, tries: [] } }))
await check('Change the details (still allowed)', () => Orders.update(order.id, { memories: { ...brief.memories, nickname: 'May' } }), { allowed: true })
await check('Leave feedback (still allowed)', () => Orders.update(order.id, { feedback: { rating: 'LIKE', at: new Date().toISOString() } }), { allowed: true })
await check('startSong saves the first version', () => base44.functions.invoke('startSong', { order_id: order.id }), { allowed: true })

const saved = await Orders.get(order.id)
results.push({
  check: 'startSong wrote the template, version 1, in production',
  passed: saved.status === 'in_production' && saved.song_version === 1 && saved.song?.sections?.length > 0 && !saved.song?.audio_url && !saved.gift_token,
  detail: `status ${saved.status}, version ${saved.song_version}, ${saved.song?.sections?.length ?? 0} sections, audio ${saved.song?.audio_url ? 'set' : 'none'}, link ${saved.gift_token ? 'set' : 'none'}`,
})
// Payment and the one-run-at-a-time mark are the backend's alone too, and a
// buyer can't delete an order (a plan's songs are counted from its orders).
await check('Create an order already paid for', () => Orders.create({ ...brief, paid_with: 'song:locktest' }))
await check('Mark the order as paid', () => Orders.update(order.id, { paid_with: 'song:locktest' }))
await check('Clear the making mark', () => Orders.update(order.id, { making: { version: 0, runs: 0 } }))
await check('Delete the order', () => Orders.delete(order.id))
// Only a signed-in buyer can place an order, and corrections stay small.
await check('Place an order without signing in', () => anonymous().entities.Order.create(brief))
await check('Send a huge correction note', () => Orders.update(order.id, { corrections: [{ kind: 'other', note: 'x'.repeat(5000), changes: {}, at: new Date().toISOString(), resolved: false }] }))
await check('Send a normal correction (still allowed)', () => Orders.update(order.id, { corrections: [{ kind: 'name', note: 'Say it like Keeva', changes: { recipient: { name: 'Maya', pronunciation: 'My-uh' } }, at: new Date().toISOString(), resolved: false }] }), { allowed: true })
// Purchases are read and written only by the backend.
const seen = await base44.entities.Purchase.list().catch(() => [])
results.push({ check: 'Read purchases', passed: seen.length === 0, detail: `${seen.length} seen` })
await check('Add a purchase', () => base44.entities.Purchase.create({ transaction_id: 'locktest', kind: 'song', buyer: 'x@example.com', purchased_at: new Date().toISOString() }))

// A second buyer (WISHLY_TOKEN_B, local backend only) gets "not found" for
// the first buyer's order, whatever they try with its ID.
const other = await signIn('B').catch(() => null)
if (other) {
  const theirs = other.entities.Order
  await check('Another buyer reads the order', () => theirs.get(order.id))
  await check('Another buyer lists orders and sees none of it', async () => { if ((await theirs.list()).some((o) => o.id === order.id)) throw new Error('saw it') }, { allowed: true })
  await check('Another buyer looks it up by ID', async () => { if ((await theirs.filter({ id: order.id })).length) throw new Error('saw it') }, { allowed: true })
  await check('Another buyer changes the details', () => theirs.update(order.id, { memories: { memory: 'changed' } }))
  await check('Another buyer deletes it', () => theirs.delete(order.id))
  await check('Another buyer starts the song', () => other.functions.invoke('startSong', { order_id: order.id }))
  await check('Another buyer sings it', () => other.functions.invoke('makeSong', { order_id: order.id }))
  await check('Another buyer approves it', () => other.functions.invoke('approveSong', { order_id: order.id, message: 'hi', from_name: 'x' }))
  await check('Another buyer opens it as a gift by its ID', () => other.functions.invoke('getGift', { token: order.id }))
}
// The test order stays in the test buyer's account, in production with no audio.

for (const r of results) console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.check}  (${r.detail})`)
const failed = results.filter((r) => !r.passed).length
console.log(failed ? `\n${failed} failed` : '\nAll passed')
process.exit(failed ? 1 : 0)
