// Names the music model sings wrong, and how to fix them. Shared by the app
// (src/lib/names.ts) and the backend functions, so keep it free of imports.
//
// From the song tests (29 Oct 2026, Lyria 3 Pro): a name fails when its
// spelling doesn't match how an English reader would say it, mostly Irish and
// Welsh names. Writing it in the lyrics the way it sounds, as one plain word,
// fixes it. A pronunciation guide in brackets next to the name does not.

// Letter patterns an English reader says wrong: Siobhan, Niamh, Aoife, Rhys,
// Sinéad, Hermione, Llewellyn, Eoghan, Oisin, and any accent or dots (Zoë).
// Emily, Kayleigh and Joaquin don't match.
const TRICKY = /bh|mh|dh|ao|ae(?!l)|^rh|^ll|[\u00C0-\u017F]|^sio|^nia|ione$|^eo|^ois/i

// Spellings proven in the song tests, keyed by the name in plain lowercase.
export const TESTED_SPELLINGS: Record<string, string> = {
  siobhan: 'Shivawn',
  caoimhe: 'Keeva',
  rhys: 'Reese',
  saoirse: 'Seersha',
  niamh: 'Neave',
  sinead: 'Shinnade',
  aoife: 'Eefa',
  hermione: 'Hermyuhnee',
  // From the 25-name backend test (30 Oct 2026)
  ailbhe: 'Alva',
  grainne: 'Grawnya',
  eoghan: 'Owen',
  zoe: 'Zoee',
}

// "Sinéad" -> "sinead"
export const plainName = (name: string) =>
  name.normalize('NFKD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export const isTricky = (name: string) => TRICKY.test(name.trim())

export const testedSpelling = (name: string): string | undefined => TESTED_SPELLINGS[plainName(name)]

// What the singer gets: one plain word per name part, no hyphens or accents.
// "PREE-yah" -> "Preeyah", "mary kate" -> "Mary Kate"
export const singable = (spelling: string) =>
  spelling
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z']/g, ''))
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

// Who a song is for: one person, or a couple for an anniversary (15 Nov 2026:
// both names are given, sung and checked). Each name keeps its own
// sounds-like spelling.
export type Recipient = { name: string; pronunciation?: string; partner_name?: string; partner_pronunciation?: string }
export type Honouree = { name: string; pronunciation: string }

export function honourees(r: Recipient): Honouree[] {
  const first = { name: (r.name || '').trim(), pronunciation: (r.pronunciation || '').trim() }
  const partner = (r.partner_name || '').trim()
  return partner ? [first, { name: partner, pronunciation: (r.partner_pronunciation || '').trim() }] : [first]
}

// "Rebel", or "Rebel & George" (`and` for lyrics: "Rebel and George").
export const together = (r: Recipient, and = '&') => honourees(r).map((h) => h.name).join(` ${and} `)

// Which of the five cover artworks a song shows. Orders since build 6 carry
// `cover`; older ones get a steady pick from their id.
export const coverIndex = (o: { id: string; cover?: number | null }) =>
  typeof o.cover === 'number' ? o.cover % 5 : [...o.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7) % 5

// The wish every song sings for its occasion (15 Nov 2026), word for word:
// "Happy birthday, Rebel", "Happy anniversary, Kaku and Kartik",
// "Here's to you, Rebel". `who` is the name(s) as sung ("Kaku and Kartik").
const WISHES: Record<string, { say: (who: string) => string; heard: RegExp }> = {
  Birthday: { say: (who) => `Happy birthday, ${who}`, heard: /happy\s+birthday/i },
  Anniversary: { say: (who) => `Happy anniversary, ${who}`, heard: /happy\s+anniversary/i },
  Milestone: { say: (who) => `Here’s to you, ${who}`, heard: /here[’']?s\s+to\s+you/i },
  Christmas: { say: (who) => `Merry Christmas, ${who}`, heard: /merry\s+christmas/i },
  Wedding: { say: (who) => `Congratulations, ${who}`, heard: /congratulations/i },
  "Valentine's Day": { say: (who) => `Happy Valentine’s Day, ${who}`, heard: /happy\s+valentine/i },
}

export const wishLine = (occasion: string, who: string): string | null => WISHES[occasion]?.say(who) ?? null

// True when one line of the lyrics carries the wish and every name, or the
// occasion has no set wish.
export function hasWish(lines: string[], occasion: string, names: string[]) {
  const wish = WISHES[occasion]
  if (!wish) return true
  const named = (line: string) => names.every((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line))
  return lines.some((line) => wish.heard.test(line) && named(line))
}
