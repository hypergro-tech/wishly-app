// Thumbs up or down on a finished song, saved on its order as `feedback`.
// Base44 has no custom routes for this: the buyer updates their own order
// through the SDK (PUT /api/apps/{app}/entities/Order/{id}), and the order's
// access rules make sure it's theirs.
import { b44 } from './base44Client'

export type Rating = 'LIKE' | 'DISLIKE'

// `rating: null` clears it (tapping the same thumb again).
export type SongFeedbackInput = { songId: string; rating: Rating | null; feedbackReason?: string; version?: number }

export async function sendSongFeedback({ songId, rating, feedbackReason, version }: SongFeedbackInput) {
  const feedback = rating
    ? { rating, ...(feedbackReason?.trim() ? { reason: feedbackReason.trim().slice(0, 300) } : {}), ...(version ? { version } : {}), at: new Date().toISOString() }
    : null
  await b44().entities.Order.update(songId, { feedback })
  return feedback
}
