// Asked once, right after the first song is placed: the moment a heads-up is
// obviously useful. Never at launch.
import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, Text } from 'react-native'
import Animated, { useReducedMotion } from 'react-native-reanimated'

import { BellIcon } from '@/components/icons'
import { Body, Button, tap } from '@/components/ui'
import { popIn, stillFade } from '@/lib/motion'
import { notNow, turnOnNotifications } from '@/lib/notifications'
import { colors, type } from '@/theme'

// The bell swings from its top, a small ring, once the sheet is up.
const RING = {
  '0%': { transform: [{ rotate: '0deg' }] },
  '15%': { transform: [{ rotate: '16deg' }] },
  '30%': { transform: [{ rotate: '-14deg' }] },
  '45%': { transform: [{ rotate: '10deg' }] },
  '60%': { transform: [{ rotate: '-6deg' }] },
  '75%': { transform: [{ rotate: '3deg' }] },
  '100%': { transform: [{ rotate: '0deg' }] },
}

export default function Notify() {
  const { name, day } = useLocalSearchParams<{ name?: string; day?: string }>()
  const still = useReducedMotion()

  return (
    <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 }}>
      <Animated.View
        entering={still ? stillFade() : popIn(150)}
        style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={still ? null : { transformOrigin: 'top center', animationName: RING, animationDuration: 900, animationDelay: 550, animationTimingFunction: 'ease-in-out' }}
        >
          <BellIcon />
        </Animated.View>
      </Animated.View>
      <Text accessibilityRole="header" style={[type.bold, { marginTop: 18, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: colors.text, textAlign: 'center' }]}>
        Want a heads-up when {name ? `${name}’s` : 'your'} song is ready?
      </Text>
      <Body muted style={{ marginTop: 8, lineHeight: 21, textAlign: 'center' }}>
        One notification{day ? ` on ${day}` : ''}, when it’s ready to listen and check. Nothing else.
      </Body>
      <Button label="Turn on notifications" onPress={async () => { await turnOnNotifications(); router.back() }} style={{ marginTop: 22, alignSelf: 'stretch' }} />
      <Pressable accessibilityRole="button" onPress={() => { tap(); notNow(); router.back() }} style={{ marginTop: 6, height: 44, paddingHorizontal: 16, justifyContent: 'center' }}>
        <Text style={[type.bold, { fontSize: 15, color: colors.muted }]}>Not now</Text>
      </Pressable>
    </ScrollView>
  )
}
