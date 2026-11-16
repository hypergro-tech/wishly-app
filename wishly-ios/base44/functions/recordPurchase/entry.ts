// Saves an App Store purchase for the signed-in buyer, after checking Apple's
// signature on it. The app calls this for each new purchase, and on Restore.
// POST { signed: <StoreKit 2 signed transaction> } -> the buyer's credits.

import { createClientFromRequest } from 'npm:@base44/sdk'

import { verifyTransaction } from '../../shared/appStore.ts'
import { creditsOf, savePurchase } from '../../shared/credits.ts'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    const user = await base44.auth.me().catch(() => null)
    if (!user?.email) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { signed } = await req.json()
    if (typeof signed !== 'string' || signed.split('.').length !== 3) return Response.json({ error: 'Send the purchase' }, { status: 400 })
    const transaction = await verifyTransaction(signed).catch((e) => {
      throw Object.assign(new Error(`Not a valid App Store purchase: ${(e as Error).message}`), { status: 400 })
    })
    const admin = base44.asServiceRole
    await savePurchase(admin, user.email, transaction)
    return Response.json(await creditsOf(admin, user.email))
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500
    return Response.json({ error: String((error as Error).message ?? error) }, { status })
  }
}
