import { router, useFocusEffect } from 'expo-router'
import { useBottomTabBarHeight } from 'expo-router/js-tabs'
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { listOrders, type Order } from '@/api/orders'
import { useSession } from '@/api/session'
import { Logo } from '@/components/brand'
import Cover from '@/components/Cover'
import { ScrollHeader, useScrollHeader } from '@/components/glass'
import { ArrowIcon, PlayIcon } from '@/components/icons'
import { PlayPause, Squish } from '@/components/motion'
import { Accent, Body, Eyebrow, IconButton, Title, tap } from '@/components/ui'
import { CORE_PACKAGE, DELIVERY, EXAMPLES, OCCASION_TONES, formatPrice, type Example } from '@/lib/catalog'
import { useDraft } from '@/lib/draft'
import { openPlayer } from '@/lib/flight'
import { WELCOMED, seen } from '@/lib/once'
import { exampleTrack, usePlayer } from '@/lib/player'
import { orderCover, songTitle } from '@/lib/songs'
import { colors, tint, type, shade } from '@/theme'

const OCCASION_TILES = ['Birthday', 'Anniversary', "Mother's Day", 'Just because']
const TILE_COLOUR: Record<string, string> = { 'Just because': colors.coral }

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const weekday = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short' })

const STEPS = [
  { tint: colors.lilac, title: 'Tell us one memory', sub: 'The nickname, the joke, the Sunday ritual.' },
  { tint: colors.butter, title: 'We write and sing it', sub: `A one-minute song, ready in ${DELIVERY[0].days} days.` },
  { tint: colors.mint, title: 'You listen, check, then give', sub: 'Fix any name or fact before it’s sent.' },
]

