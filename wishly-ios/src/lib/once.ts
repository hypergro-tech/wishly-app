// Things shown once per phone: the welcome screen, the notification ask.
import AsyncStorage from '@react-native-async-storage/async-storage'

export const WELCOMED = 'wishly:welcomed'
export const NOTIFY_ASKED = 'wishly:notify-asked'

export const seen = async (key: string) => Boolean(await AsyncStorage.getItem(key).catch(() => null))
export const markSeen = (key: string) => AsyncStorage.setItem(key, '1').catch(() => {})
