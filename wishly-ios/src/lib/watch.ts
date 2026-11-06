// Songs being made right now, so the ready pop-up (lib/songReady.tsx) can
// check on them from any screen. Kept apart so api/orders can add to it
// without importing the pop-up.
// A song takes a minute or two; one still going after this has stalled.
export const GIVE_UP_MS = 20 * 60 * 1000

const watched = new Map<string, number>() // id -> when watching began
const listeners = new Set<() => void>()

export function watchSong(id: string) {
  if (watched.has(id)) return
  watched.set(id, Date.now())
  listeners.forEach((l) => l())
}

export const unwatchSong = (id: string) => { watched.delete(id) }
export const watchedSongs = () => [...watched.keys()]
export const watchedFor = (id: string) => Date.now() - (watched.get(id) ?? Date.now())

export function onWatch(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