export default function Home() {
  const insets = useSafeAreaInsets()
  const tabBar = useBottomTabBarHeight()
  const header = useScrollHeader(56)
  const { user } = useSession()
  const { draft, set } = useDraft()
  const player = usePlayer()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [firstName, setFirstName] = useState('')

  // First launch: show the welcome once, over Home.
  useEffect(() => { seen(WELCOMED).then((done) => { if (!done) router.push('/welcome') }) }, [])

  useFocusEffect(useCallback(() => {
    if (!user) setOrders([]) // Songs belong to an account.
    else listOrders().then(setOrders).catch(() => setOrders([]))
  }, [user]))

  const all = orders ?? []
  const firstVisit = orders !== null && orders.length === 0
  const ready = all.find((o) => o.status === 'ready_for_review')
  const working = all.filter((o) => o.status === 'in_production' || o.status === 'correction_requested').slice(0, 2)
  const first = user?.full_name ? user.full_name.split(' ')[0] : null

  const startFor = (occasion: string) => {
    set('occasion', occasion)
    router.navigate('/create')
  }

  const startWith = () => {
    if (!firstName.trim()) return
    set('recipient', { name: firstName.trim() })
    setFirstName('')
    router.navigate('/create')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={header.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: tabBar + 32 }}
        scrollIndicatorInsets={{ bottom: tabBar }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size={25} />
          {user ? (
            <Squish
              accessibilityRole="button"
              accessibilityLabel="Your account"
              to={0.9}
              onPress={() => { tap(); router.push('/account') }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={[type.bold, { fontSize: 15, color: colors.ink }]}>{(first ?? user.email)[0].toUpperCase()}</Text>
            </Squish>
          ) : (
            <Squish
              accessibilityRole="button"
              to={0.94}
              onPress={() => { tap(); router.push('/sign-in') }}
              style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: shade(0.28), justifyContent: 'center', backgroundColor: pressed ? colors.fill : 'transparent' })}
            >
              <Text style={[type.bold, { fontSize: 14, color: colors.text }]}>Sign in</Text>
            </Squish>
          )}
        </View>

        <Title style={{ marginTop: 20, marginHorizontal: 20 }}>
          {firstVisit ? 'Welcome to Wishly' : first ? `${greeting()}, ${first}` : greeting()}
        </Title>

        {firstVisit && (
          <>
            <View style={{ marginTop: 16, marginHorizontal: 16, padding: 18, borderRadius: 22, backgroundColor: colors.surface }}>
              <Eyebrow color={colors.coral}>Your first song</Eyebrow>
              {draft.recipient.name.trim() ? (
                <>
                  <Text style={[type.bold, { marginTop: 8, fontSize: 24, lineHeight: 28, color: colors.text }]}>A song for {draft.recipient.name}</Text>
                  <Body muted size={14} style={{ marginTop: 4 }}>Your details are saved. Pick up where you left off.</Body>
                  <Squish
                    accessibilityRole="button"
                    to={0.95}
                    onPress={() => { tap(); router.navigate('/create') }}
                    style={({ pressed }) => ({ marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: 999, backgroundColor: pressed ? colors.coralPressed : colors.coral })}
                  >
                    <Text style={[type.bold, { fontSize: 15, color: colors.ink }]}>Carry on</Text>
                    <ArrowIcon size={18} />
                  </Squish>
                </>
              ) : (
                <>
                  <Text style={[type.bold, { marginTop: 8, fontSize: 24, lineHeight: 28, color: colors.text }]}>Who’s it for?</Text>
                  <View style={{ marginTop: 14, flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      onSubmitEditing={startWith}
                      returnKeyType="go"
                      placeholder="Their name, e.g. Grace"
                      placeholderTextColor={shade(0.45)}
                      keyboardAppearance="dark"
                      selectionColor={colors.coral}
                      autoCapitalize="words"
                      autoCorrect={false}
                      accessibilityLabel="Their name"
                      style={[type.bold, { flex: 1, height: 56, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: shade(0.14), backgroundColor: colors.fill, color: colors.text, fontSize: 18 }]}
                    />
                    <Squish
                      accessibilityRole="button"
                      accessibilityLabel="Start their song"
                      accessibilityState={{ disabled: !firstName.trim() }}
                      to={0.9}
                      pop={Boolean(firstName.trim())}
                      onPress={() => { tap(); startWith() }}
                      style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.coralPressed : colors.coral, opacity: firstName.trim() ? 1 : 0.5, transitionProperty: 'opacity', transitionDuration: 200 })}
                    >
                      <ArrowIcon />
                    </Squish>
                  </View>
                  <Body muted size={13} style={{ marginTop: 12 }}>About five minutes. No account needed to start.</Body>
                </>
              )}
            </View>

            <Text accessibilityRole="header" style={[type.bold, { marginTop: 30, marginHorizontal: 20, fontSize: 21, color: colors.text }]}>How it works</Text>
            <View style={{ marginTop: 12, marginHorizontal: 16, gap: 8 }}>
              {STEPS.map((step, i) => (
                <View key={step.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.surface }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: step.tint, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[type.bold, { fontSize: 15, color: colors.ink }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.bold, { fontSize: 16, color: colors.text }]}>{step.title}</Text>
                    <Text style={[type.regular, { marginTop: 2, fontSize: 14, color: colors.muted }]}>{step.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Body muted size={13} style={{ marginTop: 12, marginHorizontal: 20 }}>
              {formatPrice(CORE_PACKAGE.price)} · one correction round included · no subscription
            </Body>
          </>
        )}

        {ready && (
          <Squish
            accessibilityRole="button"
            onPress={() => { tap(); router.push(`/song/${ready.id}`) }}
            style={{ marginTop: 16, marginHorizontal: 20, padding: 14, borderRadius: 22, backgroundColor: colors.surface, flexDirection: 'row', gap: 14, alignItems: 'center' }}
          >
            <Cover spec={orderCover(ready)} size={96} />
            <View style={{ flex: 1 }}>
              <Eyebrow color={colors.coral}>Ready to listen and check</Eyebrow>
              <Text style={[type.bold, { fontSize: 19, lineHeight: 23, color: colors.text, marginTop: 6 }]}>A song for {ready.recipient.name}</Text>
              <Text style={[type.regular, { fontSize: 14, color: colors.muted, marginTop: 2 }]}>{ready.occasion} · from you</Text>
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.coral }}>
                <PlayIcon size={11} color={colors.ink} />
                <Text style={[type.bold, { fontSize: 14, color: colors.ink }]}>Listen</Text>
              </View>
            </View>
          </Squish>
        )}

        {working.map((o) => (
          <Squish
            key={o.id}
            accessibilityRole="button"
            onPress={() => { tap(); router.push(`/song/${o.id}`) }}
            style={{ marginTop: 10, marginHorizontal: 20, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, flexDirection: 'row', gap: 12, alignItems: 'center' }}
          >
            <Cover spec={{ ...orderCover(o), name: '' }} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={[type.bold, { fontSize: 15, color: colors.text }]}>
                {o.status === 'correction_requested' ? `Making your correction to ${songTitle(o)}` : `Writing ${o.recipient.name}’s song`}
              </Text>
              <View style={{ marginTop: 8, height: 4, borderRadius: 2, backgroundColor: shade(0.12) }}>
                <View style={{ width: o.status === 'correction_requested' ? '75%' : '40%', height: 4, borderRadius: 2, backgroundColor: tint(orderCover(o).tint) }} />
              </View>
            </View>
            <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}>Ready {weekday(o.ready_by)}</Text>
          </Squish>
        ))}

        <Text accessibilityRole="header" style={[type.bold, { marginTop: 30, marginHorizontal: 20, fontSize: 21, color: colors.text }]}>Hear a Wishly song</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={170}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingTop: 14 }}
        >
          {EXAMPLES.filter((e) => e.photo).map((e) => <ExampleCard key={e.id} example={e} />)}
        </ScrollView>

        <Text accessibilityRole="header" style={[type.bold, { marginTop: 32, marginHorizontal: 20, fontSize: 21, color: colors.text }]}>Start a song for…</Text>
        <View style={{ marginTop: 14, marginHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {OCCASION_TILES.map((o) => (
            <Squish
              key={o}
              accessibilityRole="button"
              to={0.95}
              onPress={() => { tap(); startFor(o) }}
              style={{ width: '48%', flexGrow: 1, height: 118, padding: 14, borderRadius: 18, justifyContent: 'space-between', backgroundColor: TILE_COLOUR[o] ?? tint(OCCASION_TONES[o].tint) }}
            >
              <Text style={[type.bold, { fontSize: 20, color: colors.ink }]}>{o.replace("'", '’')}</Text>
              <Accent size={14} style={{ color: colors.ink, lineHeight: 18 }}>{OCCASION_TONES[o].line}</Accent>
            </Squish>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => { tap(); router.navigate('/create') }} hitSlop={10} style={{ marginTop: 14, marginHorizontal: 20, alignSelf: 'flex-start' }}>
          <Text style={[type.bold, { fontSize: 14, color: colors.muted }]}>All occasions</Text>
        </Pressable>

        <Text accessibilityRole="header" style={[type.bold, { marginTop: 32, marginHorizontal: 20, fontSize: 21, color: colors.text }]}>More examples</Text>
        <View style={{ marginTop: 8, marginHorizontal: 20 }}>
          {EXAMPLES.filter((e) => !e.photo).map((e, i, all) => {
            const t = exampleTrack(e)
            const on = player.track?.key === t.key && player.playing
            return (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: i < all.length - 1 ? 1 : 0, borderBottomColor: shade(0.08) }}>
                <Cover spec={t.cover} size={56} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[type.bold, { fontSize: 16, color: colors.text }]}>{e.title}</Text>
                  <Text numberOfLines={1} style={[type.regular, { fontSize: 13, color: colors.muted, marginTop: 2 }]}>For {e.coverName} · {e.tags[0]} · {e.tags[2]}</Text>
                </View>
                <IconButton label={on ? `Pause ${e.title}` : `Play ${e.title}`} onPress={() => (on ? player.pause() : player.play(t))} style={{ backgroundColor: shade(0.08) }}>
                  <PlayPause playing={on} size={16} />
                </IconButton>
              </View>
            )
          })}
        </View>
        <Text style={[type.regular, { marginTop: 10, marginHorizontal: 20, fontSize: 12, color: colors.muted }]}>Example songs and illustrative photography, not customer stories.</Text>
      </ScrollView>
      <ScrollHeader title="Home" solid={header.solid} />
    </View>
  )
}

// Tapping a cover plays it and grows it into the full player.
function ExampleCard({ example: e }: { example: Example }) {
  const player = usePlayer()
  const cover = useRef<ComponentRef<typeof View>>(null)
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={`Play ${e.title}`}
      onPress={() => { tap(); player.play(exampleTrack(e)); openPlayer(cover.current) }}
      style={{ width: 156 }}
    >
      <View ref={cover}><Cover spec={exampleTrack(e).cover} size={156} /></View>
      <Text numberOfLines={1} style={[type.bold, { fontSize: 15, color: colors.text, marginTop: 10 }]}>{e.title}</Text>
      <Text numberOfLines={1} style={[type.regular, { fontSize: 13, color: colors.muted, marginTop: 2 }]}>{e.tags.slice(0, 2).join(' · ')}</Text>
    </Squish>
  )
}
