// Where Base44's Apple / Google sign-in sends people back (wishly://auth, or
// /auth in the web preview). On the web the sign-in runs in a popup, and this
// hands the result back to the window that opened it. On iOS the sign-in sheet
// catches the return itself, so this only shows if the link is opened directly.

import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { Body } from '@/components/ui'
import { colors } from '@/theme'

WebBrowser.maybeCompleteAuthSession()

export default function AuthReturn() {
  // Opened on its own (no sign-in waiting for it): go home instead of staying here.
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/'), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.muted} />
      <Body muted>Signing you in…</Body>
    </View>
  )
}
