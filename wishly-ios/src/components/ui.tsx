import * as Haptics from 'expo-haptics'
import * as Speech from 'expo-speech'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spring, usePop } from '@/lib/motion'
import { colors, radius, type, shade } from '@/theme'
import { CheckIcon, SpeakerIcon } from './icons'
import { Squish } from './motion'

export const tap = () => { if (Platform.OS !== 'web') Haptics.selectionAsync() }
export const success = () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }
export const nudge = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }

export const say = (text: string) => {
  Speech.stop()
  if (text) Speech.speak(text, { rate: 0.85 })
}

// Text

export function Title({ children, size = 30, style }: { children: ReactNode; size?: number; style?: TextStyle }) {
  return <Text accessibilityRole="header" style={[type.bold, { fontSize: size, lineHeight: Math.round(size * 1.15), letterSpacing: -size * 0.02, color: colors.text }, style]}>{children}</Text>
}

export function Body({ children, muted, size = 15, style }: { children: ReactNode; muted?: boolean; size?: number; style?: TextStyle }) {
  return <Text style={[type.regular, { fontSize: size, lineHeight: Math.round(size * 1.42), color: muted ? colors.muted : colors.text }, style]}>{children}</Text>
}

export function Eyebrow({ children, color = colors.muted, style }: { children: ReactNode; color?: string; style?: TextStyle }) {
  return <Text style={[type.bold, { fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color }, style]}>{children}</Text>
}

export function Accent({ children, size = 17, style }: { children: ReactNode; size?: number; style?: TextStyle }) {
  return <Text style={[type.accent, { fontSize: size, lineHeight: Math.round(size * 1.36), color: colors.text }, style]}>{children}</Text>
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={[type.bold, { fontSize: 13, color: colors.muted, marginBottom: 10 }]}>{children}</Text>
}

// Buttons

type Variant = 'primary' | 'light' | 'ghost'
const BUTTON: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.coral, pressed: colors.coralPressed, fg: colors.ink }, // deep teal on coral
  light: { bg: colors.surface, pressed: '#F2ECE6', fg: colors.ink },
  ghost: { bg: 'transparent', pressed: colors.fill, fg: colors.text, border: shade(0.28) },
}

export function Button({ label, onPress, variant = 'primary', disabled, busy, done, celebrate, size = 'lg', icon, style }: {
  label: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  busy?: boolean
  done?: boolean // the action worked: shows a tick
  celebrate?: boolean // bounces each time this turns true
  size?: 'md' | 'lg'
  icon?: ReactNode
  style?: ViewStyle
}) {
  const v = BUTTON[variant]
  const still = useReducedMotion()
  const h = size === 'lg' ? 56 : 48
  const [width, setWidth] = useState(0)
  // While busy, and once done, the button draws in to a circle, like Apple Pay.
  const inset = (busy || done) && !still && width > h ? (width - h) / 2 : 0
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy || done, busy }}
      disabled={disabled || busy || done}
      // Bounces when it becomes available, unless told when to.
      pop={celebrate ?? !disabled}
      onPress={() => { tap(); onPress() }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.button, { minHeight: h, opacity: disabled ? 0.4 : 1 }, fadeOpacity, style]}
    >
      {({ pressed }) => (
        <>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { left: inset, right: inset, borderRadius: radius.pill, backgroundColor: pressed ? v.pressed : v.bg },
              v.border ? { borderWidth: 1, borderColor: v.border } : null,
              drawIn,
            ]}
          />
          <Animated.View style={[styles.label, show(!busy && !done)]}>
            {icon}
            <Text style={[type.bold, { color: v.fg, fontSize: size === 'lg' ? 17 : 16 }]}>{label}</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.centre, show(Boolean(busy))]}>
            {busy ? <ActivityIndicator color={v.fg} /> : null}
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.centre, show(Boolean(done))]}>
            <CheckIcon size={20} color={v.fg} />
          </Animated.View>
        </>
      )}
    </Squish>
  )
}

const fadeOpacity = { transitionProperty: 'opacity', transitionDuration: 200 } as const
const drawIn = { transitionProperty: ['left', 'right'], transitionDuration: 340, transitionTimingFunction: 'ease-in-out' as const }
const show = (on: boolean) => ({ opacity: on ? 1 : 0, transitionProperty: 'opacity', transitionDuration: 160 }) as const

export function IconButton({ label, onPress, children, size = 44, style }: { label: string; onPress: () => void; children: ReactNode; size?: number; style?: ViewStyle }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => { tap(); onPress() }}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 }, style]}
    >
      {children}
    </Pressable>
  )
}

// Choices

