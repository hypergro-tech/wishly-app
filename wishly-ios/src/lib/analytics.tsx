// What people do in the app, so the team can see which screens they spend
// time on, which buttons they tap, and where things fail. Sent to PostHog (US)
// when EXPO_PUBLIC_POSTHOG_KEY is set; off without it.
//
// Never sent: names, memories, lyrics, messages, emails or gift links.
// - Screens go as their route ("/song/[id]"), never the real address.
// - Taps go by a `ph-label` prop (Button sets one from its label). Text and
//   accessibility labels on screen aren't read: they can hold names.
// - A signed-in buyer is known by their Base44 user id only.
// - No session replay.
//
// EXPO_PUBLIC_POSTHOG_DEBUG=true (web preview, testing): logs each event to
// the console and sends nothing.

import { useSegments } from 'expo-router'
import { PostHog, PostHogProvider } from 'posthog-react-native'
import { type ReactNode, useEffect, useRef } from 'react'
import { AppState } from 'react-native'

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY
const DEBUG = process.env.EXPO_PUBLIC_POSTHOG_DEBUG === 'true'

type Props = Record<string, string | number | boolean | null | undefined>
type Sent = { event: string; properties?: Record<string, unknown> }

// A tap on something without a label of its own (a scroll, a blank spot)
// says nothing useful, so it isn't sent.
const labelled = (e: Sent) =>
  ((e.properties?.$elements as Record<string, unknown>[] | undefined) ?? []).some(
    (el) => typeof el['attr__ph-label'] === 'string' && el['attr__ph-label'] !== 'PostHogProvider',
  )

function beforeSend<E extends Sent>(e: E): E | null {
  if (e.event === '$autocapture' && !labelled(e)) {
    if (DEBUG) console.log('[track] (tap without a label, not sent)', JSON.stringify((e.properties?.$elements as unknown[])?.slice(0, 4)))
    return null
  }
  if (DEBUG) {
    const p = e.properties ?? {}
    const tapped = e.event === '$autocapture' ? (p.$elements as { tag_name?: string }[])?.[0]?.tag_name : undefined
    const own = Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith('$')))
    console.log('[track]', e.event, tapped ?? '', JSON.stringify({ screen: p.$screen_name, ...own }))
    return null
  }
  return e
}

export const posthog =
  KEY || DEBUG
    ? new PostHog(KEY || 'phc_debug_only', {
        host: 'https://us.i.posthog.com',
        // People who never sign in stay anonymous; no profile is made for them.
        personProfiles: 'identified_only',
        // Crashes and unhandled errors in the app. Console messages aren't sent.
        errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: false } },
        before_send: beforeSend as never,
        ...(DEBUG ? { preloadFeatureFlags: false, disableRemoteConfig: true, flushAt: 1 } : {}),
      })
    : null

export function track(event: string, properties?: Props) {
  posthog?.capture(event, properties as never)
}

// Something the buyer tried didn't work: which step, and the backend's own
// short answer (never the raw request).
export function trackFailure(step: string, error: unknown) {
  const e = error as { status?: number; response?: { status?: number; data?: { error?: string; code?: string } }; data?: { error?: string; code?: string }; message?: string }
  const data = e?.response?.data ?? e?.data
  track('failed', {
    step,
    status: e?.status ?? e?.response?.status ?? null,
    code: data?.code ?? null,
    reason: String(data?.error ?? e?.message ?? error).slice(0, 160),
  })
}

export const identify = (userId: string | undefined) => { if (userId) posthog?.identify(userId) }
export const forgetUser = () => { posthog?.reset() }

// The route a screen was opened at, without its ids: /song/[id], not /song/abc.
function useScreenName() {
  const segments = useSegments() as string[]
  const path = segments.filter((s) => !s.startsWith('(')).join('/')
  return '/' + (path || 'home')
}

// Each screen opened, and when the buyer leaves it, how long they stayed
// ("screen_time", in seconds). Time with the app in the background isn't counted.
function ScreenTracker() {
  const name = useScreenName()
  const on = useRef<{ name: string; since: number } | null>(null)
  const last = useRef(name)

  useEffect(() => {
    const leave = () => {
      const was = on.current
      if (!was) return
      on.current = null
      const seconds = Math.round((Date.now() - was.since) / 1000)
      if (seconds > 0) track('screen_time', { screen: was.name, seconds: Math.min(seconds, 3600) })
    }
    const enter = (screen: string) => {
      leave()
      on.current = { name: screen, since: Date.now() }
      posthog?.screen(screen)
    }
    last.current = name
    enter(name)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') leave()
      else if (state === 'active' && !on.current) enter(last.current)
    })
    return () => sub.remove()
  }, [name])

  return null
}

// Wraps the app: taps are caught here. Goes inside the router so screens can be named.
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!posthog) return <>{children}</>
  return (
    <PostHogProvider
      client={posthog}
      autocapture={{ captureTouches: true, captureScreens: false, propsToCapture: ['ph-label', 'testID'] }}
    >
      <ScreenTracker />
      {children}
    </PostHogProvider>
  )
}
