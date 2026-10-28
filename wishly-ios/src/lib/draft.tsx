// The song being created, shared by the Create tab, Home's occasion tiles and
// Review, and kept on the phone so leaving (or closing the app) never loses
// what someone wrote.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import type { Brief } from '@/api/orders'
import { MEMORY_PROMPTS } from './catalog'

const DRAFT_KEY = 'wishly:draft'

export const EMPTY_DRAFT: Brief = {
  recipient: { name: '', pronunciation: '', pronouns: '', relationship: '' },
  occasion: '',
  occasion_date: '',
  memories: { ritual: '', nickname: '', inside_joke: '', memory: '', want_to_say: '', avoid: '' },
  music: { mood: '', genre: '', voice: 'No preference', language: 'English' },
  package: { delivery: 'standard', extras: [] },
  buyer: { name: '', email: '' },
}

export const filledMemories = (b: Brief) => MEMORY_PROMPTS.filter((m) => b.memories[m.key]?.trim())

// What still needs choosing before the song can be reviewed, in screen order.
export function missing(b: Brief): string[] {
  const out: string[] = []
  if (!b.recipient.name.trim()) out.push('their name')
  if (!b.recipient.relationship) out.push('who they are to you')
  if (!b.occasion) out.push('the occasion')
  if (filledMemories(b).length === 0) out.push('one detail about them')
  if (!b.music.mood) out.push('a mood')
  if (!b.music.genre) out.push('a style')
  return out
}

type Draft = {
  draft: Brief
  set: <G extends keyof Brief>(group: G, value: Partial<Brief[G]> | Brief[G]) => void
  reset: () => void
  version: number // bumps on reset, so forms can start fresh
}

const DraftContext = createContext<Draft | null>(null)

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Brief>(EMPTY_DRAFT)
  const [loaded, setLoaded] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => { if (raw) setDraft({ ...EMPTY_DRAFT, ...JSON.parse(raw) }) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {})
  }, [draft, loaded])

  const set: Draft['set'] = (group, value) =>
    setDraft((d) => ({ ...d, [group]: typeof value === 'object' && !Array.isArray(value) ? { ...(d[group] as object), ...value } : value }))

  const reset = () => {
    setDraft(EMPTY_DRAFT)
    setVersion((v) => v + 1)
  }

  if (!loaded) return null
  return <DraftContext.Provider value={{ draft, set, reset, version }}>{children}</DraftContext.Provider>
}

export function useDraft() {
  const d = useContext(DraftContext)
  if (!d) throw new Error('useDraft must be inside DraftProvider')
  return d
}
