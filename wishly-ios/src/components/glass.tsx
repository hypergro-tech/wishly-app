// Liquid Glass (iOS 26 and later) for the bars that float over content: the
// tab bar, the mini player and the header that appears as you scroll. Elsewhere,
// including the web preview, they fall back to a near-opaque warm fill.
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useState, type ReactNode } from 'react'
import { StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, type } from '@/theme'

export const hasGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable()

export function Glass({ children, style, fallback = 'rgba(18,17,16,0.96)' }: { children?: ReactNode; style?: StyleProp<ViewStyle>; fallback?: string }) {
  if (hasGlass) {
    return <GlassView glassEffectStyle="regular" colorScheme="dark" style={style}>{children}</GlassView>
  }
  return <View style={[{ backgroundColor: fallback }, style]}>{children}</View>
}

// A large-title screen's header: clear at the top, glass with a small title
// once the big title has scrolled away, like iOS navigation bars.
export function useScrollHeader(after: number) {
  const [solid, setSolid] = useState(false)
  return {
    solid,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => setSolid(e.nativeEvent.contentOffset.y > after),
    scrollEventThrottle: 16,
  }
}

export function ScrollHeader({ title, solid }: { title: string; solid: boolean }) {
  const insets = useSafeAreaInsets()
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 44 }}>
      {hasGlass ? (
        // Glass mustn't be faded with opacity; its own style change animates.
        <GlassView glassEffectStyle={{ style: solid ? 'regular' : 'none', animate: true, animationDuration: 0.25 }} colorScheme="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,17,16,0.94)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, fade(solid)]} />
      )}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, alignItems: 'center', justifyContent: 'center' }, fade(solid), { transform: [{ translateY: solid ? 0 : 6 }] }]}>
        <Text style={[type.bold, { fontSize: 16, color: colors.text }]}>{title}</Text>
      </Animated.View>
    </View>
  )
}

const fade = (on: boolean) => ({ opacity: on ? 1 : 0, transitionProperty: ['opacity', 'transform'], transitionDuration: 220, transitionTimingFunction: 'ease-out' as const })
