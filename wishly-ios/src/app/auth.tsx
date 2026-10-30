// Where Base44's Apple / Google sign-in sends people back (wishly://auth, or
// /auth in the web preview). On the web the sign-in runs in a popup, and this
// hands the result back to the window that opened it. On iOS the sign-in sheet
// catches the return itself, so this only shows if the link is opened directly.

import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect } from 'react'
import { ActivityIndicator, Platform, View } from 'react-native'

import { rememberToken } from '@/api/base44Client'
import { Body } from '@/components/ui'
import { colors } from '@/theme'

const handedBack = WebBrowser.maybeCompleteAuthSession()

export default function AuthReturn() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    ;(async () => {
      // Base44's sign-in page cuts the popup off from the window that opened it,
      // so in the web preview the hand-back above fails. Keep the login from the
      // address instead: both windows share storage, and the app picks it up on
      // its next load.
      if (Platform.OS === 'web' && handedBack.type !== 'success') {
        const token = new URLSearchParams(window.location.search).get('access_token')
        if (token) {
          await rememberToken(token)
          window.close()
          // Still open: load the app afresh so it starts signed in.
          window.location.replace('/')
          return
        }
      }
      // Opened on its own, or the window couldn't close: go home.
      timer = setTimeout(() => router.replace('/'), 1500)
    })()
    return () => clearTimeout(timer)
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.muted} />
      <Body muted>Signing you in…</Body>
    </View>
  )
}
