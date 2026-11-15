// How an order shows up as a song: its cover, its status chip, and the track
// the player plays.
import type { Order } from '@/api/orders'
import type { CoverSpec } from '@/components/Cover'
import { colors, shade } from '@/theme'
import { MOODS, OCCASION_TONES, formatDate } from './catalog'
import { coverIndex, together } from './names'
import type { Track } from './player'

// Who the song is for, as shown: "Rebel", or "Rebel & George" for an anniversary couple.
export const forWhom = (o: Pick<Order, 'recipient'>) => together(o.recipient)

export const songTitle = (o: Order) => o.song?.title?.replace(/^["“]|["”]$/g, '') || forWhom(o)

export const orderCover = (o: Order): CoverSpec => ({
  name: songTitle(o),
  tint: OCCASION_TONES[o.occasion]?.tint ?? 'lilac',
  caption: `for ${forWhom(o)}`,
  // Songs made before covers were numbered get one picked from their id.
  art: coverIndex(o),
})


export function statusChip(o: Order): { label: string; bg: string; fg: string } {
  switch (o.status) {
    case 'ready_for_review':
      return { label: 'Ready to listen and check', bg: colors.coral, fg: colors.ink }
    case 'in_production':
      return { label: 'Writing…', bg: shade(0.1), fg: colors.text }
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
    // Each version is its own recording, so a remade song gets a new key.
    key: `order:${o.id}:v${o.song_version}`,
    title: songTitle(o),
    subtitle: `A song for ${forWhom(o)} · v${o.song_version}`,
    label: 'Your song',
    cover: orderCover(o),
    sections: o.song.sections,
    mood: o.music.mood,
    tags: [o.occasion, MOODS.find((m) => m.id === o.music.mood)?.label ?? '', o.music.genre].filter(Boolean),
    audioUrl: o.song.audio_url,
    orderId: o.id,
    feedback: o.feedback,
    version: o.song_version,
  }
}

export const pronoun = (o: Pick<Order, 'recipient'>, kind: 'her' | 'she') => {
  const p = o.recipient.pronouns
  if (o.recipient.partner_name?.trim()) return kind === 'her' ? 'them' : 'they'
  if (p === 'she/her') return kind
  if (p === 'he/him') return kind === 'her' ? 'him' : 'he'
  return kind === 'her' ? 'them' : 'they'
}
