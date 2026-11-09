// The lyrics model's brief: a short song in bracket tags ([Short Intro],
// [Verse], [Chorus], [Outro - Melodic fade], [Fade Out], [End]) with the
// buyer's details woven in, in English only. Gemini 4 Argon writes from it on
// the backend (makeSong), and replies as JSON matching LYRICS_SCHEMA. Kept to
// 70–90 words so the song resolves cleanly at around 50–60 seconds.

import type { Mood, UserStoryDetails } from '../types/songEngine.ts'

export const MAX_WORDS = 90
export const MIN_WORDS = 70

// Sung sections, then the tags with no words that shape the start and end.
export const SECTION_TAGS = ['Verse', 'Chorus', 'Outro'] as const
export const INTRO_TAG = 'Short Intro'
export const ENDING_TAGS = ['Fade Out', 'End'] as const
// The outro's full tag; it shows as plain "Outro" in the app.
export const OUTRO_TAG = 'Outro - Melodic fade'

const SHAPE = `[${INTRO_TAG}]
(no words: 4 to 8 seconds of instrumental)
[Verse]
(at most 4 short lines that set the scene with their details)
[Chorus]
(2 to 4 catchy lines, the hook, built around their name)
[${OUTRO_TAG}]
(1 short line that lands on their name)
${ENDING_TAGS.map((t) => `[${t}]`).join('\n')}`

const MOOD_WRITING: Record<Mood, string> = {
  Upbeat: 'bright and celebratory, short punchy lines, a hook people sing along to',
  Emotional: 'heartfelt and sincere, plain words, let the details carry the feeling',
  Playful: 'cheeky and fun, gentle teasing, wordplay on their habits',
  Romantic: 'warm and intimate, spoken to them directly, no clichés like "you complete me"',
  Energetic: 'loud and anthemic, chantable lines, big rhythmic hook',
}

export const LYRICS_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    lyrics: { type: 'string' },
  },
  required: ['title', 'lyrics'],
}

export function buildLyricPrompt(story: UserStoryDetails, mood: Mood, occasion: string) {
  const name = story.recipientName.trim()
  const details = [
    story.nickname && `The name only the singer calls them: ${story.nickname}`,
    story.catchphrase && `The thing they always say: ${story.catchphrase}`,
    story.ritual && `Something they do that makes the singer smile: ${story.ritual}`,
    story.memory && `A moment the singer keeps coming back to: ${story.memory}`,
    story.wantToSay && `What the singer wants to tell them: ${story.wantToSay}`,
  ].filter(Boolean)

  return `You are a professional songwriter writing a short, original song for one real person.

Who it's for: ${name}${story.pronouns ? ` (${story.pronouns})` : ''}${story.relationship ? `, the singer's ${story.relationship.toLowerCase()}` : ''}.
Occasion: ${occasion || 'just because'}.
Mood: ${mood}: ${MOOD_WRITING[mood]}.
Language: English only.
Voice: sung by the person giving it${story.fromName ? ` (${story.fromName})` : ''}, speaking to ${name} as "I" and "you". Never sing the giver's name.

Their story:
${details.length ? details.map((d) => `- ${d}`).join('\n') : '- No details given: keep it warm and specific to the occasion.'}

Structure, about one minute when sung. Write exactly these tags, each alone on its own line, in this order:
${SHAPE}

Rules:
- ${MIN_WORDS} to ${MAX_WORDS} words in total across all sections, and NO MORE than ${MAX_WORDS}. Short lines, so the song finishes cleanly at around 50 to 60 seconds.
- Write ALL lyrics strictly in English. Do not include any foreign phrases, Spanish words, or translations under any circumstances.
- Weave in every detail naturally, in the singer's own voice. Keep their exact words for the catchphrase and the nickname.
- Never invent facts about the people: no new names, places, jobs or events.
- Use the name "${name}" at least four times: twice in the [Chorus], once in the [Verse] and once in the outro.
- Every section needs at least one line that could only be about ${name}. No stock party lines ("raise a glass", "hooray", "special day", "shine so bright").
- Lines of 6 to 9 syllables with a steady rhythm, rhyming at the line ends where it feels natural.
- Original lines only; don't quote or imitate existing songs.${story.avoid ? `\n- Leave out completely: ${story.avoid}.` : ''}

Reply with JSON: "title" (2 to 5 words, from their story) and "lyrics" (the tagged lyrics as one string, lines separated by \\n).`
}

export type Section = { label: string; lines: string[] }

// The full outro tag shows as "Outro" in the app; the singer gets it back
// (lyricsText / the backend's songPrompt).
const shortLabel = (tag: string) => (/^outro\b/i.test(tag) ? 'Outro' : tag)

// "[Verse]\nline\nline\n\n[Chorus]\n…" -> sections. Lines before the first tag go
// in a "Verse"; tags with no words ([Short Intro], [Fade Out], [End]) are left
// out, since the singer's prompt always adds them.
export function parseLyrics(text: string): Section[] {
  const sections: Section[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const tag = line.match(/^\[([^\]]+)\]$/)
    if (tag) sections.push({ label: shortLabel(tag[1].trim()), lines: [] })
    else if (line && !/^\(.*\)$/.test(line)) {
      if (!sections.length) sections.push({ label: 'Verse', lines: [] })
      sections[sections.length - 1].lines.push(line)
    }
  }
  return sections.filter((s) => s.lines.length)
}

// What the singer gets: the intro, the sung sections, then the fade and end.
export const lyricsText = (sections: Section[]) =>
  [
    `[${INTRO_TAG}]`,
    ...sections.map((s) => `[${s.label === 'Outro' ? OUTRO_TAG : s.label}]\n${s.lines.join('\n')}`),
    ENDING_TAGS.map((t) => `[${t}]`).join('\n'),
  ].join('\n\n')

export const wordCount = (sections: Section[]) => sections.flatMap((s) => s.lines).join(' ').split(/\s+/).filter(Boolean).length
