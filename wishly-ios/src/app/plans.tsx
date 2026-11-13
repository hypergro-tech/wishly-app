// How to pay: one song, or a monthly or yearly plan with 3 songs a month.
// Opens from Create song when the buyer has no songs left, and from Profile.
// Apple asks a subscription screen to show each plan's length and price, how
// renewal and cancelling work, Restore purchases, and the Terms and Privacy.
import * as WebBrowser from 'expo-web-browser'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { Squish } from '@/components/motion'
import { Body, Button, Chip, CheckCircle, success, tap } from '@/components/ui'
import { PLANS, SONGS_PER_MONTH, formatPrice, pricePerSong, yearlySaving, type Plan, type PlanId } from '@/lib/catalog'
import { siteUrl } from '@/lib/site'
import { testStore, useWallet } from '@/lib/wallet'
import { colors, radius, shade, type } from '@/theme'

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? siteUrl('/terms')
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? siteUrl('/privacy')

const blurb = (p: Plan) =>
  p.per
    ? `${SONGS_PER_MONTH} songs every month · ${formatPrice(pricePerSong(p))} a song`
    : 'Just this song, with one correction round'

const priceLabel = (p: Plan) => (p.per ? `${formatPrice(p.price)}/${p.per === 'month' ? 'mo' : 'yr'}` : formatPrice(p.price))

const buttonLabel = (p: Plan) => (p.per ? `Subscribe for ${formatPrice(p.price)} a ${p.per}` : `Pay ${formatPrice(p.price)}`)

export default function Plans() {
  const { name, plan: preset } = useLocalSearchParams<{ name?: string; plan?: PlanId }>()
  const wallet = useWallet()
  const [chosen, setChosen] = useState<PlanId>(preset ?? 'song')
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null)
  const [done, setDone] = useState(false)
  const plan = PLANS.find((p) => p.id === chosen)!
  // A plan they already have isn't offered again.
  const options = PLANS.filter((p) => p.id !== wallet.plan?.id)

  async function buy() {
    setBusy('buy')
    try {
      await wallet.buy(chosen)
      setBusy(null)
      setDone(true)
      success()
      setTimeout(() => {
        router.back()
        wallet.runAfterPurchase()
      }, 450)
    } catch {
      setBusy(null)
      Alert.alert('Payment didn’t go through', 'Nothing was charged. Try again in a moment.')
    }
  }

  async function restore() {
    setBusy('restore')
    const found = await wallet.restore().catch(() => false)
    setBusy(null)
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
            <Squish
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.name}, ${p.per ? `${formatPrice(p.price)} a ${p.per}` : formatPrice(p.price)}. ${blurb(p)}`}
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
                  {p.id === 'yearly' && <Chip label={`Save ${yearlySaving()}%`} bg={colors.butter} />}
                </View>
                <Text style={[type.regular, { marginTop: 3, fontSize: 13, lineHeight: 18, color: colors.muted }]}>{blurb(p)}</Text>
              </View>
              <Text style={[type.bold, { fontSize: 17, color: colors.text }]}>{priceLabel(p)}</Text>
            </Squish>
          )
        })}
      </View>

      <Button label={buttonLabel(plan)} busy={busy === 'buy'} done={done} disabled={busy === 'restore'} onPress={buy} style={{ marginTop: 22 }} />
      {testStore && (
        <Body muted size={12} style={{ marginTop: 10, textAlign: 'center' }}>Test purchase. No money is taken yet.</Body>
      )}

      <Text style={[type.regular, { marginTop: 18, fontSize: 12, lineHeight: 17, color: colors.muted }]}>
        {plan.per
          ? `Charged to your Apple Account when you confirm. The ${plan.name.toLowerCase()} plan renews automatically at ${formatPrice(plan.price)} a ${plan.per} unless you cancel at least 24 hours before it renews. Cancel any time in your iPhone’s Settings under your name, then Subscriptions. Your ${SONGS_PER_MONTH} songs refill each month; unused songs don’t carry over.`
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
    <Pressable accessibilityRole="link" hitSlop={8} onPress={() => { tap(); onPress() }}>
      <Text style={[type.bold, { fontSize: 13, color: colors.text, textDecorationLine: 'underline' }]}>{label}</Text>
    </Pressable>
  )
}
