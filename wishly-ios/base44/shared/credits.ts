// What a buyer has paid for, worked out on the backend from their verified
// App Store purchases (the Purchase entity), and spending one song of it.
//
// A plan gives 3 songs per plan month: the month counts from the day the
// plan (or this year of it) started, so a plan bought on the 20th refills on
// the 20th. Plan songs are used first, then single songs.

import { PRODUCTS, type Transaction } from './appStore.ts'
import { LAUNCHED } from './launch.ts'

export const SONGS_PER_MONTH = 3

// Payment is required once Wishly is launched (shared/launch.ts). Before
// that, a buyer with nothing left still gets their song, marked "test".
export const PAYMENT_REQUIRED = LAUNCHED

type Purchase = {
  id: string
  transaction_id: string
  kind: 'song' | 'monthly' | 'yearly'
  purchased_at: string
  expires_at?: string | null
  revoked?: boolean
  used_by_order?: string | null
}

// Months since `since`, counting the start day: the 20th to the 19th is month 0.
function monthsSince(since: string, now = new Date()) {
  const s = new Date(since)
  const months = (now.getFullYear() - s.getFullYear()) * 12 + now.getMonth() - s.getMonth()
  return Math.max(0, now.getDate() < s.getDate() ? months - 1 : months)
}

function addMonths(since: string, n: number) {
  const d = new Date(since)
  d.setMonth(d.getMonth() + n)
  return d.toISOString()
}

// deno-lint-ignore no-explicit-any
type Admin = any

async function purchasesOf(admin: Admin, buyer: string): Promise<Purchase[]> {
  return ((await admin.entities.Purchase.filter({ buyer })) || []).filter((p: Purchase) => !p.revoked)
}

// The plan running now: the newest plan period that has started and not ended.
function activePlan(purchases: Purchase[], now = new Date()) {
  return purchases
    .filter((p) => p.kind !== 'song' && p.expires_at && new Date(p.expires_at) > now && new Date(p.purchased_at) <= now)
    .sort((a, b) => String(b.expires_at).localeCompare(String(a.expires_at)))[0] ?? null
}

const planKey = (p: Purchase, now = new Date()) => `plan:${p.transaction_id}#${monthsSince(p.purchased_at, now)}`

export async function creditsOf(admin: Admin, buyer: string) {
  const purchases = await purchasesOf(admin, buyer)
  const plan = activePlan(purchases)
  let planSongsLeft = 0
  if (plan) {
    const used = ((await admin.entities.Order.filter({ paid_with: planKey(plan) })) || []).length
    planSongsLeft = Math.max(0, SONGS_PER_MONTH - used)
  }
  const singles = purchases.filter((p) => p.kind === 'song' && !p.used_by_order).length
  return {
    required: PAYMENT_REQUIRED,
    plan: plan
      ? {
          id: plan.kind as 'monthly' | 'yearly',
          since: plan.purchased_at,
          renews_on: plan.expires_at,
          refills_on: addMonths(plan.purchased_at, monthsSince(plan.purchased_at) + 1),
        }
      : null,
    plan_songs_left: planSongsLeft,
    singles,
    songs_left: planSongsLeft + singles,
  }
}

// Who bought a purchase, from any saved transaction in its chain (a plan's
// renewals share the first purchase's original transaction id). Null when
// the app hasn't sent that purchase yet.
export async function buyerOf(admin: Admin, originalTransactionId: string): Promise<string | null> {
  const [p] = (await admin.entities.Purchase.filter({ original_transaction_id: originalTransactionId })) || []
  return p?.buyer ?? null
}

// Saves a verified transaction for this buyer. A transaction is saved once;
// one bought with another Wishly account stays with that account.
export async function savePurchase(admin: Admin, buyer: string, t: Transaction) {
  const [existing] = (await admin.entities.Purchase.filter({ transaction_id: t.transactionId })) || []
  const fields = {
    transaction_id: t.transactionId,
    original_transaction_id: t.originalTransactionId,
    product_id: t.productId,
    kind: PRODUCTS[t.productId],
    environment: t.environment,
    buyer,
    purchased_at: new Date(t.purchaseDate).toISOString(),
    expires_at: t.expiresDate ? new Date(t.expiresDate).toISOString() : null,
    revoked: Boolean(t.revocationDate),
  }
  if (!existing) return admin.entities.Purchase.create(fields)
  if (existing.buyer !== buyer) throw new Error('This purchase belongs to another Wishly account')
  // Apple can revoke a purchase later (a refund): keep that up to date.
  if (fields.revoked && !existing.revoked) await admin.entities.Purchase.update(existing.id, { revoked: true })
  return existing
}

// Pays for a new song: a plan song if one is left this month, else a single
// song. Returns what paid, or null when nothing is left.
export async function spendSong(admin: Admin, buyer: string, orderId: string): Promise<string | null> {
  const purchases = await purchasesOf(admin, buyer)
  const plan = activePlan(purchases)
  if (plan) {
    const key = planKey(plan)
    const used = ((await admin.entities.Order.filter({ paid_with: key })) || []).length
    if (used < SONGS_PER_MONTH) return key
  }
  const single = purchases
    .filter((p) => p.kind === 'song' && !p.used_by_order)
    .sort((a, b) => a.purchased_at.localeCompare(b.purchased_at))[0]
  if (single) {
    await admin.entities.Purchase.update(single.id, { used_by_order: orderId })
    return `song:${single.transaction_id}`
  }
  return PAYMENT_REQUIRED ? null : 'test'
}

// Run once the order holds its charge (`paid_with` saved). Requests sent at
// the same moment can each see the same song as still free, so count the
// orders holding this charge: over the limit, this order gives it back and
// the buyer tries again. True when the charge stands.
export async function confirmSpend(admin: Admin, paidWith: string, orderId: string): Promise<boolean> {
  if (paidWith === 'test') return true
  const limit = paidWith.startsWith('plan:') ? SONGS_PER_MONTH : 1
  const holders = (await admin.entities.Order.filter({ paid_with: paidWith })) || []
  if (holders.length <= limit) return true

  await admin.entities.Order.update(orderId, { paid_with: '' })
  if (paidWith.startsWith('song:')) {
    // The single song stays marked as used only by an order still holding it.
    const [p] = (await admin.entities.Purchase.filter({ transaction_id: paidWith.slice('song:'.length) })) || []
    if (p && p.used_by_order === orderId) {
      const [still] = ((await admin.entities.Order.filter({ paid_with: paidWith })) || []).filter((o: { id: string }) => o.id !== orderId)
      await admin.entities.Purchase.update(p.id, { used_by_order: still?.id ?? null })
    }
  }
  console.warn('confirmSpend: gave back a charge sent at the same moment', paidWith, orderId)
  return false
}
