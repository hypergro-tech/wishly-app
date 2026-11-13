// Sings an order's lyrics and checks the name came out right.
// POST { order_id } -> { done, passed, sung_as }. Call startSong first.
// It does all the work before replying (up to Base44's 5-minute limit):
// background work after the reply is cut off after about 30 seconds, which is
// shorter than one song takes. The app doesn't wait for the reply; it checks
// the order instead.
//
//   0. Write the lyrics with Gemini first, from a prompt built here from the
//      saved order (never one the app sends), using the name at least four
//      times. The template lyrics startSong saved stay if it fails.
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

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    if (!(await base44.auth.me().catch(() => null))) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { order_id } = await req.json()
    if (typeof order_id !== 'string' || !order_id) return Response.json({ error: 'Send the order to sing' }, { status: 400 })
    // Read as the buyer, so the order's own access rules check it's theirs.
    const order = await base44.entities.Order.get(order_id).catch(() => null)
    if (!order) return Response.json({ error: 'No such order' }, { status: 404 })
    if (order.status !== 'in_production' || !order.song?.sections?.length) return Response.json({ error: 'Start the song first' }, { status: 409 })

    const gemini = cleanKey(secrets.get('GEMINI_API_KEY'))
    if (!gemini) return Response.json({ error: 'GEMINI_API_KEY must be set' }, { status: 500 })

    const admin = base44.asServiceRole
    const { story, mood } = songInputs(order)
    const lyrics = { prompt: buildLyricPrompt(story, mood, story.occasion), schema: LYRICS_SCHEMA }
    try {
      return Response.json({ done: true, ...(await produce(admin, order, { gemini }, lyrics)) })
    } catch (error) {
      console.error('makeSong failed', order.id, error)
      const message = String((error as Error)?.message ?? error)
      await admin.entities.Order.update(order.id, { name_check: { passed: false, needs_person: true, tries: [], error: message } })
      return Response.json({ done: false, error: message }, { status: 500 })
    }
  } catch (error) {
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}

// deno-lint-ignore no-explicit-any
async function produce(admin: any, order: Order, keys: Keys, lyrics: { prompt: string; schema: object } | null) {
  const { tries, best, passed } = await makeTakes(order, keys, lyrics)
  const file = new File([best.audio!], `wishly-${order.id}-v${order.song_version || 1}.mp3`, { type: 'audio/mpeg' })
  const { file_url } = await admin.integrations.Core.UploadFile({ file })

  await admin.entities.Order.update(order.id, {
    song: { ...order.song, audio_url: file_url, sung_as: best.spelling },
    name_check: { passed, needs_person: !passed, tries: tries.map(({ spelling, heard, refused }) => ({ spelling, heard, refused: Boolean(refused) })) },
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
  if (typeof to !== 'string' || !to.startsWith('ExponentPushToken[')) return
  const name = order.recipient?.name || 'their'
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
  if (!res.ok) console.error('push send', res.status, await res.text())
}
