// Calls to Gemini: Gemini 4 Argon writes the lyrics, suggests spellings and
// listens for the name; Lyria sings. Backend functions only: the key comes from
// Base44 secrets.

// A key pasted into Base44 can pick up quotes or spaces around it.
export const cleanKey = (key?: string) => key?.trim().replace(/^["']|["']$/g, '').trim() || undefined

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models'
const ARGON = 'gemini-4-argon'

async function post(url: string, body: BodyInit, headers: Record<string, string>) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { method: 'POST', body, headers })
    if (res.ok) return res.json()
    // Their servers sometimes fail for a moment; try again before giving up.
    if (res.status < 500 || attempt === 3) throw new Error(`${new URL(url).host} ${res.status}: ${(await res.text()).slice(0, 300)}`)
    await new Promise((r) => setTimeout(r, 4000 * attempt))
  }
}

const gemini = (model: string, key: string, text: string, config: object, extra: object[] = []) =>
  post(`${GEMINI}/${model}:generateContent?key=${key}`,
    JSON.stringify({ contents: [{ role: 'user', parts: [...extra, { text }] }], generationConfig: config }),
    { 'Content-Type': 'application/json' })

const textOf = (res: { candidates?: { content?: { parts?: { text?: string }[] } }[] }) =>
  (res.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')

export type Suggestion = { said: string; spellings: string[]; heard_as: string[] }

// One-word spellings an American reader would say the right way, best first.
export async function suggestSpellings(name: string, key: string): Promise<Suggestion> {
  const ask = `The first name "${name}" will be sung in an English-language pop song by an AI singer that pronounces words the way an American reader would sound out the spelling.
Return JSON with:
- "said": how the name is normally pronounced, as stressed syllables like "shi-VAWN"
- "spellings": 4 different ONE-WORD respellings (letters only, no hyphens, no spaces, no accents) that an American reader would naturally pronounce exactly that way, best first
- "heard_as": up to 8 ways a listener might write the name if they heard it pronounced correctly (include the real spelling)`
  const res = await gemini(ARGON, key, ask, { responseMimeType: 'application/json', temperature: 0.4 })
  return JSON.parse(textOf(res))
}

// Lyrics from Gemini, as JSON: a title and bracket-tagged lyrics
// ([Verse], [Chorus], [Outro - Melodic fade]), turned into the app's
// sections. The prompt sets the shape (lyricGenerator.ts). The
// name has to be heard, so it must come up often (Base44's own AI used it once
// or twice per song, and uses a Base44 credit each time).
export async function writeLyrics(prompt: string, schema: object, name: string, key: string) {
  const ask = `${prompt}

Use the name "${name}" at least four times, in no more than 90 words, all in English. Reply only with JSON matching this schema:
${JSON.stringify(schema)}`
  const res = await gemini(ARGON, key, ask, { responseMimeType: 'application/json', temperature: 0.9 })
  const written = JSON.parse(textOf(res))
  if (typeof written?.lyrics !== 'string') return written
  return { title: written.title, sections: parseLyrics(written.lyrics) }
}

// "[Verse]\nline\n\n[Chorus]\n…" -> sections. The same as parseLyrics in
// lyricGenerator.ts, kept apart so this file needs nothing from the song engine.
// Tags with no words ([Short Intro], [Fade Out], [End]) are left out:
// songPrompt always adds them.
export function parseLyrics(text: string) {
  const sections: { label: string; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const tag = line.match(/^\[([^\]]+)\]$/)
    if (tag) sections.push({ label: /^outro\b/i.test(tag[1].trim()) ? 'Outro' : tag[1].trim(), lines: [] })
    else if (line && !/^\(.*\)$/.test(line)) {
      if (!sections.length) sections.push({ label: 'Verse', lines: [] })
      sections[sections.length - 1].lines.push(line)
    }
  }
  return sections.filter((s) => s.lines.length)
}

// The song as an MP3, from Lyria 3 Pro.
export async function sing(prompt: string, key: string): Promise<Uint8Array<ArrayBuffer>> {
  let why = ''
  // Lyria sometimes answers with no audio; once more usually works.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await gemini('lyria-3-pro-preview', key, prompt, { responseModalities: ['AUDIO'] })
    const candidate = res.candidates?.[0]
    const part = candidate?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData)
    if (part) return Uint8Array.from(atob(part.inlineData.data), (c) => c.charCodeAt(0))
    const said = candidate?.content?.parts?.map((p: { text?: string }) => p.text).filter(Boolean).join(' ')
    why = [candidate?.finishReason, res.promptFeedback?.blockReason, said?.slice(0, 200)].filter(Boolean).join(' | ') || JSON.stringify(res).slice(0, 300)
  }
  throw new Error(`Lyria returned no audio: ${why}`)
}

// What a listener hears, as text. Not told the name, so it can't be led.
// Gemini 3.5 Transcribe returns nothing for singing, so Argon listens: on 19
// saved songs it matched the known answer 18 times (1 Nov 2026).
export async function listen(audio: Uint8Array<ArrayBuffer>, key: string): Promise<string> {
  let data = ''
  for (let i = 0; i < audio.length; i += 0x8000) data += String.fromCharCode(...audio.subarray(i, i + 0x8000))
  const ask = 'Transcribe every sung word in this song. Write each name the way it sounds to you, spelled the way an American would write what they hear. Do not guess a name from context or fix it to a common spelling. Output only the lyrics you hear.'
  return textOf(await gemini(ARGON, key, ask, {}, [{ inlineData: { mimeType: 'audio/mpeg', data: btoa(data) } }]))
}
