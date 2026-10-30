import { useEffect, useEffectEvent, useRef, type ComponentRef } from 'react'
import { Text, View, type LayoutChangeEvent, type ScrollView } from 'react-native'
import Animated, {
  ReduceMotion,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { useGlide, spring } from '@/lib/motion'
import { formatTime } from '@/lib/player'
import type { Song } from '@/lib/songwriter'
import { colors, type, shade } from '@/theme'
import { Spark } from './brand'
import { PlayPause, Squish } from './motion'
import { tap } from './ui'

export function Scrubber({ elapsed, total }: { elapsed: number; total: number }) {
  const p = total ? Math.min(1, elapsed / total) : 0
  const glide = useGlide(p)
  const fill = useAnimatedStyle(() => ({ width: `${glide.get() * 100}%` }))
  const knob = useAnimatedStyle(() => ({ left: `${glide.get() * 100}%` }))
  return (
    <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: Math.round(total), now: Math.round(elapsed) }}>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: shade(0.18) }}>
        <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: colors.text }, fill]} />
        <Animated.View style={[{ position: 'absolute', top: -4, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text }, knob]} />
      </View>
      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.regular, { fontSize: 12, color: colors.muted }]}>{formatTime(elapsed)}</Text>
        <Text style={[type.regular, { fontSize: 12, color: colors.muted }]}>{formatTime(total)}</Text>
      </View>
    </View>
  )
}

export function BigPlay({ playing, onPress, size = 72 }: { playing: boolean; onPress: () => void; size?: number }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      to={0.9}
      onPress={() => { tap(); onPress() }}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: pressed ? colors.coralPressed : colors.coral, alignItems: 'center', justifyContent: 'center' })}
    >
      <PlayPause playing={playing} size={size * 0.38} color={colors.ink} />
    </Squish>
  )
}

// Lyrics with the line being sung marked by the spark, which glides from line
// to line. `onLine` reports where the current line sits, for following it.
export function LyricView({ sections, current, onLine }: { sections: Song['sections']; current: number; onLine?: (y: number) => void }) {
  const still = useReducedMotion()
  const tops = useRef<number[]>([])
  const y = useSharedValue(0)
  const shown = useSharedValue(0)
  const spark = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ translateY: y.get() }] }))

  const moveTo = useEffectEvent((i: number) => {
    const top = tops.current[i]
    if (top === undefined) return
    y.set(still ? top : withSpring(top, spring.smooth))
    onLine?.(top)
  })

  useEffect(() => {
    shown.set(withTiming(current >= 0 ? 1 : 0, { duration: 200 }))
    if (current >= 0) moveTo(current)
  }, [current, shown])

  const measure = (i: number) => (e: LayoutChangeEvent) => {
    tops.current[i] = e.nativeEvent.layout.y
    if (i === current) y.set(e.nativeEvent.layout.y) // first layout: no glide
  }

  // Index of each section's first line across the whole song.
  const starts = sections.map((_, si) => sections.slice(0, si).reduce((n, s) => n + s.lines.length, 0))

  // One flat list, so every line is measured from the same top.
  return (
    <View accessibilityLiveRegion="polite">
      <Animated.View aria-hidden style={[{ position: 'absolute', left: 0, top: 6 }, spark]}><Spark size={14} /></Animated.View>
      {sections.flatMap((s, si) => [
        s.label ? (
          <Text key={`label${si}`} style={[type.bold, { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: si === 0 ? 0 : 16, marginBottom: 6 }]}>{s.label}</Text>
        ) : null,
        ...s.lines.map((text, li) => {
          const i = starts[si] + li
          const on = i === current
          return (
            <View key={i} onLayout={measure(i)} style={{ paddingLeft: 22 }}>
              <Animated.Text
                style={[
                  on ? type.accent : type.serif,
                  {
                    fontSize: 19,
                    lineHeight: 27,
                    color: on ? colors.text : colors.muted,
                    transformOrigin: 'left center',
                    transform: [{ scale: on && !still ? 1.035 : 1 }],
                    transitionProperty: ['color', 'transform'],
                    transitionDuration: 320,
                    transitionTimingFunction: 'ease-out',
                  },
                ]}
              >
                {text}
              </Animated.Text>
            </View>
          )
        }),
      ])}
    </View>
  )
}

// Keeps the line being sung in view once someone has scrolled down to the
// lyrics, like Apple Music. Lets go while they scroll themselves, and picks up
// again a few seconds after. Spread `scrollProps` on an Animated.ScrollView.
export function useFollowLyrics() {
  const scroll = useRef<ComponentRef<typeof ScrollView> | null>(null)
  const offset = useSharedValue(0)
  const held = useSharedValue(0)
  const height = useRef(0)
  const parts = useRef<Record<string, number>>({})

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { offset.set(e.contentOffset.y) },
    onBeginDrag: () => { held.set(1) },
    onEndDrag: () => { held.set(withDelay(3000, withTiming(0, { duration: 0 }), ReduceMotion.Never)) },
  })

  const top = () => Object.values(parts.current).reduce((a, b) => a + b, 0)
  const scrollTo = (y: number) => scroll.current?.scrollTo({ y: Math.max(0, y), animated: true })

  return {
    offset,
    scrollProps: {
      ref: (node: ComponentRef<typeof ScrollView> | null) => { scroll.current = node },
      onScroll,
      scrollEventThrottle: 16,
      onLayout: (e: LayoutChangeEvent) => { height.current = e.nativeEvent.layout.height },
    },
    scrollTo,
    // Each view between the scroll content and the lyrics reports its offset.
    measure: (key: string) => (e: LayoutChangeEvent) => { parts.current[key] = e.nativeEvent.layout.y },
    onLine: (lineY: number) => {
      const view = height.current
      // Only once the lyrics fill at least half the screen.
      if (held.get() > 0 || !view || top() > offset.get() + view * 0.5) return
      scrollTo(top() + lineY - view * 0.35)
    },
  }
}
