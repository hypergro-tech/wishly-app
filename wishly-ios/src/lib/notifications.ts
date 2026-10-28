// The one notification ask: made after the first song is placed, never at
// launch. Sending "your song is ready" needs push from the backend (not built
// yet); this only gets the permission.
import * as Notifications from 'expo-notifications'

import { NOTIFY_ASKED, markSeen, seen } from './once'

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
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } })
  } catch {
    // Nothing to do: the song page still shows when it's ready.
  }
}

export const notNow = () => markSeen(NOTIFY_ASKED)
