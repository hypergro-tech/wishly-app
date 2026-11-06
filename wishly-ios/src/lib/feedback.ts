// Each song's thumbs up or down, shared by the mini player and the song page
// so tapping one updates the other. Saved optimistically; a failed save puts
// the old rating back.
import { useSyncExternalStore } from 'react'

import { sendSongFeedback, type Rating } from '@/api/feedbackApi'

type Entry = { rating: Rating | null; reason?: string }

const ratings = new Map<string, Entry>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

// `initial` is what the order already had; a newer tap here wins.
export function useSongFeedback(songId: string, initial?: Entry | null, version?: number) {
  const entry = useSyncExternalStore(subscribe, () => ratings.get(songId)) ?? initial ?? { rating: null }

  const rate = async (rating: Rating | null, reason?: string) => {
    const before = entry
    ratings.set(songId, { rating, reason })
    emit()
    try {
      await sendSongFeedback({ songId, rating, feedbackReason: reason, version })
    } catch {
      ratings.set(songId, before)
      emit()
    }
  }
  return { ...entry, rate }
}
