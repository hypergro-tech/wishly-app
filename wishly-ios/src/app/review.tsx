import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'

import { placeOrder } from '@/api/orders'
import { useSession, type User } from '@/api/session'
import { Spark } from '@/components/brand'
import Cover from '@/components/Cover'
import { Squish } from '@/components/motion'
import { Accent, Body, Button, Card, CheckCircle, Footer, SpeakPill, success, tap } from '@/components/ui'
import { CORE_PACKAGE, DELIVERY, EXTRAS, MOODS, OCCASION_TONES, formatDate, formatPrice, quote } from '@/lib/catalog'
import { filledMemories, useDraft } from '@/lib/draft'
import { wait } from '@/lib/motion'
import { shouldAskForNotifications } from '@/lib/notifications'
import { pronoun } from '@/lib/songs'
import { quoted } from '@/lib/text'
import { colors, type } from '@/theme'

// The labels read as if about one person ("Something she does").
const ABOUT: Record<string, (p: string, s: string) => string> = {
  ritual: (_, s) => (s === 'they' ? 'Something they do' : `Something ${s} does`),
  inside_joke: (_, s) => (s === 'they' ? 'What they always say' : `What ${s} always says`),
  nickname: (p) => `Only you call ${p}`,
  memory: () => 'A moment you remember',
  want_to_say: (p) => `What you’d tell ${p}`,
}

