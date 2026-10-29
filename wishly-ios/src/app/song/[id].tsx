import * as Clipboard from 'expo-clipboard'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native'
import Animated, { useReducedMotion } from 'react-native-reanimated'

import { realSongs, showDemoTools } from '@/api/base44Client'
import { applyCorrection, finishProduction, getOrder, giftUrl, type Order } from '@/api/orders'
import { Rhythm, Ribbon, Spark } from '@/components/brand'
import Cover from '@/components/Cover'
import { EmailIcon, LinkIcon, MessageIcon, MoreIcon } from '@/components/icons'
import { Burst, Glow, Squish } from '@/components/motion'
import { BigPlay, LyricView, Scrubber, useFollowLyrics } from '@/components/playback'
import { Accent, Body, Button, Card, CheckCircle, Chip, Eyebrow, Footer, say, success, tap } from '@/components/ui'
import { MOODS, OCCASION_TONES, formatDate } from '@/lib/catalog'
import { usePop } from '@/lib/motion'
import { markSeen, seen } from '@/lib/once'
import { usePlayer, useTrack } from '@/lib/player'
import { orderCover, orderTrack, pronoun, songTitle } from '@/lib/songs'
import { quoted } from '@/lib/text'
import { colors, tint, type } from '@/theme'

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)

  // Reload when coming back, e.g. after a correction or message sheet closes.
  useFocusEffect(useCallback(() => { getOrder(id).then(setOrder, () => setMissing(true)) }, [id]))

  const run = async (fn: () => Promise<Order>) => {
    setBusy(true)
    try { setOrder(await fn()); success() } finally { setBusy(false) }
  }

  // While the backend sings and checks the song, look again every few seconds.
  const making = realSongs && (order?.status === 'in_production' || order?.status === 'correction_requested')
  useEffect(() => {
    if (!making) return
    const timer = setInterval(() => { getOrder(id).then(setOrder, () => {}) }, 8000)
    return () => clearInterval(timer)
  }, [making, id])

  if (missing) return <Centered><Body muted>We couldn’t find that song.</Body></Centered>
  if (!order) return <Centered><ActivityIndicator color={colors.muted} /></Centered>

  if (order.status === 'in_production' || order.status === 'correction_requested') {
    const correcting = order.status === 'correction_requested'
    return (
      <Writing
        order={order}
        demo={showDemoTools && (
          <Button
            label={correcting ? 'Deliver the corrected version (demo)' : 'Finish the song now (demo)'}
            variant="ghost"
            size="md"
            busy={busy}
            onPress={() => run(() => (correcting ? applyCorrection(order) : finishProduction(order)))}
            style={{ marginTop: 16 }}
          />
        )}
      />
    )
  }
  return order.status === 'ready_for_review' ? <Check order={order} /> : <Give order={order} />
}

// `celebrate`: the cover springs in with a burst of sparks, or for gentle
// occasions (a memorial, a farewell) only glows softly. `ribbon` wraps behind
// it, its ends showing either side.
function Header({ order, size, badge, celebrate, ribbon }: { order: Order; size: number; badge?: ReactNode; celebrate?: boolean; ribbon?: ReactNode }) {
  const gentle = Boolean(OCCASION_TONES[order.occasion]?.gentle)
  const pop = usePop(Boolean(celebrate) && !gentle, 0.72)
  return (
    <>
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        {ribbon ? <View pointerEvents="none" style={{ position: 'absolute', top: size * 0.21 }}>{ribbon}</View> : null}
        <Glow on={Boolean(celebrate) && gentle} radius={Math.round(size * 0.09)}>
          <Animated.View style={pop}>
            <Cover spec={{ ...orderCover(order), caption: `for ${order.recipient.name}` }} size={size} shadow badge={badge} />
          </Animated.View>
        </Glow>
        {celebrate && !gentle ? <Burst /> : null}
      </View>
      <Text accessibilityRole="header" style={[type.bold, { marginTop: 18, textAlign: 'center', fontSize: 26, letterSpacing: -0.5, color: colors.text }]}>{songTitle(order)}</Text>
      <Body muted size={14} style={{ marginTop: 4, textAlign: 'center' }}>A song for {order.recipient.name} · version {order.song_version}</Body>
    </>
  )
}

