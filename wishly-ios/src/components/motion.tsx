// Shared motion pieces. Timing and springs live in lib/motion.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  cubicBezier,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { spring } from '@/lib/motion'
import { colors } from '@/theme'
import { Spark } from './brand'
import { PauseIcon, PlayIcon } from './icons'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type SquishStyle = StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>)

// A Pressable that gives a little under the finger and springs back, like
// cards in the App Store. `pop` makes it bounce each time it turns true, e.g.
// when a choice is selected or a button becomes available.
export function Squish({ to = 0.97, pop, style, onPressIn, onPressOut, ...props }: Omit<PressableProps, 'style'> & {
  to?: number
  pop?: boolean
  style?: SquishStyle
}) {
  const still = useReducedMotion()
  const scale = useSharedValue(1)
  const [pressed, setPressed] = useState(false)
  const was = useRef(pop)
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))

  useEffect(() => {
    if (pop && !was.current) scale.set(withSequence(withTiming(0.9, { duration: 90 }), withSpring(1, spring.bouncy)))
    was.current = pop
  }, [pop, scale])

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        setPressed(true)
        if (!still) scale.set(withSpring(to, spring.press))
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        setPressed(false)
        scale.set(withSpring(1, spring.snappy))
        onPressOut?.(e)
      }}
      style={[typeof style === 'function' ? style({ pressed }) : style, lift]}
    />
  )
}

// Play and pause scale through each other instead of swapping, like Apple Music.
export function PlayPause({ playing, size = 20, color = colors.text }: { playing: boolean; size?: number; color?: string }) {
  const still = useReducedMotion()
  const swap = (shown: boolean) => ({
    opacity: shown ? 1 : 0,
    transform: [{ scale: shown || still ? 1 : 0.4 }, { rotate: shown || still ? '0deg' : '-30deg' }],
    transitionProperty: ['opacity', 'transform'],
    transitionDuration: 220,
    transitionTimingFunction: 'ease-out' as const,
  })
  return (
    <View style={{ width: size, height: size }} aria-hidden>
      <Animated.View style={[StyleSheet.absoluteFill, swap(!playing)]}><PlayIcon size={size} color={color} /></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, swap(playing)]}><PauseIcon size={size} color={color} /></Animated.View>
    </View>
  )
}

// Sparks thrown out from the middle once, for the "your song is ready" moment.
const RADIUS = 175
const SPARK_COLOURS = [colors.coral, colors.butter, colors.lilac, colors.mint]
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12)
  const reach = RADIUS * (0.72 + ((i * 37) % 10) / 34)
  const size = 14 + ((i * 7) % 4) * 3
  return {
    size,
    color: SPARK_COLOURS[i % SPARK_COLOURS.length],
    delay: (i % 3) * 40,
    keyframes: {
      from: { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0.2 }, { rotate: '0deg' }] },
      '65%': { opacity: 1 },
      to: { opacity: 0, transform: [{ translateX: Math.cos(angle) * reach }, { translateY: Math.sin(angle) * reach }, { scale: 1 }, { rotate: `${i % 2 ? 140 : -140}deg` }] },
    },
  }
})

export function Burst() {
  const still = useReducedMotion()
  if (still) return null
  return (
    <View pointerEvents="none" aria-hidden style={{ position: 'absolute', left: '50%', top: '50%' }}>
      {PARTICLES.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: -p.size / 2,
            top: -p.size / 2,
            opacity: 0,
            animationName: p.keyframes,
            animationDuration: 950,
            animationDelay: p.delay,
            animationTimingFunction: cubicBezier(0.2, 0.7, 0.3, 1),
            animationFillMode: 'both',
          }}
        >
          <Spark size={p.size} color={p.color} />
        </Animated.View>
      ))}
    </View>
  )
}

// A soft coral glow that swells once each time `on` turns true.
const GLOW = {
  from: { shadowOpacity: 0 },
  '45%': { shadowOpacity: 0.75 },
  to: { shadowOpacity: 0 },
}

export function Glow({ on, radius = 24, children, style }: { on: boolean; radius?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      style={[
        { borderRadius: radius, shadowColor: colors.coral, shadowOffset: { width: 0, height: 0 }, shadowRadius: 22, shadowOpacity: 0 },
        on ? { animationName: GLOW, animationDuration: 1400, animationTimingFunction: 'ease-in-out' } : null,
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}
