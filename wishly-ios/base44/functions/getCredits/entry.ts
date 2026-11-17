// How many songs the signed-in buyer can make now, from their verified
// purchases: songs left this month of their plan, plus single songs.
// POST {} -> { required, plan, plan_songs_left, singles, songs_left }
// Signed out, it still answers with `required` (whether Wishly is launched,
// shared/launch.ts) and no songs, so the app knows which mode it's in.

import { createClientFromRequest } from 'npm:@base44/sdk'

import { PAYMENT_REQUIRED, creditsOf } from '../../shared/credits.ts'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    const user = await base44.auth.me().catch(() => null)
    if (!user?.email) return Response.json({ required: PAYMENT_REQUIRED, plan: null, plan_songs_left: 0, singles: 0, songs_left: 0 })
    return Response.json(await creditsOf(base44.asServiceRole, user.email))
  } catch (error) {
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}
