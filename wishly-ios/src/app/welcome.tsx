// First launch only: one photo, one promise, and a way straight in. No
// account wall; the welcome is remembered on the phone.
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import Animated, { useReducedMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Logo } from '@/components/brand'
import { Body, Button, Title, tap } from '@/components/ui'
import { EXAMPLES } from '@/lib/catalog'
import { openPlayer } from '@/lib/flight'
import { useRise } from '@/lib/motion'
import { WELCOMED, markSeen } from '@/lib/once'
import { exampleTrack, usePlayer } from '@/lib/player'
import { colors, type } from '@/theme'

const HERO = EXAMPLES.find((e) => e.id === 'ex1')!

// A very slow push in on the photo, like Memories in Photos.
const DRIFT = { from: { transform: [{ scale: 1 }] }, to: { transform: [{ scale: 1.09 }] } }
const drifting = {
  animationName: DRIFT,
  animationDuration: 16000,
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out' as const,
}

export default function Welcome() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const player = usePlayer()
  const still = useReducedMotion()
  const rise = useRise()

  const leave = (then: () => void) => {
    markSeen(WELCOMED)
    router.back()
    // Next, once the welcome has left the stack; straight away it can land on top of it.
    setTimeout(then, 0)
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }} bounces={false}>
      <Animated.View entering={rise(0, 10)} style={{ marginHorizontal: 16, borderRadius: 28, overflow: 'hidden' }}>
        <Animated.View style={still ? null : drifting}>
          <Image
            source={HERO.photo}
            accessibilityLabel={HERO.photoAlt}
            contentFit="cover"
            contentPosition="center"
            style={{ width: '100%', height: Math.min(380, (width - 32) * 1.06) }}
          />
        </Animated.View>
        <Animated.View entering={rise(450)} style={{ position: 'absolute', left: 14, right: 60, bottom: 14, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(18,17,16,0.88)' }}>
          <Text style={[type.accent, { fontSize: 15, lineHeight: 20, color: colors.text }]}>“Sunday pancakes, and the first one always burns. Ten years in, it’s still my favorite turn.”</Text>
        </Animated.View>
      </Animated.View>

      <View style={{ paddingHorizontal: 24 }}>
        <Animated.View entering={rise(200)} style={{ marginTop: 26 }}><Logo size={24} reversed /></Animated.View>
        <Animated.View entering={rise(280)}>
          <Title size={34} style={{ marginTop: 12 }}>A song only they could recognize.</Title>
        </Animated.View>
        <Animated.View entering={rise(360)}>
          <Body muted size={16} style={{ marginTop: 10 }}>Tell us one memory. We’ll write and sing a song they’ll want to hear again.</Body>
        </Animated.View>

        <Animated.View entering={rise(480)}>
          <Button label="Start a song" onPress={() => leave(() => router.navigate('/create'))} style={{ marginTop: 22 }} />
          <Button
            label="Hear an example"
            variant="ghost"
            size="md"
            onPress={() => leave(() => { player.play(exampleTrack(HERO)); openPlayer() })}
            style={{ marginTop: 10 }}
          />
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => { tap(); leave(() => router.push('/sign-in')) }} style={{ alignSelf: 'center', marginTop: 16 }}>
            <Text style={[type.bold, { fontSize: 14, color: colors.muted }]}>I already have an account</Text>
          </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  )
}
