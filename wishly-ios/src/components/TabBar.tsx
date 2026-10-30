import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs'
import { useContext, useRef, type ComponentRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, useAnimatedStyle } from 'react-native-reanimated'

import { openPlayer } from '@/lib/flight'
import { useGlide, usePop, useRise } from '@/lib/motion'
import { usePlayer } from '@/lib/player'
import { colors, type, shade } from '@/theme'
import Cover from './Cover'
import { Glass } from './glass'
import { HomeIcon, PlusIcon, SongsIcon } from './icons'
import { PlayPause, Squish } from './motion'
import { IconButton, tap } from './ui'

// Floats over the screens, so songs scroll and blur beneath it. Screens leave
// room for it with useBottomTabBarHeight().
export default function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const reportHeight = useContext(BottomTabBarHeightCallbackContext)
  return (
    <View onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)} style={styles.float}>
      <MiniPlayer />
      <Glass style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {state.routes.map((route, i) => {
          const active = state.index === i
          const go = () => { tap(); if (!active) navigateToTab(route.key) }
          return <Tab key={route.key} name={route.name} active={active} onPress={go} />
        })}
      </Glass>
    </View>
  )
}

function Tab({ name, active, onPress }: { name: string; active: boolean; onPress: () => void }) {
  const pop = usePop(active, 0.78) // the icon bounces when chosen
  const color = active ? colors.text : colors.muted
  if (name === 'create') {
    return (
      <Squish accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel="Create" to={0.9} onPress={onPress} style={styles.item}>
        <Animated.View style={[styles.create, pop]}><PlusIcon /></Animated.View>
        <Text style={[type.bold, styles.label, { color }]}>Create</Text>
      </Squish>
    )
  }
  const label = name === 'index' ? 'Home' : 'My songs'
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={onPress} style={styles.item}>
      <Animated.View style={pop}>
        {name === 'index' ? <HomeIcon color={color} filled={active} /> : <SongsIcon color={color} filled={active} />}
      </Animated.View>
      <Text style={[type.bold, styles.label, { color }]}>{label}</Text>
    </Pressable>
  )
}

// Whatever is playing, wherever you are. Tap to open the full player, which
// grows out of this cover.
function MiniPlayer() {
  const { track, playing, elapsed, total, toggle } = usePlayer()
  const cover = useRef<ComponentRef<typeof View>>(null)
  const progress = useGlide(total ? Math.min(1, elapsed / total) : 0)
  const line = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }))
  const rise = useRise()
  if (!track) return null
  // The open-player area and the play button are siblings, so VoiceOver can
  // reach both.
  return (
    <Animated.View entering={rise(0, 48)} style={styles.lift}>
      <Glass style={styles.mini} fallback={colors.raised}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${track.title}. Open player`}
          onPress={() => { tap(); openPlayer(cover.current) }}
          style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}
        >
          <View ref={cover}><Cover spec={track.cover} size={44} /></View>
          {/* A new song fades in rather than swapping. */}
          <Animated.View key={track.key} entering={FadeIn.duration(260)} style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[type.bold, { fontSize: 15, color: colors.text }]}>{track.title}</Text>
            <Text numberOfLines={1} style={[type.regular, { fontSize: 13, color: colors.muted, marginTop: 2 }]}>{track.subtitle}</Text>
          </Animated.View>
        </Pressable>
        <IconButton label={playing ? 'Pause' : 'Play'} onPress={toggle}>
          <PlayPause playing={playing} size={22} />
        </IconButton>
        <View style={styles.track}><Animated.View style={[{ height: 2, backgroundColor: colors.coral }, line]} /></View>
      </Glass>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  float: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  item: { width: 96, alignItems: 'center', gap: 4, paddingVertical: 2 },
  label: { fontSize: 11 },
  create: { width: 48, height: 32, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: -1 },
  lift: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: '#5A2A1A',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  mini: {
    height: 60,
    paddingLeft: 8,
    paddingRight: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  track: { position: 'absolute', left: 12, right: 12, bottom: 0, height: 2, backgroundColor: shade(0.15) },
})