function Writing({ order, demo }: { order: Order; demo: ReactNode }) {
  const correcting = order.status === 'correction_requested'
  const cover = orderCover(order)
  const stages = [
    ['Brief', 'done'],
    [correcting ? 'Correcting' : 'Writing', 'now'],
    ['You check', 'next'],
    ['Ready', 'next'],
  ]
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      <View style={{ alignSelf: 'center', marginTop: 12, width: 280, height: 280, borderRadius: 22, padding: 20, backgroundColor: tint(cover.tint), justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Spark size={32} spin />
          <Chip label={correcting ? 'Correcting' : 'Writing'} bg={colors.ink} fg={tint(cover.tint)} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[type.bold, { fontSize: 52, letterSpacing: -1.4, color: colors.ink }]}>{order.recipient.name}</Text>
        <Rhythm height={40} on="rgba(20,52,56,0.75)" live />
      </View>

      <Text accessibilityRole="header" style={[type.bold, { marginTop: 18, textAlign: 'center', fontSize: 24, color: colors.text }]}>A song for {order.recipient.name}</Text>
      <Body muted size={14} style={{ marginTop: 4, textAlign: 'center' }}>
        {[order.occasion, MOODS.find((m) => m.id === order.music.mood)?.label, order.music.genre].filter(Boolean).join(' · ')}
      </Body>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 22, marginHorizontal: 4 }}>
        {stages.map(([label, state]) => (
          <View key={label} style={{ flex: 1 }}>
            <View style={{ height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: state === 'done' ? colors.text : state === 'now' ? colors.coral : 'rgba(255,250,245,0.15)' }}>
              {state === 'now' && <Sheen />}
            </View>
            <Text style={[state === 'next' ? type.regular : type.bold, { fontSize: 12, marginTop: 7, color: state === 'next' ? colors.muted : colors.text }]}>{label}</Text>
          </View>
        ))}
      </View>

      <Card style={{ marginTop: 22 }}>
        <Text style={[type.bold, { fontSize: 19, color: colors.text }]}>
          {correcting ? 'We’re making your correction.' : `We’re writing ${order.recipient.name}’s song.`}
        </Text>
        {correcting ? (
          <Body muted style={{ marginTop: 8 }}>
            You asked: <Text style={[type.accent, { color: colors.text }]}>“{order.corrections.at(-1)?.note || 'Updated details'}”</Text>. You’ll hear the new version before anything is given.
          </Body>
        ) : (
          <Body muted style={{ marginTop: 8 }}>
            It will be ready for you to listen and check by <Text style={[type.bold, { color: colors.text }]}>{formatDate(order.ready_by)}</Text>. Nothing is given until you’ve heard it.
          </Body>
        )}
      </Card>
      {demo}
    </ScrollView>
  )
}

