// Sings an order's lyrics and checks the name came out right.
// POST { order_id } -> { done, passed, sung_as }. Call startSong first.
// It does all the work before replying (up to Base44's 5-minute limit):
// background work after the reply is cut off after about 30 seconds, which is
// shorter than one song takes. The app doesn't wait for the reply; it checks
// the order instead.
//
//   0. Write the lyrics with Gemini first, from a prompt built here from the
//      saved order (never one the app sends), using the name at least four
//      times (an anniversary couple: both names, three times each). The template lyrics startSong saved stay if it fails.
//   1. Sing it with the buyer's sounds-like spelling (else a tested or
//      suggested one for tricky names, else the name as written).
//   2. Listen three times. The name must be heard at least twice.
//   3. If not, sing it again with the next spelling, up to three tries.
//   4. Save the best take. If no try passed, the order stays in production and
//      is flagged (name_check.needs_person) for someone to listen first.

import { createClientFromRequest } from 'npm:@base44/sdk'
import { secrets } from 'base44:runtime'

import { cleanKey } from '../../shared/ai.ts'
import { buildLyricPrompt, LYRICS_SCHEMA } from '../../shared/lyricGenerator.ts'
import { makeTakes, type Keys, type Order } from '../../shared/song.ts'
import { songInputs } from '../../shared/songPipeline.ts'
import { together } from '../../shared/names.ts'
import { overLimit } from '../../shared/limits.ts'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    const user = await base44.auth.me().catch(() => null)
    if (!user?.email) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { order_id } = await req.json()
    if (typeof order_id !== 'string' || !order_id) return Response.json({ error: 'Send the order to sing' }, { status: 400 })
    // Read as the buyer, so the order's own access rules check it's theirs.
    const order = await base44.entities.Order.get(order_id).catch(() => null)
    if (!order) return Response.json({ error: 'No such order' }, { status: 404 })
    if (order.status !== 'in_production' || !order.song?.sections?.length) return Response.json({ error: 'Start the song first' }, { status: 409 })

    const gemini = cleanKey(secrets.get('GEMINI_API_KEY'))
    if (!gemini) return Response.json({ error: 'GEMINI_API_KEY must be set' }, { status: 500 })

    const admin = base44.asServiceRole
    // Each run costs real money (lyrics, singing, listening), so one version
    // is made by one run at a time, and at most twice.
    const limited = await overLimit(admin, user.email, 'makeSong')
    if (limited) return Response.json({ error: limited, code: 'rate_limited' }, { status: 429 })
    const claim = await claimMaking(admin, order)
    if (claim) return Response.json({ error: claim }, { status: 409 })

    const { story, mood } = songInputs(order)
    const lyrics = { prompt: buildLyricPrompt(story, mood, story.occasion), schema: LYRICS_SCHEMA }
    try {
      return Response.json({ done: true, ...(await produce(admin, order, { gemini }, lyrics)) })
    } catch (error) {
      console.error('makeSong failed', order.id, error)
      // The cause is kept on the order for whoever looks at it; the app gets a
      // plain message, never the AI provider's own error.
      const message = String((error as Error)?.message ?? error).slice(0, 300)
      await admin.entities.Order.update(order.id, { name_check: { passed: false, needs_person: true, tries: [], error: message } })
      return Response.json({ done: false, error: 'We couldn’t finish this song yet. We’ll take a look and let you know.' }, { status: 500 })
    }
  } catch (error) {
    console.error('makeSong failed before singing', error)
    return Response.json({ error: 'Something went wrong. Try again in a moment.' }, { status: 500 })
  }
}

// A run is longer than Base44's 5-minute limit only if it crashed.
const RUN_MS = 6 * 60_000
const RUNS_PER_VERSION = 2
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Marks this version as being made by this run. Null when it may go ahead,
// else why not. Two runs sent together both write their mark; after a short
// wait only the one whose mark stuck goes on.
// deno-lint-ignore no-explicit-any
async function claimMaking(admin: any, order: Order & { making?: { version?: number; since?: string; runs?: number; by?: string } }) {
  const version = order.song_version || 0
  const m = order.making?.version === version ? order.making : null
  if (m?.since && Date.now() - Date.parse(m.since) < RUN_MS) return 'This song is already being made'
  if ((m?.runs || 0) >= RUNS_PER_VERSION) return 'This version needs a person to look at it. We’ll be in touch.'

  const by = crypto.randomUUID()
  await admin.entities.Order.update(order.id, { making: { version, since: new Date().toISOString(), runs: (m?.runs || 0) + 1, by } })
  await pause(1500)
  const fresh = await admin.entities.Order.get(order.id).catch(() => null)
  return fresh?.making?.by === by ? null : 'This song is already being made'
}

// deno-lint-ignore no-explicit-any
async function produce(admin: any, order: Order, keys: Keys, lyrics: { prompt: string; schema: object } | null) {
  const { tries, best, passed } = await makeTakes(order, keys, lyrics)
  const file = new File([best.audio!], `wishly-${order.id}-v${order.song_version || 1}.mp3`, { type: 'audio/mpeg' })
  const { file_url } = await admin.integrations.Core.UploadFile({ file })

  await admin.entities.Order.update(order.id, {
    // One spelling per name; a couple's second name keeps its own.
    song: { ...order.song, audio_url: file_url, sung_as: best.sung?.[0] ?? best.spelling, ...(best.sung?.[1] ? { partner_sung_as: best.sung[1] } : {}) },
    name_check: { passed, needs_person: !passed, tries: tries.map(({ spelling, heard, refused, startsAt }) => ({ spelling, heard, refused: Boolean(refused), starts_at: startsAt ?? null })) },
    // A take that never passed waits for a person to listen before the buyer hears it.
    ...(passed ? { status: 'ready_for_review' } : {}),
  })
  if (passed) await tellBuyer(admin, order).catch((e) => console.error('push failed', order.id, e))
  return { passed, sung_as: best.spelling }
}

// "Your song is ready" on the buyer's phone. The app saves the phone's push
// address on the order after it's placed, so read the order again. Expo's
// push service passes it on to Apple.
// deno-lint-ignore no-explicit-any
async function tellBuyer(admin: any, order: Order) {
  const fresh = await admin.entities.Order.get(order.id).catch(() => null)
  const to = fresh?.push_token
  if (typeof to !== 'string' || !to.startsWith('ExponentPushToken[')) {
    console.log('push skipped: no phone address on the order', order.id)
    return
  }
  const name = order.recipient?.name ? together(order.recipient) : 'their'
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to,
      title: (order.song_version || 1) > 1 ? `${name}’s new version is ready` : `${name}’s song is ready`,
      body: 'Tap to listen and check every name.',
      sound: 'default',
      data: { url: `/song/${order.id}` },
    }),
  })
  // Expo answers 200 even when Apple refuses (DeviceNotRegistered,
  // InvalidCredentials…): the ticket says what happened, so log it.
  const body = await res.text()
  if (!res.ok) console.error('push send', res.status, body)
  else console.log('push ticket', order.id, body.slice(0, 300))
}
