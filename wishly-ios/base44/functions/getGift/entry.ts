// The song and message behind a gift link, for the person receiving it.
// POST { token, opened? } -> { name, title, occasion, audio_url, sections, message, from_name }
// Anyone with the link may call it, so it returns only what the gift page
// shows, and only for songs the buyer has approved. The Order entity itself
// stays private to its buyer. `opened: true` counts a visit.

import { createClientFromRequest } from 'npm:@base44/sdk'

export default async function (req: Request) {
  try {
    const { token, opened } = await req.json()
    if (typeof token !== 'string' || !/^[a-z0-9]{8,64}$/.test(token)) return Response.json({ error: 'No such gift' }, { status: 404 })

    const admin = createClientFromRequest(req).asServiceRole
    const [order] = await admin.entities.Order.filter({ gift_token: token, status: 'approved' })
    if (!order?.song?.audio_url) return Response.json({ error: 'No such gift' }, { status: 404 })

    if (opened) {
      await admin.entities.Order.update(order.id, { gift: { ...order.gift, opened_count: (order.gift?.opened_count || 0) + 1 } })
    }
    return Response.json({
      name: order.recipient.name,
      title: order.song.title,
      occasion: order.occasion,
      audio_url: order.song.audio_url,
      sections: order.song.sections,
      message: order.gift?.message ?? '',
      from_name: order.gift?.from_name ?? '',
    })
  } catch (error) {
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}
