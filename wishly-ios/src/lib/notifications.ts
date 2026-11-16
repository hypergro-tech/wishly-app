// The one notification ask: made after the first song is placed, never at
// launch. When it's allowed, each song keeps this phone's push address, and
// the backend sends "your song is ready" through Expo's push service when
// the song is done (base44/functions/makeSong).
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { NOTIFY_ASKED, markSeen, seen } from './once'

// While the app is open, the ready pop-up (lib/songReady) says the song is
// done, so the notification only goes to Notification Centre.
try {
  Notifications.setNotificationHandler({
    // A test from Profile shows as a banner even with the app open.
    handleNotification: async (n) => {
      const test = !!n.request.content.data?.test
      return { shouldShowBanner: test, shouldShowList: true, shouldPlaySound: test, shouldSetBadge: false }
    },
  })
} catch {
  // Not available here (e.g. the web preview).
}

export async function shouldAskForNotifications() {
  if (await seen(NOTIFY_ASKED)) return false
  try {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync()
    return !granted && canAskAgain
  } catch {
    return false // Not available here (e.g. the web preview).
  }
}

export async function turnOnNotifications() {
  markSeen(NOTIFY_ASKED)
  try {
    const { granted } = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } })
    return granted
  } catch {
    return false // Nothing to do: the song page still shows when it's ready.
  }
}

export const notNow = () => markSeen(NOTIFY_ASKED)

// This phone's address for push notifications, if they're allowed.
export async function pushToken(): Promise<string | null> {
  try {
    const { granted } = await Notifications.getPermissionsAsync()
    if (!granted) return null
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data
  } catch {
    return null // Expo Go, the simulator or the web preview
  }
}

// Profile's "Send a test notification": gets this phone's address, sends a
// notification through Expo, then asks Expo whether Apple took it. Says in
// plain words what went wrong, so a missing notification can be tracked down.
export async function sendTestNotification(): Promise<string> {
  try {
    const { granted } = await Notifications.getPermissionsAsync()
    if (!granted) return 'Notifications are off for Wishly. Turn them on in iPhone Settings, then try again.'
  } catch {
    return 'Notifications aren’t available here.'
  }
  let to: string
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    to = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  } catch (e) {
    return `Couldn’t get this phone’s notification address: ${(e as Error)?.message ?? e}`
  }
  try {
    const send = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to, title: 'Wishly test', body: 'Notifications are working.', sound: 'default', data: { test: true } }),
    }).then((r) => r.json())
    const ticket = send?.data
    if (ticket?.status !== 'ok') return `Expo refused it: ${ticket?.details?.error ?? ticket?.message ?? JSON.stringify(send).slice(0, 200)}`
    // Apple's answer comes back a few seconds later, as a receipt.
    await new Promise((r) => setTimeout(r, 6000))
    const receipts = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids: [ticket.id] }),
    }).then((r) => r.json())
    const receipt = receipts?.data?.[ticket.id]
    if (!receipt) return 'Sent to Expo. Apple hasn’t answered yet, so if nothing arrives, try once more.'
    if (receipt.status !== 'ok') return `Apple refused it: ${receipt.details?.error ?? ''} ${receipt.message ?? ''}`.trim()
    return 'Sent, and Apple accepted it. It should be on your screen now.'
  } catch (e) {
    return `Couldn’t reach the notification service: ${(e as Error)?.message ?? e}`
  }
}

// The notification they tapped to open the app ("your song is ready"), so
// the app can go to that song. Phones only: the web preview has no
// notifications, and the hook throws there.
export const useOpenedNotification: () => Notifications.NotificationResponse | null | undefined =
  Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse
