// Preview of what the recipient sees when they open their link. Recipients use
// the web app (no install needed); this mirrors it so buyers can check first.
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { findGift, type Order } from '@/api/orders'
import { Logo, Spark } from '@/components/brand'
import Cover from '@/components/Cover'
import { BigPlay, LyricView, Scrubber, useFollowLyrics } from '@/components/playback'
import { Accent, Body, Button, tap } from '@/components/ui'
import { useRise, wait } from '@/lib/motion'
import { usePlayer, useTrack } from '@/lib/player'
import { orderCover, orderTrack, songTitle } from '@/lib/songs'
import { quoted } from '@/lib/text'
import { colors, type } from '@/theme'

export default function GiftPreview() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const insets = useSafeAreaInsets()
  const player = usePlayer()
  const still = useReducedMotion()
  const rise = useRise()
  const follow = useFollowLyrics()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  // The cover, then a moment where it lifts away into the song, then the song.
  const [stage, setStage] = useState<'cover' | 'opening' | 'open'>('cover')
  const track = order ? orderTrack(order) : null
  const now = useTrack(track?.key)

  useEffect(() => { findGift(token).then(setOrder) }, [token])

  const close = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close preview"
      hitSlop={12}
      onPress={() => { tap(); router.back() }}
      style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,250,245,0.12)' }}
    >
      <Text style={[type.bold, { fontSize: 15, color: colors.text }]}>Close</Text>
    </Pressable>
  )

  if (order === undefined) return <View style={{ flex: 1, backgroundColor: colors.teal, justifyContent: 'center' }}><ActivityIndicator color={colors.text} /></View>
  if (!order || !order.song || !track) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        {close}
        <Body style={{ textAlign: 'center' }}>This gift isn’t available.</Body>
      </View>
    )
  }

  const listen = async () => {
    player.play({ ...track, label: `A song for ${order.recipient.name}` })
    setStage('opening')
    await wait(650)
    setStage('open')
  }

  // The digital gift cover: keep the recipient's name prominent. The spark
  // opens petal by petal, then the name, then the button.
  const lifting = stage !== 'cover' && !still
  const giftCover = (
    <Animated.View
      pointerEvents={stage === 'cover' ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', padding: 28 },
        { opacity: stage === 'cover' ? 1 : 0, transitionProperty: 'opacity', transitionDuration: 600, transitionTimingFunction: 'ease-in-out' },
      ]}
    >
      {/* Opening: the spark shrinks up towards where the song's cover will be. */}
      <Animated.View
        style={{
          transform: [{ translateY: lifting ? -160 : 0 }, { scale: lifting ? 0.3 : 1 }],
          transitionProperty: 'transform',
          transitionDuration: 650,
          transitionTimingFunction: 'ease-in-out',
        }}
      >
        <Spark size={120} bloom />
      </Animated.View>
      <Animated.Text entering={rise(750, 18)} accessibilityRole="header" style={[type.bold, { fontSize: 46, lineHeight: 50, letterSpacing: -1.2, color: colors.text, textAlign: 'center', marginTop: 40 }]}>
        A song for {order.recipient.name}
      </Animated.Text>
      <Animated.Text entering={rise(900)} style={[type.regular, { fontSize: 18, color: 'rgba(255,250,245,0.78)', marginTop: 14 }]}>From someone who knows you.</Animated.Text>
      <Animated.View entering={rise(1100)} style={{ marginTop: 40, alignSelf: 'stretch' }}>
        <Button label="Listen to your song" onPress={listen} style={{ minHeight: 58 }} />
      </Animated.View>
      <View style={{ position: 'absolute', bottom: Math.max(insets.bottom, 24) + 8 }}><Logo reversed size={22} /></View>
    </Animated.View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: stage === 'cover' ? colors.teal : colors.bg }}>
      {stage !== 'cover' && (
        <Animated.ScrollView {...follow.scrollProps} entering={FadeIn.duration(500)} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
          <View style={{ alignItems: 'center' }}><Logo reversed size={20} /></View>
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <Cover spec={{ ...orderCover(order), caption: `for ${order.recipient.name}` }} size={260} shadow />
          </View>
          <Text accessibilityRole="header" style={[type.bold, { marginTop: 20, textAlign: 'center', fontSize: 26, color: colors.text }]}>{songTitle(order)}</Text>
          <Body muted style={{ marginTop: 4, textAlign: 'center' }}>
            A song for {order.recipient.name}{order.gift?.from_name ? `, from ${order.gift.from_name}` : ''}
          </Body>

          <View style={{ marginTop: 20, marginHorizontal: 8 }}>
            <Scrubber elapsed={now.elapsed} total={now.total} />
          </View>
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <BigPlay size={70} playing={now.playing} onPress={() => (now.isCurrent ? player.toggle() : player.play(track))} />
          </View>

          {order.gift?.message ? (
            <View style={{ marginTop: 22, padding: 18, paddingLeft: 20, borderRadius: 22, backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.coral }}>
              <Accent size={20} style={{ lineHeight: 27 }}>{quoted(order.gift.message)}</Accent>
              <Text style={[type.bold, { marginTop: 10, fontSize: 15, color: colors.text }]}>{order.gift.from_name}</Text>
            </View>
          ) : null}

          <View onLayout={follow.measure('lyrics')} style={{ marginTop: 24 }}>
            <LyricView sections={order.song.sections} current={now.line} onLine={follow.onLine} />
          </View>

          <Body muted size={13} style={{ marginTop: 28, textAlign: 'center' }}>Keep this link to listen again. Only people you share it with can open it.</Body>
        </Animated.ScrollView>
      )}
      {stage !== 'open' && giftCover}
      {close}
    </View>
  )
}
