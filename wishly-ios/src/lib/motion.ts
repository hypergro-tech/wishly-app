// Motion in the spirit of iOS: springs instead of fixed curves, quick and
// settled for everyday controls, a little bounce saved for happy moments.
//
// Reduce Motion: Reanimated already skips springs and layout animations when
// it's on. Movement that would otherwise vanish (things arriving, the player
// opening) turns into a short fade instead, and looping or shaking effects are
// left out.
import * as Haptics from 'expo-haptics'
import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

// Durations are perceived durations; dampingRatio 1 means no bounce.
export const spring = {
  press: { duration: 180, dampingRatio: 1 }, // giving under the finger
  snappy: { duration: 320, dampingRatio: 0.86 }, // controls settling into place
  smooth: { duration: 450, dampingRatio: 1 }, // larger things moving, no bounce
  bouncy: { duration: 420, dampingRatio: 0.55 }, // happy moments
} as const

export const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

// The one fade used when Reduce Motion is on.
export const stillFade = (delay = 0) => FadeIn.delay(delay).duration(220).reduceMotion(ReduceMotion.Never)

// Arrivals. On the web preview, Reanimated leaves customised entrances
// positioned absolutely once they finish, so it gets the stock curves instead
// of springs. It also hides arriving views for a moment, which stops a field
// inside from focusing itself, so those get no entrance there (`focusSafe`).
const web = Platform.OS === 'web'
export const focusSafe = <T>(entering: T) => (web ? undefined : entering)

// Content arriving: rises a little as it fades in.
export function useRise() {
  const still = useReducedMotion()
  return (delay = 0, distance = 14) =>
    still
      ? stillFade(delay)
      : web
        ? FadeInDown.delay(delay).duration(450)
        : FadeInDown.delay(delay).springify(520).dampingRatio(0.9).withInitialValues({ transform: [{ translateY: distance }] })
}

// A step sliding in from the side it's heading to.
export const slideIn = (from: 'left' | 'right') => {
  const builder = from === 'left' ? FadeInLeft : FadeInRight
  return web ? builder.duration(320) : builder.springify(440).dampingRatio(0.92).withInitialValues({ transform: [{ translateX: from === 'left' ? -48 : 48 }] })
}

// Something small landing with a bounce: a digit, a badge.
export const popIn = (delay = 0) => (web ? ZoomIn.delay(delay).duration(260) : ZoomIn.delay(delay).springify(360).dampingRatio(0.6))

// A small spring "pop" each time `on` turns true (not when first shown).
export function usePop(on: boolean, from = 0.86) {
  const scale = useSharedValue(1)
  const was = useRef(on)
  useEffect(() => {
    if (on && !was.current) scale.set(withSequence(withTiming(from, { duration: 90 }), withSpring(1, spring.bouncy)))
    was.current = on
  }, [on, from, scale])
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))
}

// A "no" shake, like the iPhone passcode screen, with an error tap.
export function useShake() {
  const still = useReducedMotion()
  const x = useSharedValue(0)
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))
  const shake = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    if (still) return
    const step = (to: number) => withTiming(to, { duration: 55, easing: Easing.inOut(Easing.quad) })
    x.set(withSequence(step(-12), step(11), step(-8), step(6), step(-3), withSpring(0, spring.snappy)))
  }
  return { style, shake }
}

// Playback time arrives four times a second; glide between updates so bars
// move smoothly. Jumps backwards (a new song, starting again) happen at once.
export function useGlide(value: number) {
  const v = useSharedValue(value)
  useEffect(() => {
    v.set(value < v.get() ? value : withTiming(value, { duration: 260, easing: Easing.linear }))
  }, [value, v])
  return v
}
