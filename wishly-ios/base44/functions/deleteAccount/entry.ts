// Deletes the signed-in buyer's account and every order they made, so their
// songs and gift links stop working. The App Store asks every app with sign-up
// to offer this inside the app. POST {} -> { deleted: number of orders }.
//
// A removed Base44 user sits in "Recently deleted" for 30 days, where an app
// editor can restore it, and is then deleted for good.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    const user = await base44.auth.me().catch(() => null)
    if (!user) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const admin = base44.asServiceRole
    const orders = await admin.entities.Order.filter({ created_by: user.email })
    for (const order of orders) await admin.entities.Order.delete(order.id)
    await admin.entities.User.delete(user.id)
    return Response.json({ deleted: orders.length })
  } catch (error) {
    console.error('deleteAccount failed', error)
    return Response.json({ error: 'Something went wrong. Try again in a moment.' }, { status: 500 })
  }
}