function Check({ order }: { order: Order }) {
  const player = usePlayer()
  const track = orderTrack(order)!
  const now = useTrack(track.key)
  const [ticks, setTicks] = useState<boolean[]>([false, false, false])
  const [celebrate, setCelebrate] = useState(false)
  const follow = useFollowLyrics()
  const her = pronoun(order, 'her')
  const toggle = (i: number) => setTicks((t) => t.map((v, j) => (j === i ? !v : v)))
  const allChecked = ticks.every(Boolean)

  // The first time this song is ready, celebrate it once.
  useEffect(() => {
    const key = `wishly:ready:${order.id}`
    seen(key).then((done) => {
      if (done) return
      markSeen(key)
      setCelebrate(true)
      success()
    })
  }, [order.id])

  const items = [
    `${order.recipient.name} is sung the way you say it`,
    'The details and facts are right',
    `Nothing feels off for ${her}`,
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView {...follow.scrollProps} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <Header order={order} size={240} celebrate={celebrate} />

        <View style={{ marginTop: 18, marginHorizontal: 12 }}>
          <Scrubber elapsed={now.elapsed} total={now.isCurrent ? now.total : track.sections.reduce((n, s) => n + s.lines.length, 0) * 3.2} />
        </View>
        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <BigPlay size={66} playing={now.playing} onPress={() => (now.isCurrent ? player.toggle() : player.play(track))} />
        </View>

        <Card style={{ marginTop: 20 }}>
          <Eyebrow color={colors.coral}>Ready to listen and check</Eyebrow>
          <Text style={[type.bold, { marginTop: 6, fontSize: 19, color: colors.text }]}>Does it sound like {her}?</Text>
          <View style={{ marginTop: 14, gap: 12 }}>
            {items.map((label, i) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ticks[i] }} accessibilityLabel={label} onPress={() => { tap(); toggle(i) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <CheckCircle checked={ticks[i]} size={22} />
                  <Body style={{ flex: 1 }}>{label}</Body>
                </Pressable>
                {i === 0 && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Hear ${order.recipient.name}`} hitSlop={10} onPress={() => { tap(); say(order.recipient.pronunciation || order.recipient.name) }}>
                    <Text style={[type.bold, { fontSize: 14, color: colors.text, textDecorationLine: 'underline', textDecorationColor: colors.coral }]}>Hear it</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </Card>

        <View onLayout={follow.measure('section')} style={{ marginTop: 26, marginHorizontal: 4 }}>
          <Text accessibilityRole="header" style={[type.bold, { fontSize: 19, color: colors.text, marginBottom: 16 }]}>Lyrics</Text>
          <View onLayout={follow.measure('lyrics')}>
            <LyricView sections={order.song!.sections} current={now.line} onLine={follow.onLine} />
          </View>
        </View>
      </Animated.ScrollView>

      <Footer>
        <View style={{ gap: 10 }}>
          {/* Glows once all three are ticked. */}
          <Glow on={allChecked} radius={28}>
            <Button label="Looks right · add your message" celebrate={allChecked} onPress={() => router.push(`/message/${order.id}`)} />
          </Glow>
          <Button label="Fix something" variant="ghost" size="md" onPress={() => router.push(`/fix/${order.id}`)} />
        </View>
        <Text style={[type.regular, { marginTop: 8, textAlign: 'center', fontSize: 12, color: colors.muted }]}>
          {order.corrections.length === 0 ? 'One correction round is included.' : 'Wrong names and facts are always corrected at no cost.'}
        </Text>
      </Footer>
    </View>
  )
}

function Give({ order }: { order: Order }) {
  const link = giftUrl(order)
  const name = order.recipient.name
  const her = pronoun(order, 'her')
  const she = pronoun(order, 'she')
  const text = `A song for ${name}. Press play when you have a quiet minute.`
  const [sent, setSent] = useState(false)

  const needLink = () => Alert.alert('Gift links need the web app', 'Set EXPO_PUBLIC_GIFT_BASE_URL to where the Wishly web app is hosted. Until then, preview the gift here.')
  const share = async () => {
    if (!link) return needLink()
    const result = await Share.share({ message: `${text}\n${link}`, url: link })
    if (result.action === Share.sharedAction) setSent(true)
  }
  const open = async (url: string) => { await Linking.openURL(url); setSent(true) }
  const targets = [
    { label: 'Message', icon: <MessageIcon />, go: () => (link ? open(`sms:&body=${encodeURIComponent(`${text} ${link}`)}`) : needLink()) },
    { label: 'Email', icon: <EmailIcon />, go: () => (link ? open(`mailto:?subject=${encodeURIComponent(`A song for ${name}`)}&body=${encodeURIComponent(`${text}\n\n${link}`)}`) : needLink()) },
    { label: 'Copy link', icon: <LinkIcon />, go: async () => { if (!link) return needLink(); await Clipboard.setStringAsync(link); success(); setSent(true) } },
    { label: 'More', icon: <MoreIcon />, go: share },
  ]
  const opened = order.gift?.opened_count ?? 0
  // The ribbon draws itself round the cover once it's sent; it stays on songs already given.
  const ribbon = sent ? <Ribbon width={320} draw /> : opened ? <Ribbon width={320} /> : null

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      <Header order={order} size={220} badge={<Chip label={opened ? 'Given' : 'Ready to give'} bg={colors.mint} />} ribbon={ribbon} />

      <Card style={{ marginTop: 22 }}>
        <Text style={[type.bold, { fontSize: 19, color: colors.text }]}>Send {name} {her === 'them' ? 'their' : her === 'him' ? 'his' : 'her'} song</Text>
        <Body muted style={{ marginTop: 6 }}>A private link. {she[0].toUpperCase() + she.slice(1)} can listen without an account or the app.</Body>
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          {targets.map((t) => (
            <Squish key={t.label} accessibilityRole="button" accessibilityLabel={t.label} to={0.92} onPress={() => { tap(); t.go() }} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,250,245,0.08)', alignItems: 'center', justifyContent: 'center' }}>{t.icon}</View>
              <Text style={[type.bold, { fontSize: 12, color: colors.text }]}>{t.label}</Text>
            </Squish>
          ))}
        </View>
        <Text selectable numberOfLines={1} style={[type.regular, { marginTop: 16, padding: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bg, fontSize: 14, color: colors.muted }]}>
          {link ?? 'Gift links appear here once the web app address is set'}
        </Text>
        <Body muted size={13} style={{ marginTop: 10 }}>{opened ? `Opened ${opened} time${opened === 1 ? '' : 's'}` : 'Not opened yet'}</Body>
      </Card>

      {order.gift?.message ? (
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Eyebrow>Your message</Eyebrow>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit your message" hitSlop={12} onPress={() => { tap(); router.push(`/message/${order.id}`) }}>
              <Text style={[type.bold, { fontSize: 14, color: colors.text, textDecorationLine: 'underline', textDecorationColor: colors.coral }]}>Edit</Text>
            </Pressable>
          </View>
          <Accent size={19} style={{ marginTop: 10 }}>{quoted(order.gift.message)}</Accent>
          <Text style={[type.bold, { marginTop: 8, fontSize: 14, color: colors.text }]}>{order.gift.from_name}</Text>
        </Card>
      ) : null}

      <Button label={`Send to ${name}`} onPress={share} style={{ marginTop: 20 }} />
      <Button label={`Preview what ${she}’ll see`} variant="ghost" size="md" onPress={() => router.push(`/gift/${order.gift_token}`)} style={{ marginTop: 10 }} />
    </ScrollView>
  )
}

// A soft light that sweeps along the stage being worked on.
const SWEEP = { from: { left: '-45%' }, to: { left: '105%' } }

function Sheen() {
  const still = useReducedMotion()
  if (still) return null
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '40%',
        backgroundColor: 'rgba(255,250,245,0.45)',
        animationName: SWEEP,
        animationDuration: 1800,
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      }}
    />
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>{children}</View>
}
