// The lyrics model's brief: song structure in bracket tags ([Verse 1],
// [Pre-Chorus], [Chorus], [Bridge], [Outro]) with the buyer's details woven in.
// Gemini 4 Argon writes from it on the backend (makeSong), and replies as JSON
// matching LYRICS_SCHEMA.

import type { Mood, UserStoryDetails } from '../types/songEngine.ts'

export const SECTION_TAGS = ['Verse 1', 'Pre-Chorus', 'Chorus', 'Bridge', 'Outro'] as const

// About a minute sung: 14 lines.
const SHAPE = `[Verse 1]: 4 lines that set the scene with their details
[Pre-Chorus]: 2 lines that lift toward the hook
[Chorus]: 4 lines, the hook, built around their name
[Bridge]: 2 lines that turn to what the singer feels
[Outro]: 2 lines that land on their name`

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
Language: ${story.language || 'English'}.
Voice: sung by the person giving it${story.fromName ? ` (${story.fromName})` : ''}, speaking to ${name} as "I" and "you". Never sing the giver's name.

Their story:
${details.length ? details.map((d) => `- ${d}`).join('\n') : '- No details given: keep it warm and specific to the occasion.'}

Structure, about one minute when sung. Put each tag alone on its own line, exactly like this:
${SHAPE}

Rules:
- Weave in every detail naturally, in the singer's own voice. Keep their exact words for the catchphrase and the nickname.
- Never invent facts about the people: no new names, places, jobs or events.
- Use the name "${name}" at least four times, including twice in the [Chorus].
- Every section needs at least one line that could only be about ${name}. No stock party lines ("raise a glass", "hooray", "special day", "shine so bright").
- Lines of 6 to 10 syllables with a steady rhythm, rhyming at the line ends where it feels natural.
- Original lines only; don't quote or imitate existing songs.${story.avoid ? `\n- Leave out completely: ${story.avoid}.` : ''}

Reply with JSON: "title" (2 to 5 words, from their story) and "lyrics" (the tagged lyrics as one string, lines separated by \\n).`
}

export type Section = { label: string; lines: string[] }

// "[Verse 1]\nline\nline\n\n[Chorus]\n…" -> sections. Lines before the first tag go in a "Verse".
export function parseLyrics(text: string): Section[] {
  const sections: Section[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const tag = line.match(/^\[([^\]]+)\]$/)
    if (tag) sections.push({ label: tag[1].trim(), lines: [] })
    else if (line) {
      if (!sections.length) sections.push({ label: 'Verse', lines: [] })
      sections[sections.length - 1].lines.push(line)
    }
  }
  return sections.filter((s) => s.lines.length)
}

export const lyricsText = (sections: Section[]) =>
  sections.map((s) => `[${s.label}]\n${s.lines.join('\n')}`).join('\n\n')
