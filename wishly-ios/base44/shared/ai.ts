// Calls to Gemini (spellings, singing with Lyria) and OpenAI (listening for the
// name). Backend functions only: the keys come from Base44 secrets.

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models'

async function post(url: string, body: BodyInit, headers: Record<string, string>) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { method: 'POST', body, headers })
    if (res.ok) return res.json()
    // Their servers sometimes fail for a moment; try again before giving up.
    if (res.status < 500 || attempt === 3) throw new Error(`${new URL(url).host} ${res.status}: ${(await res.text()).slice(0, 300)}`)
    await new Promise((r) => setTimeout(r, 4000 * attempt))
  }
}

const gemini = (model: string, key: string, text: string, config: object) =>
  post(`${GEMINI}/${model}:generateContent?key=${key}`,
    JSON.stringify({ contents: [{ role: 'user', parts: [{ text }] }], generationConfig: config }),
    { 'Content-Type': 'application/json' })

export type Suggestion = { said: string; spellings: string[]; heard_as: string[] }

// One-word spellings an American reader would say the right way, best first.
export async function suggestSpellings(name: string, key: string): Promise<Suggestion> {
  const ask = `The first name "${name}" will be sung in an English-language pop song by an AI singer that pronounces words the way an American reader would sound out the spelling.
Return JSON with:
- "said": how the name is normally pronounced, as stressed syllables like "shi-VAWN"
- "spellings": 4 different ONE-WORD respellings (letters only, no hyphens, no spaces, no accents) that an American reader would naturally pronounce exactly that way, best first
- "heard_as": up to 8 ways a listener might write the name if they heard it pronounced correctly (include the real spelling)`
  const res = await gemini('gemini-3.1-pro-preview', key, ask, { responseMimeType: 'application/json', temperature: 0.4 })
  return JSON.parse(res.candidates[0].content.parts[0].text)
}

// The song as an MP3, from Lyria 3 Pro.
export async function sing(prompt: string, key: string): Promise<Uint8Array> {
  const res = await gemini('lyria-3-pro-preview', key, prompt, { responseModalities: ['AUDIO'] })
  const part = res.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData)
  if (!part) throw new Error('Lyria returned no audio')
  return Uint8Array.from(atob(part.inlineData.data), (c) => c.charCodeAt(0))
}

// What a listener hears, as text. Not told the name, so it can't be led.
export async function listen(audio: Uint8Array, key: string): Promise<string> {
  const form = new FormData()
  form.append('model', 'gpt-4o-transcribe')
  form.append('language', 'en')
  form.append('file', new Blob([audio], { type: 'audio/mpeg' }), 'song.mp3')
  const res = await post('https://api.openai.com/v1/audio/transcriptions', form, { Authorization: `Bearer ${key}` })
  return res.text
}