export default function Review() {
  const { draft, set, reset } = useDraft()
  const { user, setAfterSignIn } = useSession()
  const [confirmed, setConfirmed] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const r = draft.recipient
  const q = quote(draft.package)
  const her = pronoun(draft, 'her')
  const she = pronoun(draft, 'she')
  const mood = MOODS.find((m) => m.id === draft.music.mood)?.label

  // Sign-in is asked here, once, so the song is saved to an account; the song
  // is placed as soon as it succeeds.
  function create() {
    if (user) return place(user)
    setAfterSignIn(place)
    router.push({ pathname: '/sign-in', params: { name: r.name } })
  }

  async function place(buyer: User) {
    setPlacing(true)
    try {
      // The button turns into a spinner, then a tick, before the song opens.
      const [order] = await Promise.all([
        placeOrder({ ...draft, buyer: { name: buyer.full_name && buyer.full_name !== 'You' ? buyer.full_name : '', email: buyer.email } }),
        wait(700),
      ])
      setPlacing(false)
      setPlaced(true)
      success()
      await wait(550)
      reset()
      router.replace(`/song/${order.id}`)
      if (await shouldAskForNotifications()) {
        const day = new Date(order.ready_by).toLocaleDateString('en-US', { weekday: 'long' })
        router.push({ pathname: '/notify', params: { name: order.recipient.name, day } })
      }
    } catch {
      Alert.alert('We couldn’t create your song', 'Check your connection and try again. Nothing has been charged.')
      setPlacing(false)
    }
  }

  const ready = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return formatDate(d.toISOString())
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <Cover spec={{ name: r.name, tint: OCCASION_TONES[draft.occasion]?.tint ?? 'lilac' }} size={200} shadow />
        </View>
        <Text accessibilityRole="header" style={[type.bold, { marginTop: 18, textAlign: 'center', fontSize: 22, color: colors.text }]}>A song for {r.name}</Text>
        <Body muted size={14} style={{ marginTop: 4, textAlign: 'center' }}>
          {[draft.occasion, mood, draft.music.genre, draft.music.language].filter(Boolean).join(' · ')}
        </Body>

        <Card style={{ marginTop: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[type.bold, { fontSize: 19, color: colors.text }]}>Check the details</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit the details" hitSlop={12} onPress={() => { tap(); router.back() }}>
              <Text style={[type.bold, { fontSize: 15, color: colors.text, textDecorationLine: 'underline', textDecorationColor: colors.coral }]}>Edit</Text>
            </Pressable>
          </View>
          <Text style={[type.bold, { marginTop: 14, fontSize: 28, letterSpacing: -0.5, color: colors.text }]}>{r.name}</Text>
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Body muted style={{ flex: 1 }}>Sung as “{r.pronunciation || r.name}” · your {r.relationship.toLowerCase()}</Body>
            <SpeakPill text={r.pronunciation || r.name} />
          </View>
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line, gap: 12 }}>
            {filledMemories(draft).map((m) => (
              <View key={m.key}>
                <Text style={[type.regular, { fontSize: 12, color: colors.muted }]}>{ABOUT[m.key]?.(her, she) ?? m.title}</Text>
                <Accent style={{ marginTop: 3 }}>{quoted(draft.memories[m.key])}</Accent>
              </View>
            ))}
            {draft.memories.avoid?.trim() ? <Body size={14}>Leave out: {draft.memories.avoid}</Body> : null}
          </View>
        </Card>

        <View style={{ marginTop: 12, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable accessible={false} onPress={() => { tap(); setConfirmed(!confirmed) }} style={{ flex: 1 }}>
            <Body>I’ve checked the name and the facts. I’ll hear the song before it’s given.</Body>
          </Pressable>
          <Switch
            value={confirmed}
            onValueChange={(v) => { tap(); setConfirmed(v) }}
            trackColor={{ true: colors.coral, false: 'rgba(255,250,245,0.2)' }}
            accessibilityLabel="I’ve checked the name and the facts. I’ll hear the song before it’s given."
          />
        </View>

        <Card style={{ marginTop: 12, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[type.bold, { fontSize: 19, color: colors.text }]}>{CORE_PACKAGE.name}</Text>
            <Text style={[type.bold, { fontSize: 19, color: colors.text }]}>{formatPrice(CORE_PACKAGE.price)}</Text>
          </View>
          <Body muted size={14}>A complete 2½–3 minute song, a private page {she} opens without an account, and one correction round.</Body>

          <View accessibilityRole="radiogroup" accessibilityLabel="When it’s ready" style={{ flexDirection: 'row', gap: 8 }}>
            {DELIVERY.map((d) => {
              const on = draft.package.delivery === d.id
              return (
                <Squish
                  key={d.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  pop={on}
                  onPress={() => { tap(); set('package', { delivery: d.id }) }}
                  style={{ flex: 1, padding: 12, borderRadius: 16, borderWidth: 2, borderColor: on ? colors.text : 'transparent', backgroundColor: colors.fill, transitionProperty: 'borderColor', transitionDuration: 180 }}
                >
                  <Text style={[type.bold, { fontSize: 15, color: colors.text }]}>{d.label}</Text>
                  <Text style={[type.regular, { fontSize: 13, color: colors.muted, marginTop: 3 }]}>{d.price ? `+${formatPrice(d.price)}` : 'Included'} · {ready(d.days)}</Text>
                </Squish>
              )
            })}
          </View>

          <View>
            {EXTRAS.map((e) => {
              const on = draft.package.extras.includes(e.id)
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${e.label}, ${formatPrice(e.price)}`}
                  onPress={() => { tap(); set('package', { extras: on ? draft.package.extras.filter((x) => x !== e.id) : [...draft.package.extras, e.id] }) }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[type.bold, { fontSize: 15, color: colors.text }]}>{e.label}</Text>
                    <Text style={[type.regular, { fontSize: 13, color: colors.muted, marginTop: 2 }]}>{e.blurb}</Text>
                  </View>
                  <Text style={[type.bold, { fontSize: 14, color: colors.text }]}>+{formatPrice(e.price)}</Text>
                  <CheckCircle checked={on} />
                </Pressable>
              )
            })}
          </View>
        </Card>
        <Body muted size={12} style={{ marginTop: 12, textAlign: 'center' }}>Demo checkout. No payment is taken yet.</Body>
      </ScrollView>

      <Footer>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.bold, { fontSize: 26, color: colors.text }]}>{formatPrice(q.total)}</Text>
            <Text style={[type.regular, { fontSize: 13, color: colors.muted, marginTop: 2 }]}>Ready by {formatDate(q.readyBy)}</Text>
          </View>
          <Button
            label="Create song"
            icon={<Spark size={18} color={colors.ink} />}
            disabled={!confirmed}
            busy={placing}
            done={placed}
            onPress={create}
            style={{ paddingHorizontal: 26 }}
          />
        </View>
      </Footer>
    </View>
  )
}
