import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'

import { placeOrder, rememberPushToken } from '@/api/orders'
import { useSession, type User } from '@/api/session'
import { Spark } from '@/components/brand'
import Cover from '@/components/Cover'
import { Accent, Body, Button, Card, CheckCircle, Footer, SpeakPill, success, tap } from '@/components/ui'
import { CORE_PACKAGE, EXTRAS, MOODS, OCCASION_TONES, formatPrice } from '@/lib/catalog'
import { filledMemories, useDraft } from '@/lib/draft'
import { wait } from '@/lib/motion'
import { shouldAskForNotifications } from '@/lib/notifications'
import { pronoun } from '@/lib/songs'
import { generateSongPayload, songInputs } from '@shared/songPipeline'
import { quoted } from '@/lib/text'
import { useWallet } from '@/lib/wallet'
import { colors, type, shade } from '@/theme'

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
  const wallet = useWallet()
  const [confirmed, setConfirmed] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const r = draft.recipient
  const her = pronoun(draft, 'her')
  const she = pronoun(draft, 'she')
  const mood = MOODS.find((m) => m.id === draft.music.mood)?.label

  // Sign-in is asked here, once, so the song is saved to an account. Then,
  // with no songs left, the plans screen; the song is placed as soon as both
  // are done.
  function create() {
    if (user) return pay(user)
    setAfterSignIn(pay)
    router.push({ pathname: '/sign-in', params: { name: r.name } })
  }

  function pay(buyer: User) {
    if (wallet.songsLeft > 0) return place(buyer)
    wallet.setAfterPurchase(() => place(buyer))
    router.push({ pathname: '/plans', params: { name: r.name } })
  }

  async function place(buyer: User) {
    setPlacing(true)
    try {
      const brief = { ...draft, buyer: { name: buyer.full_name && buyer.full_name !== 'You' ? buyer.full_name : '', email: buyer.email } }
      // The chosen mood, style, voice and story become the singer's sound tags
      // and the lyrics brief.
      const payload = generateSongPayload(songInputs(brief))
      // The button turns into a spinner, then a tick, before the song opens.
      const [order] = await Promise.all([
        placeOrder(brief, payload),
        wait(700),
      ])
      await wallet.spendSong().catch(() => {})
      setPlacing(false)
      setPlaced(true)
      success()
      await wait(550)
      reset()
      router.replace(`/song/${order.id}`)
      if (await shouldAskForNotifications()) router.push({ pathname: '/notify', params: { name: order.recipient.name, id: order.id } })
      else rememberPushToken(order.id)
    } catch {
      Alert.alert('We couldn’t create your song', 'Check your connection and try again. Nothing has been charged.')
      setPlacing(false)
    }
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
            trackColor={{ true: colors.coral, false: shade(0.2) }}
            accessibilityLabel="I’ve checked the name and the facts. I’ll hear the song before it’s given."
          />
        </View>

        <Card style={{ marginTop: 12, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[type.bold, { fontSize: 19, color: colors.text }]}>{CORE_PACKAGE.name}</Text>
            <Text style={[type.bold, { fontSize: 19, color: colors.text }]}>{wallet.songsLeft > 0 ? 'Paid' : formatPrice(CORE_PACKAGE.price)}</Text>
          </View>
          <Body muted size={14}>A one-minute song, a private page {she} can open without an account, and one free correction.</Body>
          <Body muted size={14}>
            {wallet.songsLeft > 0
              ? `Uses 1 of your ${wallet.songsLeft} song${wallet.songsLeft === 1 ? '' : 's'} left.`
              : 'Or join a plan with 3 songs every month.'}
          </Body>

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
      </ScrollView>

      <Footer>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.bold, { fontSize: 26, color: colors.text }]}>
              {wallet.songsLeft > 0 ? `${wallet.songsLeft} song${wallet.songsLeft === 1 ? '' : 's'} left` : formatPrice(CORE_PACKAGE.price)}
            </Text>
            <Text style={[type.regular, { fontSize: 13, color: colors.muted, marginTop: 2 }]}>Ready in a few minutes</Text>
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