export function Pill({ label, selected, onPress, dashed }: { label: string; selected?: boolean; onPress: () => void; dashed?: boolean }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityState={{ selected }}
      to={0.94}
      pop={selected}
      onPress={() => { tap(); onPress() }}
      style={({ pressed }) => [
        styles.pill,
        selected ? { backgroundColor: colors.text, borderColor: colors.text } : { borderStyle: dashed ? 'dashed' : 'solid', borderColor: dashed ? shade(0.35) : colors.outline },
        pressed && !selected ? { backgroundColor: colors.fill } : null,
        fillChange,
      ]}
    >
      <Animated.Text style={[selected || dashed ? type.bold : type.regular, { fontSize: dashed ? 14 : 15, color: selected ? colors.bg : colors.text }, inkChange]}>{label}</Animated.Text>
    </Squish>
  )
}

const fillChange = { transitionProperty: ['backgroundColor', 'borderColor'], transitionDuration: 180 }
const inkChange = { transitionProperty: 'color', transitionDuration: 180 } as const

export function Pills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => <Pill key={o} label={o} selected={value === o} onPress={() => onChange(o)} />)}
    </View>
  )
}

// The white thumb slides between options, like the iOS segmented control.
export function Segmented({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  const [width, setWidth] = useState(0)
  const index = Math.max(0, options.findIndex((o) => o.id === value))
  const slot = width ? (width - 8 - 4 * (options.length - 1)) / options.length : 0
  const x = useSharedValue(0)
  const placed = useRef(false)
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))

  useEffect(() => {
    if (!slot) return
    const to = index * (slot + 4)
    x.set(placed.current ? withSpring(to, spring.snappy) : to)
    placed.current = true
  }, [index, slot, x])

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.fill }}
    >
      {slot > 0 && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 4, left: 4, width: slot, height: 40, borderRadius: 10, backgroundColor: colors.text }, thumb]} />
      )}
      {options.map((o) => {
        const on = value === o.id
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => { tap(); onChange(o.id) }}
            style={{ flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: slot ? 'transparent' : on ? colors.text : 'transparent' }}
          >
            <Animated.Text style={[type.bold, { fontSize: 14, color: on ? colors.bg : colors.text, transitionProperty: 'color', transitionDuration: 220 }]}>{o.label}</Animated.Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function CheckCircle({ checked, size = 26 }: { checked: boolean; size?: number }) {
  const pop = usePop(checked, 0.5) // the tick lands with a little bounce, like Reminders
  return checked ? (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }, pop]}>
      <CheckIcon size={size * 0.55} />
    </Animated.View>
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: shade(0.35) }} />
  )
}

// Fields: 16pt minimum, per the type system.

export function Field({ label, hint, big, multiline, style, ...input }: TextInputProps & { label?: string; hint?: string; big?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={[type.bold, { fontSize: 13, color: colors.muted }]}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={shade(0.4)}
        keyboardAppearance="dark"
        selectionColor={colors.coral}
        multiline={multiline}
        style={[
          big ? type.bold : type.regular,
          styles.input,
          { fontSize: big ? 22 : 17, minHeight: big ? 56 : 50 },
          multiline ? { minHeight: 84, textAlignVertical: 'top', paddingTop: 14, paddingBottom: 14 } : null,
          style,
        ]}
        {...input}
      />
      {hint ? <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}>{hint}</Text> : null}
    </View>
  )
}

// A square speaker button that reads a name back.
export function SpeakButton({ text, size = 52 }: { text: string; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Hear it: ${text}`}
      onPress={() => { tap(); say(text) }}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: 14, borderWidth: 1, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.fill : 'transparent' })}
    >
      <SpeakerIcon />
    </Pressable>
  )
}

export function SpeakPill({ text, label = 'Hear it' }: { text: string; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text}`}
      onPress={() => { tap(); say(text) }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.outline, backgroundColor: pressed ? colors.fill : 'transparent' })}
    >
      <SpeakerIcon size={16} />
      <Text style={[type.bold, { fontSize: 14, color: colors.text }]}>{label}</Text>
    </Pressable>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function Chip({ label, bg, fg = colors.ink }: { label: string; bg: string; fg?: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: bg }}>
      <Text style={[type.bold, { fontSize: 12, color: fg }]}>{label}</Text>
    </View>
  )
}

// Pinned action area at the bottom of a screen, above the home indicator.
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{children}</View>
}

// The grabber and padding every bottom sheet shares.
export function SheetBody({ children }: { children: ReactNode }) {
  return <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 16 }}>{children}</View>
}

export const styles = StyleSheet.create({
  button: { flexDirection: 'row', borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  label: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  centre: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pill: { minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 15 },
  input: { color: colors.text, backgroundColor: colors.fill, borderWidth: 1, borderColor: shade(0.14), borderRadius: radius.field, paddingHorizontal: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 18 },
  footer: { paddingHorizontal: 20, paddingTop: 14, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
})
