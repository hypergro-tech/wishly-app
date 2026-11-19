// Caps on the backend functions that cost money per call (Gemini), per
// buyer: a few a minute and a set number a day. Someone calling a function
// over and over, by hand or with a script, stops at the cap instead of
// running up the AI bill. Counted on the server in the Usage entity.
//
// makeSong is already paid for and capped per song (startSong, makeSong);
// its daily cap is a safety net far above what a real buyer needs.

export const LIMITS = {
  suggestSpelling: { perMinute: 6, perDay: 60 },
  makeSong: { perMinute: 2, perDay: 20 },
} as const

export type Action = keyof typeof LIMITS

// deno-lint-ignore no-explicit-any
type Admin = any

// Counts this call. Null when it may go ahead, else what to tell the buyer.
export async function overLimit(admin: Admin, buyer: string, action: Action): Promise<string | null> {
  const { perMinute, perDay } = LIMITS[action]
  const now = new Date().toISOString()
  const day = now.slice(0, 10)
  const minute = now.slice(0, 16)
  const [row] = (await admin.entities.Usage.filter({ buyer, action, day })) || []
  const count = row?.count || 0
  const inMinute = row?.minute === minute ? row.minute_count || 0 : 0
  if (count >= perDay) return 'You’ve reached today’s limit for this. Try again tomorrow.'
  if (inMinute >= perMinute) return 'That’s a lot of tries at once. Wait a minute and try again.'
  const next = { count: count + 1, minute, minute_count: inMinute + 1 }
  if (row) await admin.entities.Usage.update(row.id, next)
  else await admin.entities.Usage.create({ buyer, action, day, ...next })
  return null
}
