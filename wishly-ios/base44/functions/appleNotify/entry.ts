// Apple's App Store Server Notifications (version 2) arrive here: a plan
// renewed, lapsed or was cancelled, or a purchase was refunded or revoked.
// Each message is signed by Apple and checked before anything is saved
// (base44/shared/appStore.ts), so the buyer's song count stays right even if
// they never open the app. Set as the notification URL in App Store Connect:
// https://wishly-61fd03a5.base44.app/api/apps/6ae33a4fc9fab5ae61fd03a5/functions/appleNotify
// POST { signedPayload } -> 200 when handled (Apple retries anything else).

import { createClientFromRequest } from 'npm:@base44/sdk'

import { verifyNotification } from '../../shared/appStore.ts'
import { buyerOf, savePurchase } from '../../shared/credits.ts'

export default async function (req: Request) {
  const signed = await req.json().then((b) => b?.signedPayload).catch(() => null)
  if (typeof signed !== 'string') return Response.json({ error: 'Send signedPayload' }, { status: 400 })

  let verified
  try {
    verified = await verifyNotification(signed)
  } catch (error) {
    console.warn('Apple notification rejected', String((error as Error).message ?? error))
    return Response.json({ error: 'Not a valid App Store notification' }, { status: 400 })
  }
  const { notification: n, transaction: t } = verified
  console.log('Apple notification', n.notificationType, n.subtype ?? '', n.data?.environment ?? '', t?.productId ?? '', t?.transactionId ?? '')
  if (!t) return Response.json({ ok: true }) // e.g. Apple's TEST message

  try {
    const admin = createClientFromRequest(req).asServiceRole
    // A purchase the app hasn't sent yet: it's saved when the app does.
    const buyer = await buyerOf(admin, t.originalTransactionId)
    if (!buyer) {
      console.log('No buyer yet for', t.originalTransactionId)
      return Response.json({ ok: true })
    }
    // A renewal is saved as the plan's next period; a refund or revocation
    // marks the purchase revoked, so it stops counting.
    await savePurchase(admin, buyer, t)
    return Response.json({ ok: true })
  } catch (error) {
    console.error('Apple notification failed', n.notificationUUID, error)
    return Response.json({ error: 'Try again' }, { status: 500 })
  }
}
