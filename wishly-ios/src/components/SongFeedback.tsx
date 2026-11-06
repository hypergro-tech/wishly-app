// Thumbs up or down on a song. On the song page a thumbs down also asks what
// felt off, in one tap; in the mini player it's just the two thumbs.
import { useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import type { Rating } from '@/api/feedbackApi'
import { Squish } from '@/components/motion'
import { Pill, nudge, tap } from '@/components/ui'
import { useSongFeedback } from '@/lib/feedback'
import { colors, type } from '@/theme'

const LOOK: Record<Rating, { emoji: string; label: string; bg: string; border: string }> = {
  LIKE: { emoji: '👍', label: 'I like it', bg: '#DCFCE7', border: '#86EFAC' },
  DISLIKE: { emoji: '👎', label: 'Not quite right', bg: '#FEE2E2', border: '#FCA5A5' },
}

const REASONS = ['The name', 'The lyrics', 'The vibe', 'The voice']

type Props = {
  songId: string
  initial?: { rating: Rating; reason?: string } | null
  version?: number
  compact?: boolean
}

export function SongFeedback({ songId, initial, version, compact }: Props) {
  const { rating, reason, rate } = useSongFeedback(songId, initial, version)
  const [asked, setAsked] = useState(false)

  const press = (r: Rating) => {
    const next = rating === r ? null : r
    if (next === 'LIKE') nudge()
    else tap()
    setAsked(next === 'DISLIKE')
    rate(next)
  }

  const thumbs = (['LIKE', 'DISLIKE'] as Rating[]).map((r) => {
    const on = rating === r
    const size = compact ? 36 : 48
    return (
      <Squish
        key={r}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={LOOK[r].label}
        hitSlop={compact ? 4 : 0}
        to={0.88}
        pop={on}
        onPress={() => press(r)}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: on ? LOOK[r].border : compact ? 'transparent' : colors.outline,
          backgroundColor: on ? LOOK[r].bg : 'transparent',
          transitionProperty: ['backgroundColor', 'borderColor'],
          transitionDuration: 180,
        }}
      >
        <Text style={{ fontSize: compact ? 16 : 21, opacity: rating && !on ? 0.45 : 1 }}>{LOOK[r].emoji}</Text>
      </Squish>
    )
  })

  if (compact) return <View style={{ flexDirection: 'row', gap: 2 }}>{thumbs}</View>

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[type.bold, { fontSize: 14, color: colors.muted }]}>{rating === 'LIKE' ? 'Glad you like it' : 'How’s the song?'}</Text>
        {thumbs}
      </View>
      {rating === 'DISLIKE' && asked ? (
        <Animated.View entering={FadeIn.duration(220)} style={{ alignItems: 'center', gap: 8 }}>
          <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}>{reason ? 'Thanks. Tap Fix something to change it.' : 'What felt off?'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {REASONS.map((r) => <Pill key={r} label={r} selected={reason === r} onPress={() => rate('DISLIKE', r)} />)}
          </View>
        </Animated.View>
      ) : null}
    </View>
  )
}
