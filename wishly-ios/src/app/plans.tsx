// How to pay: one song, or a monthly or yearly plan with 3 songs a month.
// Opens from Create song when the buyer has no songs left, and from Profile.
// Apple asks a subscription screen to show each plan's length and price, how
// renewal and cancelling work, Restore purchases, and the Terms and Privacy.
import { track, trackFailure } from '@/lib/analytics'
import * as WebBrowser from 'expo-web-browser'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { Squish } from '@/components/motion'
import { Body, Button, Chip, CheckCircle, success, tap } from '@/components/ui'
import { PLANS, SONGS_PER_MONTH, formatPrice, pricePerSong, yearlySaving, type Plan, type PlanId, type Price } from '@/lib/catalog'
import { PRIVACY_URL, TERMS_URL } from '@/lib/site'
import { PurchaseCancelled, SignInFirst, useWallet } from '@/lib/wallet'
import { colors, radius, shade, type } from '@/theme'


// Prices are Apple's for the buyer's App Store country (wallet.price).
const blurb = (p: Plan, price: Price) =>
  p.per
    ? `${SONGS_PER_MONTH} songs every month${price.amount != null ? ` · ${formatPrice(pricePerSong(p, price.amount), price.currency)} a song` : ''}`
    : 'Just this song, with one correction round'

const priceLabel = (p: Plan, price: Price) => (p.per ? `${price.label}/${p.per === 'month' ? 'mo' : 'yr'}` : price.label)

const buttonLabel = (p: Plan, price: Price) => (p.per ? `Subscribe for ${price.label} a ${p.per}` : `Pay ${price.label}`)

export default function Plans() {
  const { name, plan: preset } = useLocalSearchParams<{ name?: string; plan?: PlanId }>()
  const wallet = useWallet()
  // From Review (a song waiting) the single song comes first; from Profile's
  // "See plans" the person is looking at plans, so the monthly plan does.
  const [chosen, setChosen] = useState<PlanId>(preset ?? (name ? 'song' : 'monthly'))
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null)
  const [done, setDone] = useState(false)
  const plan = PLANS.find((p) => p.id === chosen)!
  const price = wallet.price
  // Yearly against twelve months, in the buyer's own currency when both are known.
  const year = price('yearly'), month = price('monthly')
  const saving = year.amount != null && month.amount != null && year.currency === month.currency ? yearlySaving(year.amount, month.amount) : yearlySaving()
  // A plan they already have isn't offered again.
  const options = PLANS.filter((p) => p.id !== wallet.plan?.id)

  async function buy() {
    setBusy('buy')
    track('purchase_started', { plan: chosen })
    try {
      await wallet.buy(chosen)
      track('purchase_done', { plan: chosen })
      setBusy(null)
      setDone(true)
      success()
      setTimeout(() => {
        router.back()
        wallet.runAfterPurchase()
      }, 450)
    } catch (e) {
      setBusy(null)
      if (e instanceof PurchaseCancelled) return track('purchase_cancelled', { plan: chosen }) // They closed Apple's sheet.
      if (e instanceof SignInFirst) return router.push('/sign-in')
      trackFailure('purchase', e)
      Alert.alert('Payment didn’t go through', 'Nothing was charged. Try again in a moment.')
    }
  }

  async function restore() {
    setBusy('restore')
    let found = false
    try {
      found = await wallet.restore()
    } catch (e) {
      setBusy(null)
      if (e instanceof SignInFirst) return router.push('/sign-in')
    }
    setBusy(null)
    track('restore', { found })
    if (found) {
      success()
      router.back()
      wallet.runAfterPurchase()
    } else {
      Alert.alert('Nothing to restore', 'We couldn’t find a Wishly plan or song bought with this Apple Account.')
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 26, paddingBottom: 32 }}>
      <Text accessibilityRole="header" style={[type.bold, { fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: colors.text }]}>
        {name ? `One step to ${name}’s song` : 'Choose how to pay'}
      </Text>
      <Body muted size={15} style={{ marginTop: 6, lineHeight: 21 }}>
        Pay for one song, or join a plan if you make songs for lots of people.
      </Body>

      <View accessibilityRole="radiogroup" style={{ marginTop: 20, gap: 10 }}>
        {options.map((p) => {
          const on = p.id === chosen
          return (
            <Squish ph-label={`Plan: ${p.name}`}
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.name}, ${p.per ? `${price(p.id).label} a ${p.per}` : price(p.id).label}. ${blurb(p, price(p.id))}`}
              onPress={() => { tap(); setChosen(p.id) }}
              style={{
                padding: 16,
                borderRadius: radius.card,
                borderWidth: on ? 2 : 1,
                borderColor: on ? colors.coral : shade(0.16),
                margin: on ? 0 : 1, // keeps the card the same size when the border thickens
                backgroundColor: on ? 'rgba(255,107,122,0.06)' : colors.surface,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <CheckCircle checked={on} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[type.bold, { fontSize: 17, color: colors.text }]}>{p.name}</Text>
                  {p.id === 'yearly' && <Chip label={`Save ${saving}%`} bg={colors.butter} />}
                  {p.was ? <Chip label="Launch offer" bg={colors.butter} /> : null}
                </View>
                <Text style={[type.regular, { marginTop: 3, fontSize: 13, lineHeight: 18, color: colors.muted }]}>{blurb(p, price(p.id))}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {p.was ? (
                  <Text accessibilityLabel={`was ${formatPrice(p.was)}`} style={[type.regular, { fontSize: 14, color: colors.muted, textDecorationLine: 'line-through' }]}>{formatPrice(p.was)}</Text>
                ) : null}
                <Text style={[type.bold, { fontSize: 17, color: colors.text }]}>{priceLabel(p, price(p.id))}</Text>
              </View>
            </Squish>
          )
        })}
      </View>

      <Button label={buttonLabel(plan, price(plan.id))} busy={busy === 'buy'} done={done} disabled={busy === 'restore'} onPress={buy} style={{ marginTop: 22 }} />
      {wallet.isTest && (
        <Body muted size={12} style={{ marginTop: 10, textAlign: 'center' }}>Test purchase. No money is taken yet.</Body>
      )}

      <Text style={[type.regular, { marginTop: 18, fontSize: 12, lineHeight: 17, color: colors.muted }]}>
        {plan.per
          ? `Charged to your Apple Account when you confirm. The ${plan.name.toLowerCase()} plan renews automatically at ${price(plan.id).label} a ${plan.per} unless you cancel at least 24 hours before it renews. Cancel any time in your iPhone’s Settings under your name, then Subscriptions. Your ${SONGS_PER_MONTH} songs refill each month; unused songs don’t carry over.`
          : 'Charged once to your Apple Account when you confirm. No subscription.'}
      </Text>

      <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
        <Link label={busy === 'restore' ? 'Restoring…' : 'Restore purchases'} onPress={restore} />
        <Link label="Terms of Use" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
        <Link label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
      </View>
    </ScrollView>
  )
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable ph-label={label} accessibilityRole="link" hitSlop={8} onPress={() => { tap(); onPress() }}>
      <Text style={[type.bold, { fontSize: 13, color: colors.text, textDecorationLine: 'underline' }]}>{label}</Text>
    </Pressable>
  )
}
