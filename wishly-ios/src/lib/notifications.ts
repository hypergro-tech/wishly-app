// The one notification ask: made after the first song is placed, never at
// launch. When it's allowed, each song keeps this phone's push address, and
// the backend sends "your song is ready" through Expo's push service when
// the song is done (base44/functions/makeSong).
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'

import { NOTIFY_ASKED, markSeen, seen } from './once'

// While the app is open, the ready pop-up (lib/songReady) says the song is
// done, so the notification only goes to Notification Centre.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
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
