// Starts the next version of an order's song: the template lyrics, the next
// version number, and any corrections marked as made. Fast; the app calls
// makeSong straight after to write the real lyrics and sing them.
// POST { order_id } -> the updated order.
//
// The song, its version and the order's status are locked to the backend (see
// base44/entities/order.jsonc), so the song is always built here from the saved
// order, never from anything the app sends.

import { createClientFromRequest } from 'npm:@base44/sdk'

import { confirmSpend, spendSong } from '../../shared/credits.ts'

// The first version plus up to three corrections or retries.
const MAX_VERSIONS = 4
import { generateSongPayload, songInputs, startingSong } from '../../shared/songPipeline.ts'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    const user = await base44.auth.me().catch(() => null)
    if (!user?.email) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { order_id } = await req.json()
    if (typeof order_id !== 'string' || !order_id) return Response.json({ error: 'Send the order to start' }, { status: 400 })
    // Read as the buyer, so the order's own access rules check it's theirs.
    const order = await base44.entities.Order.get(order_id).catch(() => null)
    if (!order) return Response.json({ error: 'No such order' }, { status: 404 })

    // A new order, or one still being made (a retry), or a correction. Not an
    // approved song, and not a finished one with nothing to correct.
    const corrections = order.corrections || []
    const correcting = corrections.some((c: { resolved?: boolean }) => !c.resolved)
    if (order.status === 'approved' || (order.status === 'ready_for_review' && !correcting)) {
      return Response.json({ error: 'This song is already made' }, { status: 409 })
    }

    // Each version is a new recording, and a correction can change the name,
    // so a song is made at most MAX_VERSIONS times (the first and three
    // corrections or retries). Past that, support fixes it by hand.
    if ((order.song_version || 0) >= MAX_VERSIONS) {
      return Response.json({ error: 'This song has been remade as many times as we can do in the app. Email hello@trywishly.co and we’ll fix it for you.', code: 'version_limit' }, { status: 409 })
    }

    // A new song is paid for once, here: a plan song or a single song.
    // Retries and corrections of a paid song cost nothing.
    const admin = base44.asServiceRole
    let paid_with = order.paid_with
    if (!paid_with) {
      paid_with = await spendSong(admin, user.email, order.id)
      if (!paid_with) return Response.json({ error: 'Pay for this song first', code: 'payment_required' }, { status: 402 })
      // Save the charge first, then check that requests sent at the same
      // moment didn't spend the same song twice (credits.ts).
      await admin.entities.Order.update(order.id, { paid_with })
      if (!(await confirmSpend(admin, paid_with, order.id))) {
        return Response.json({ error: 'Something went wrong. Try again in a moment.', code: 'busy' }, { status: 409 })
      }
    }

    const changes = {
      paid_with,
      song: startingSong(order, generateSongPayload(songInputs(order))),
      song_version: (order.song_version || 0) + 1,
      status: 'in_production',
      corrections: corrections.map((c: object) => ({ ...c, resolved: true })),
    }
    await admin.entities.Order.update(order.id, changes)
    return Response.json({ ...order, ...changes })
  } catch (error) {
    console.error('startSong failed', error)
    return Response.json({ error: 'Something went wrong. Try again in a moment.' }, { status: 500 })
  }
}
