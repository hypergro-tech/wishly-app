// How an order shows up as a song: its cover, its status chip, and the track
// the player plays.
import type { Order } from '@/api/orders'
import type { CoverSpec } from '@/components/Cover'
import { colors } from '@/theme'
import { MOODS, OCCASION_TONES, formatDate } from './catalog'
import type { Track } from './player'

export const songTitle = (o: Order) => o.song?.title?.replace(/^["“]|["”]$/g, '') || o.recipient.name

export const orderCover = (o: Order): CoverSpec => ({
  name: songTitle(o),
  tint: OCCASION_TONES[o.occasion]?.tint ?? 'lilac',
  caption: `for ${o.recipient.name}`,
})

const weekday = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short' })

export function statusChip(o: Order): { label: string; bg: string; fg: string } {
  switch (o.status) {
    case 'ready_for_review':
      return { label: 'Ready to listen and check', bg: colors.coral, fg: colors.ink }
    case 'in_production':
      return { label: `Writing · ready ${weekday(o.ready_by)}`, bg: 'rgba(255,250,245,0.1)', fg: colors.text }
    case 'correction_requested':
      return { label: 'Making your correction', bg: colors.butter, fg: colors.ink }
    case 'approved':
      return { label: o.gift?.opened_count ? 'Given' : 'Ready to give', bg: colors.mint, fg: colors.ink }
  }
}

export const orderedLine = (o: Order) =>
  o.status === 'approved' && o.gift?.opened_count
    ? `${o.occasion} · opened ${o.gift.opened_count} time${o.gift.opened_count === 1 ? '' : 's'}`
    : `${o.occasion} · ordered ${formatDate(o.created_date).split(', ').slice(1).join(', ')}`

export function orderTrack(o: Order): Track | null {
  if (!o.song) return null
  return {
    key: `order:${o.id}`,
    title: songTitle(o),
    subtitle: `A song for ${o.recipient.name} · v${o.song_version}`,
    label: 'Your song',
    cover: orderCover(o),
    sections: o.song.sections,
    mood: o.music.mood,
    tags: [o.occasion, MOODS.find((m) => m.id === o.music.mood)?.label ?? '', o.music.genre].filter(Boolean),
    audioUrl: o.song.audio_url,
    orderId: o.id,
  }
}

export const pronoun = (o: Pick<Order, 'recipient'>, kind: 'her' | 'she') => {
  const p = o.recipient.pronouns
  if (p === 'she/her') return kind
  if (p === 'he/him') return kind === 'her' ? 'him' : 'he'
  return kind === 'her' ? 'them' : 'they'
}
