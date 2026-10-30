// The Base44 SDK makes request IDs with `uuid`, which needs crypto.getRandomValues.
import 'react-native-get-random-values'

import { setAudioModeAsync } from 'expo-audio'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { SessionProvider, useSession } from '@/api/session'
import { DraftProvider } from '@/lib/draft'
import { PlayerProvider } from '@/lib/player'
import { colors, type } from '@/theme'

SplashScreen.preventAutoHideAsync()

// Deep links straight to a screen above the tabs still get the tabs beneath.
export const unstable_settings = { anchor: '(tabs)' }

const sheet = {
  presentation: 'formSheet',
  headerShown: false,
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  contentStyle: { backgroundColor: colors.surface },
} as const

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SessionProvider>
        <DraftProvider>
          <PlayerProvider>
            <RootStack />
          </PlayerProvider>
        </DraftProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  )
}

function RootStack() {
  const { ready } = useSession()

  useEffect(() => {
    // Previews should play even with the ring/silent switch on silent.
    setAudioModeAsync({ playsInSilentMode: true })
  }, [])

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { ...type.bold, fontSize: 16, color: colors.text } as never,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="review" options={{ title: 'Review' }} />
        <Stack.Screen name="song/[id]" options={{ title: 'Your song' }} />
        {/* The player draws its own rise, fall and swipe to close. */}
        <Stack.Screen name="player" options={{ presentation: 'transparentModal', animation: 'none', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="fix/[id]" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
        <Stack.Screen name="message/[id]" options={{ ...sheet, sheetAllowedDetents: [0.68, 0.92] }} />
        <Stack.Screen name="account" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
        <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="sign-in" options={{ ...sheet, sheetAllowedDetents: [0.62, 0.95] }} />
        <Stack.Screen name="notify" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
        <Stack.Screen name="gift/[token]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, animation: 'none' }} />
      </Stack>
    </>
  )
}
