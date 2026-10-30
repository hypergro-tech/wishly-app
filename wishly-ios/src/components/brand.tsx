// The Wishly signature and graphic language: the spark (recognition), the
// rhythm (music) and the ribbon (giving). Use one gesture at a time.
import { useEffect } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import Animated, { Easing, cubicBezier, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg'

import { colors, type } from '@/theme'

const PETALS = [0, 60, 120, 180, 240, 300]

// `spin` turns it slowly, for waiting. `bloom` opens the petals one by one.
export function Spark({ size = 24, color = colors.coral, spin, bloom }: { size?: number; color?: string; spin?: boolean; bloom?: boolean }) {
  const still = useReducedMotion()

  if (bloom && !still) {
    return (
      <View aria-hidden style={{ width: size, height: size }}>
        {PETALS.map((r, i) => (
          <Animated.View key={r} style={[StyleSheet.absoluteFill, open(160 + i * 90)]}>
            <Svg width={size} height={size} viewBox="0 0 64 64">
              <Ellipse cx={32} cy={17} rx={4} ry={13} fill={color} transform={`rotate(${r} 32 32)`} />
            </Svg>
          </Animated.View>
        ))}
        <Animated.View style={[StyleSheet.absoluteFill, open(0)]}>
          <Svg width={size} height={size} viewBox="0 0 64 64"><Circle cx={32} cy={32} r={4} fill={color} /></Svg>
        </Animated.View>
      </View>
    )
  }

  return (
    <Animated.View aria-hidden style={spin && !still ? turning : undefined}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <G fill={color}>
          {PETALS.map((r) => (
            <Ellipse key={r} cx={32} cy={17} rx={4} ry={13} transform={`rotate(${r} 32 32)`} />
          ))}
          <Circle cx={32} cy={32} r={4} />
        </G>
      </Svg>
    </Animated.View>
  )
}

const OPEN = { from: { opacity: 0, transform: [{ scale: 0.15 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } }
const open = (delay: number) => ({
  animationName: OPEN,
  animationDuration: 560,
  animationDelay: delay,
  animationTimingFunction: cubicBezier(0.34, 1.5, 0.64, 1), // a slight overshoot
  animationFillMode: 'both' as const,
})

const TURN = { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } }
const turning = { animationName: TURN, animationDuration: 9000, animationIterationCount: 'infinite' as const, animationTimingFunction: 'linear' as const }

// Lowercase wordmark, warm asterisk and final dot.
export function Logo({ size = 26, reversed = false }: { size?: number; reversed?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.16 }} accessible accessibilityLabel="wishly">
      <Spark size={size * 0.95} />
      <Text style={[type.bold, { fontSize: size, letterSpacing: -size * 0.045, color: reversed ? colors.ivory : colors.ink }]}>
        wishly<Text style={{ color: colors.coral }}>.</Text>
      </Text>
    </View>
  )
}

const BARS = [3, 6, 9, 11, 8, 4, 7, 10, 12, 9, 5, 8, 11, 7, 4, 9, 12, 10, 6, 8, 11, 5, 9, 12]

// Decorative waveform; it doesn't represent the actual audio. `live` makes the
// bars rise and fall, for a song that's being written.
export function Rhythm({ progress = null, height = 40, on = colors.ink, off = 'rgba(20,52,56,0.18)', live, style }: {
  progress?: number | null
  height?: number
  on?: string
  off?: string
  live?: boolean
  style?: ViewStyle
}) {
  const still = useReducedMotion()
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 3, height }, style]} aria-hidden>
      {BARS.map((h, i) => (
        <Animated.View
          key={i}
          style={[
            {
              flex: 1,
              maxWidth: 5,
              height: `${(h / 12) * 100}%`,
              borderRadius: 3,
              backgroundColor: progress === null || i / BARS.length < progress ? on : off,
            },
            live && !still ? bob(i) : null,
          ]}
        />
      ))}
    </View>
  )
}

const BOB = { from: { transform: [{ scaleY: 0.4 }] }, to: { transform: [{ scaleY: 1 }] } }
const bob = (i: number) => ({
  animationName: BOB,
  animationDuration: 620 + (i % 5) * 120,
  animationDelay: (i * 70) % 560,
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out' as const,
  animationFillMode: 'backwards' as const,
})

const AnimatedPath = Animated.createAnimatedComponent(Path)
const RIBBON_LENGTH = 352 // length of the path below, in its own units

// The ribbon (giving). `draw` draws it on from end to end when it first shows.
export function Ribbon({ width = 220, color = colors.coral, draw }: { width?: number; color?: string; draw?: boolean }) {
  const still = useReducedMotion()
  const drawn = useSharedValue(draw && !still ? 0 : 1)
  const props = useAnimatedProps(() => ({ strokeDashoffset: RIBBON_LENGTH * (1 - drawn.get()) }))

  useEffect(() => {
    drawn.set(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }))
  }, [drawn])

  return (
    <Svg width={width} height={width * 0.4} viewBox="0 0 300 120" fill="none">
      <AnimatedPath
        d="M12 112 C 30 30, 90 40, 150 62 S 260 90, 290 10"
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={RIBBON_LENGTH}
        animatedProps={props}
      />
    </Svg>
  )
}
