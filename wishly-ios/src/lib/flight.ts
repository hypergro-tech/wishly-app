// The full player grows its cover out of whatever was tapped (the mini player,
// an example cover), like Apple Music. This remembers where that was.
import { router } from 'expo-router'
import type { ComponentRef } from 'react'
import type { View } from 'react-native'

export type Rect = { x: number; y: number; width: number; height: number }

let origin: Rect | null = null
export const playerOrigin = () => origin

export function openPlayer(from?: ComponentRef<typeof View> | null) {
  origin = null
  if (!from) {
    router.push('/player')
    return
  }
  from.measureInWindow((x, y, width, height) => {
    origin = width > 0 ? { x, y, width, height } : null
    router.push('/player')
  })
}
