// The song and message behind a gift link, for the person receiving it.
// POST { token, opened? } -> { name, names, title, occasion, cover, audio_url, sections, message, from_name }
// `names` is one name, or both of an anniversary couple; `name` joins them
// ("Rebel & George"). `cover` is which of the five artworks the song shows.
// Anyone with the link may call it, so it returns only what the gift page
// shows, and only for songs the buyer has approved. The Order entity itself
// stays private to its buyer. `opened: true` counts a visit.

import { createClientFromRequest } from 'npm:@base44/sdk'

import { coverIndex, honourees } from '../../shared/names.ts'

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
      name: honourees(order.recipient).map((h) => h.name).join(' & '),
      names: honourees(order.recipient).map((h) => h.name),
      title: order.song.title,
      occasion: order.occasion,
      cover: coverIndex(order as { id: string; cover?: number }),
      audio_url: order.song.audio_url,
      sections: order.song.sections,
      message: order.gift?.message ?? '',
      from_name: order.gift?.from_name ?? '',
    })
  } catch (error) {
    console.error('getGift failed', error)
    return Response.json({ error: 'Something went wrong. Try again in a moment.' }, { status: 500 })
  }
}
