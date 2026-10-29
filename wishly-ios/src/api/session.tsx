// Who is using the app. Nobody needs an account to browse, play examples or
// create a song; sign-in is asked once, when a song is saved.
//
// - Apple / Google: Base44's web sign-in, opened in the system's secure sign-in
//   browser. Base44 sends the login token back in the redirect.
// - Email: one screen for new and returning people. We try to sign in; if that
//   fails we try to create the account, which emails a 6-digit code.
//
// Without a Base44 app ID the on-device demo store plays the same part, so the
// whole flow can be tried on a phone.

import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { BASE44_APP_ID, b44, forgetSession, initBase44, isBase44, rememberToken, tokenStore } from './base44Client'

export type User = { id: string; email: string; full_name?: string }
export type Provider = 'apple' | 'google'

type Session = {
  ready: boolean
  user: User | null
  isBase44: boolean
  signInWithProvider: (provider: Provider) => Promise<boolean>
  continueWithEmail: (email: string, password: string) => Promise<'signed-in' | 'needs-code'>
  confirmCode: (email: string, code: string, password: string) => Promise<void>
  resendCode: (email: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  // Something to finish once sign-in succeeds, e.g. saving the song.
  setAfterSignIn: (fn: ((user: User) => void) | null) => void
  runAfterSignIn: () => void
}

const SessionContext = createContext<Session | null>(null)

export class AuthError extends Error {}

// Base44's hosted app address, needed for Apple and Google sign-in.
const APP_URL = process.env.EXPO_PUBLIC_BASE44_APP_URL?.replace(/\/$/, '')
// Where Base44 sends people back after Apple / Google. Defaults to the app's own
// link; set a web page that forwards to it if Base44 only accepts https.
const returnLink = () => Linking.createURL('auth')

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const after = useRef<((user: User) => void) | null>(null)
  const latest = useRef<User | null>(null) // The signed-in user, before React re-renders.

  useEffect(() => {
    ;(async () => {
      await initBase44()
      // No saved login: skip asking Base44, which would only answer 401.
      if (isBase44 && !(await tokenStore.get())) {
        setReady(true)
        return
      }
      try {
        latest.current = await b44().auth.me()
        setUser(latest.current)
      } catch {
        setUser(null) // Not signed in yet, or the saved token expired.
      }
      setReady(true)
    })()
  }, [])

  async function finish(token: string, signedIn?: User) {
    if (isBase44) {
      b44().auth.setToken(token)
      await rememberToken(token)
    }
    const who = signedIn ?? (await b44().auth.me())
    latest.current = who
    setUser(who)
  }

  async function login(email: string, password: string) {
    // A rejected login makes the SDK try a browser redirect, so any failure here
    // just means "not signed in".
    const { access_token, user: signedIn } = await b44().auth.loginViaEmailPassword(email.trim(), password)
    if (!access_token) throw new Error('No token')
    await finish(access_token, signedIn)
  }

  async function signInWithProvider(provider: Provider) {
    if (!isBase44) {
      const { access_token, user: signedIn } = await b44().auth.signInWithProvider(provider)
      await finish(access_token, signedIn)
      return true
    }
    if (!APP_URL) throw new AuthError('Apple and Google sign-in need EXPO_PUBLIC_BASE44_APP_URL. Use email for now.')
    const redirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || returnLink()
    const path = provider === 'google' ? '' : `/${provider}`
    const url = `${APP_URL}/api/apps/auth${path}/login?app_id=${BASE44_APP_ID}&from_url=${encodeURIComponent(redirect)}`
    const result = await WebBrowser.openAuthSessionAsync(url, returnLink())
    if (result.type !== 'success') return false // Closed or cancelled: no message needed.
    const token = Linking.parse(result.url).queryParams?.access_token
    if (typeof token !== 'string') throw new AuthError('That didn’t finish signing you in. Try again, or use email.')
    await finish(token)
    return true
  }

  async function continueWithEmail(email: string, password: string) {
    try {
      await login(email, password)
      return 'signed-in' as const
    } catch {
      // Not signed in: either a new person, or the wrong password.
    }
    try {
      await b44().auth.register({ email: email.trim(), password })
      return 'needs-code' as const
    } catch {
      throw new AuthError('That email and password don’t match. Try again, or reset your password.')
    }
  }

  async function confirmCode(email: string, code: string, password: string) {
    try {
      await b44().auth.verifyOtp({ email: email.trim(), otpCode: code.trim() })
    } catch {
      throw new AuthError('That code didn’t work. Check the latest email from us, or send a new one.')
    }
    try {
      await login(email, password)
    } catch {
      throw new AuthError('Your email is confirmed, but signing in didn’t work. Try again in a moment.')
    }
  }

  const resendCode = async (email: string) => { await b44().auth.resendOtp(email.trim()) }
  const resetPassword = async (email: string) => { await b44().auth.resetPasswordRequest(email.trim()) }

  async function signOut() {
    if (!isBase44) await b44().auth.forget()
    await forgetSession()
    latest.current = null
    setUser(null)
  }

  const setAfterSignIn = (fn: ((user: User) => void) | null) => { after.current = fn }
  const runAfterSignIn = () => {
    const fn = after.current
    after.current = null
    if (fn && latest.current) fn(latest.current)
  }

  return (
    <SessionContext.Provider
      value={{ ready, user, isBase44, signInWithProvider, continueWithEmail, confirmCode, resendCode, resetPassword, signOut, setAfterSignIn, runAfterSignIn }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession must be inside SessionProvider')
  return s
}
