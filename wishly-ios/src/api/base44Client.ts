// The app's one connection to its backend.
//
// With EXPO_PUBLIC_BASE44_APP_ID set (see .env.example) the app talks to Base44
// through the official SDK. Without it, an on-device store with the same
// `entities` / `integrations` / `auth` surface keeps the app fully usable as a
// demo. Screens only ever call `b44()`, so nothing else changes when you switch.
//
// The SDK is written for browsers, so on iOS:
// - the login token is kept in the Keychain (expo-secure-store) and handed back
//   to the SDK on launch, because the SDK's own persistence uses localStorage;
// - signing out drops the token and makes a fresh client instead of calling
//   `auth.logout()`, which tries to redirect a browser window.

import { createClient } from '@base44/sdk'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

import { createLocalClient } from './localClient'

export const BASE44_APP_ID = process.env.EXPO_PUBLIC_BASE44_APP_ID
export const isBase44 = Boolean(BASE44_APP_ID)

// "Finish the song" and "deliver the correction" stand in for the production
// pipeline: always on in demo mode, opt-in against Base44.
export const showDemoTools = !isBase44 || process.env.EXPO_PUBLIC_DEMO_TOOLS === 'true'

const TOKEN_KEY = 'wishly.base44.token'

// SecureStore isn't available on web, where the app is only previewed.
export const tokenStore = {
  get: () => (Platform.OS === 'web' ? AsyncStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY)),
  set: (token: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(TOKEN_KEY, token) : SecureStore.setItemAsync(TOKEN_KEY, token)),
  clear: () => (Platform.OS === 'web' ? AsyncStorage.removeItem(TOKEN_KEY) : SecureStore.deleteItemAsync(TOKEN_KEY)),
}

// The SDK client and the local stand-in share this shape for what the app uses.
export type Client = any

let client: Client = null

const remoteClient = (token?: string | null) =>
  createClient({ appId: BASE44_APP_ID as string, ...(token ? { token } : {}) })

export async function initBase44(): Promise<Client> {
  client = isBase44 ? remoteClient(await tokenStore.get()) : createLocalClient()
  return client
}

export function b44(): Client {
  if (!client) throw new Error('Call initBase44() before using the backend.')
  return client
}

export async function rememberToken(token: string) {
  await tokenStore.set(token)
}

export async function forgetSession() {
  await tokenStore.clear()
  if (isBase44) client = remoteClient(null)
}
