// Sings an order's lyrics and checks the name came out right.
// POST { order_id, lyrics_prompt?, lyrics_schema? } -> { done, passed, sung_as }.
// It does all the work before replying (up to Base44's 5-minute limit):
// background work after the reply is cut off after about 30 seconds, which is
// shorter than one song takes. The app doesn't wait for the reply; it checks
// the order instead.
//
//   0. If the app sent a lyrics prompt, write the lyrics with Gemini first,
//      using the name at least four times. The template lyrics stay if it fails.
//   1. Sing it with the buyer's sounds-like spelling (else a tested or
//      suggested one for tricky names, else the name as written).
//   2. Listen three times. The name must be heard at least twice.
//   3. If not, sing it again with the next spelling, up to three tries.
//   4. Save the best take. If no try passed, the order stays in production and
//      is flagged (name_check.needs_person) for someone to listen first.

import { createClientFromRequest } from 'npm:@base44/sdk'
import { secrets } from 'base44:runtime'

import { cleanKey } from '../../shared/ai.ts'
import { makeTakes, type Keys, type Order } from '../../shared/song.ts'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    if (!(await base44.auth.me().catch(() => null))) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { order_id, lyrics_prompt, lyrics_schema } = await req.json()
    if (typeof order_id !== 'string' || !order_id) return Response.json({ error: 'Send the order to sing' }, { status: 400 })
    // Read as the buyer, so the order's own access rules check it's theirs.
    const order = await base44.entities.Order.get(order_id).catch(() => null)
    if (!order) return Response.json({ error: 'No such order' }, { status: 404 })
    if (!order.song?.sections?.length) return Response.json({ error: 'Write the lyrics first' }, { status: 400 })

    const gemini = cleanKey(secrets.get('GEMINI_API_KEY'))
    const openai = cleanKey(secrets.get('OPENAI_API_KEY'))
    if (!gemini || !openai) return Response.json({ error: 'GEMINI_API_KEY and OPENAI_API_KEY must be set' }, { status: 500 })

    const admin = base44.asServiceRole
    const lyrics = typeof lyrics_prompt === 'string' ? { prompt: lyrics_prompt.slice(0, 8000), schema: lyrics_schema } : null
    try {
      return Response.json({ done: true, ...(await produce(admin, order, { gemini, openai }, lyrics)) })
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
  return { passed, sung_as: best.spelling }
}
