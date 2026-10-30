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
