// The full-screen player, like Apple Music: it rises over the app with the
// cover growing out of whatever was tapped, follows your finger when pulled
// down to close, and the cover sits back a little while paused.
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import Cover from '@/components/Cover'
import { ChevronDownIcon, LyricsIcon } from '@/components/icons'
import { BigPlay, LyricView, Scrubber, useFollowLyrics } from '@/components/playback'
import { Body, Button, Eyebrow, IconButton } from '@/components/ui'
import { useDraft } from '@/lib/draft'
import { playerOrigin } from '@/lib/flight'
import { spring } from '@/lib/motion'
import { usePlayer } from '@/lib/player'
import { colors, type } from '@/theme'

const PAUSED = 0.86 // how far the cover sits back while paused

export default function NowPlaying() {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const still = useReducedMotion()
  const { track, playing, elapsed, total, line, toggle } = usePlayer()
  const { set } = useDraft()
  const follow = useFollowLyrics()
  const { offset } = follow
  const lyricsAt = useRef(0)
  const [origin] = useState(playerOrigin) // where the cover grows from, if anywhere
  const fly = Boolean(origin) && !still

  const open = useSharedValue(0) // 0 closed, 1 open
  const drag = useSharedValue(0) // pulled down by the finger
  const from = useSharedValue(0) // where the pull started, after any scrolling
  const breathe = useSharedValue(playing ? 1 : PAUSED)

  // The cover's resting place on screen.
  const coverSize = Math.min(width - 64, 340)
  const coverTop = Math.max(insets.top, 12) - 4 + 44 + 16
  const coverLeft = (width - coverSize) / 2

  useEffect(() => {
    open.set(still ? withTiming(1, { duration: 220, reduceMotion: ReduceMotion.Never }) : withSpring(1, spring.smooth))
  }, [open, still])

  useEffect(() => {
    breathe.set(withSpring(playing ? 1 : PAUSED, spring.smooth))
  }, [playing, breathe])

  const back = () => router.back()

  // Slides away (the cover flies home), then leaves.
  const close = (then?: () => void) => {
    const leave = () => { router.back(); then?.() }
    open.set(withTiming(0, { duration: still ? 200 : 360, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }, (done) => {
      if (done) scheduleOnRN(leave)
    }))
  }

  // Pull down from the top to close. Scrolling wins until the lyrics are back
  // at the top.
  const native = Gesture.Native()
  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(native)
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      if (offset.get() > 0) {
        from.set(e.translationY)
        return
      }
      drag.set(Math.max(0, e.translationY - from.get()))
    })
    .onEnd((e) => {
      if (drag.get() > 140 || (drag.get() > 24 && e.velocityY > 800)) {
        drag.set(withTiming(height, { duration: 220, reduceMotion: ReduceMotion.Never }, (done) => {
          if (done) scheduleOnRN(back)
        }))
      } else {
        drag.set(withSpring(0, spring.snappy))
      }
      from.set(0)
    })

  const panel = useAnimatedStyle(() => (still
    ? { opacity: open.get(), transform: [{ translateY: drag.get() }] }
    : { transform: [{ translateY: drag.get() + (1 - open.get()) * height }] }))
  const backdrop = useAnimatedStyle(() => ({ opacity: open.get() * 0.6 * (1 - Math.min(1, drag.get() / height)) }))
  const cover = useAnimatedStyle(() => ({
    opacity: fly && open.get() < 0.995 ? 0 : 1,
    transform: [{ scale: breathe.get() }],
  }))
  // A stand-in cover that travels between the tapped spot and its place here.
  const flying = useAnimatedStyle(() => {
    const p = open.get()
    if (!origin) return { opacity: 0 }
    const s = origin.width / coverSize
    const dx = origin.x + origin.width / 2 - (coverLeft + coverSize / 2)
    const dy = origin.y + origin.height / 2 - (coverTop + coverSize / 2)
    return {
      opacity: p < 0.995 ? 1 : 0,
      transform: [
        { translateX: dx * (1 - p) },
        { translateY: dy * (1 - p) - offset.get() * p },
        { scale: s + (breathe.get() - s) * p },
      ],
    }
  })

  if (!track) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Body muted>Nothing is playing.</Body>
        <Button label="Close" variant="ghost" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }, backdrop]} />

      <GestureDetector gesture={pan}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, borderRadius: 28, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'hidden' }, panel]}>
          <View style={{ paddingTop: Math.max(insets.top, 12) - 4, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton label="Close player" onPress={() => close()}><ChevronDownIcon /></IconButton>
            <Eyebrow style={{ fontSize: 13, letterSpacing: 0.6 }}>{track.label}</Eyebrow>
            <View style={{ width: 44 }} />
          </View>

          <GestureDetector gesture={native}>
            <Animated.ScrollView {...follow.scrollProps} bounces={false} contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: insets.bottom + 32 }}>
              <Animated.View style={[{ alignItems: 'center', marginTop: 16 }, cover]}>
                <Cover spec={track.cover} size={coverSize} shadow />
              </Animated.View>

              <Text accessibilityRole="header" style={[type.bold, { marginTop: 24, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: colors.text }]}>{track.title}</Text>
              <Text style={[type.regular, { marginTop: 4, fontSize: 15, color: colors.muted }]}>{track.subtitle}</Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {track.tags.map((t) => (
                  <View key={t} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,250,245,0.1)' }}>
                    <Text style={[type.bold, { fontSize: 12, color: colors.text }]}>{t}</Text>
                  </View>
                ))}
              </View>

              <View style={{ marginTop: 24 }}><Scrubber elapsed={elapsed} total={total} /></View>

              <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ width: 48 }} />
                <BigPlay playing={playing} onPress={toggle} />
                <IconButton label="Lyrics" size={48} onPress={() => follow.scrollTo(lyricsAt.current - 16)}>
                  <LyricsIcon />
                </IconButton>
              </View>

              {track.occasion ? (
                <Button
                  label="Start a song like this"
                  variant="light"
                  size="md"
                  onPress={() => close(() => { set('occasion', track.occasion!); router.navigate('/create') })}
                  style={{ marginTop: 20 }}
                />
              ) : track.orderId ? (
                <Button label="Open song" variant="light" size="md" onPress={() => close(() => router.push(`/song/${track.orderId}`))} style={{ marginTop: 20 }} />
              ) : null}

              <View
                onLayout={(e) => { lyricsAt.current = e.nativeEvent.layout.y; follow.measure('card')(e) }}
                style={{ marginTop: 28, padding: 18, borderRadius: 20, backgroundColor: colors.surface }}
              >
                <Eyebrow style={{ fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>Lyrics</Eyebrow>
                <View onLayout={follow.measure('lyrics')}>
                  <LyricView sections={track.sections} current={line} onLine={follow.onLine} />
                </View>
              </View>
            </Animated.ScrollView>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>

      {fly && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: coverLeft, top: coverTop }, flying]}>
          <Cover spec={track.cover} size={coverSize} shadow />
        </Animated.View>
      )}
    </View>
  )
}
