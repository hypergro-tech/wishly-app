// One song's payload for the music model: a title, bracket-tagged lyrics and
// sound tags. The backend builds it from the saved order (startSong saves the
// template, makeSong has Gemini rewrite the lyrics from `lyricPrompt`, then
// Lyria sings them to `styleTags`); the app uses it for the demo and previews.

import { writeSong, type Song } from './songwriter.ts'
import type { Mood, SongInputs, SongPayload, Style, Voice } from './songEngine.ts'
import { buildLyricPrompt, lyricsText, parseLyrics } from './lyricGenerator.ts'
import { compileStylePrompt } from './soundMapper.ts'

export function generateSongPayload(inputs: SongInputs): SongPayload {
  const { story, mood, style, voice } = inputs
  const template = writeSong(briefOf(inputs))
  return {
    title: template.title,
    lyrics: lyricsText(template.sections),
    styleTags: compileStylePrompt(mood, style, voice),
    lyricPrompt: buildLyricPrompt(story, mood, story.occasion),
  }
}

// The song saved with the order before the model's lyrics are written: the
// template lyrics, which stay if writing fails.
export function startingSong(brief: BriefLike, { title, lyrics, styleTags }: SongPayload): Song {
  const { genre, voice } = brief.music
  return {
    title,
    style: [genre, voice !== 'No preference' && voice, 'English'].filter(Boolean).join(' · '),
    style_tags: styleTags,
    duration_sec: 60,
    audio_url: null,
    sections: parseLyrics(lyrics),
  }
}

// What Create saves (an Order's brief) as the engine's inputs.
type BriefLike = {
  recipient: { name: string; pronunciation?: string; pronouns?: string; relationship?: string }
  occasion: string
  memories: Record<string, string | undefined>
  music: { mood?: string; genre?: string; voice?: string; language?: string }
  buyer?: { name?: string }
}

const MOODS: Mood[] = ['Upbeat', 'Emotional', 'Playful', 'Romantic', 'Energetic']
// Moods from before the five above, on older orders.
const OLD_MOODS: Record<string, Mood> = { tender: 'Emotional', joyful: 'Upbeat', nostalgic: 'Emotional', reflective: 'Emotional' }
const STYLES: Style[] = ['Pop', 'Rock', 'Electronic', 'Hip Hop', 'R&B', 'Acoustic', 'Country', 'Classical']
const VOICES: Record<string, Voice> = { 'Female vocal': 'Female', 'Male vocal': 'Male', Duet: 'Duet', 'No preference': 'Any' }

const moodOf = (id = '') => MOODS.find((m) => m.toLowerCase() === id.toLowerCase()) ?? OLD_MOODS[id.toLowerCase()] ?? 'Upbeat'
const text = (s?: string) => s?.trim() ?? ''

export function songInputs(brief: BriefLike): SongInputs {
  const { recipient: r, memories: m, music } = brief
  return {
    mood: moodOf(music.mood),
    style: STYLES.find((s) => s === music.genre) ?? 'Pop',
    voice: VOICES[music.voice ?? ''] ?? 'Any',
    story: {
      recipientName: text(r.name),
      sungAs: text(r.pronunciation),
      pronouns: text(r.pronouns),
      relationship: text(r.relationship),
      occasion: text(brief.occasion),
      nickname: text(m.nickname),
      catchphrase: text(m.inside_joke),
      ritual: text(m.ritual),
      memory: text(m.memory),
      wantToSay: text(m.want_to_say),
      avoid: text(m.avoid),
      fromName: text(brief.buyer?.name),
      // Songs are sung in English only (6 Nov 2026), whatever an older order says.
      language: 'English',
    },
  }
}

// The template songwriter reads the brief's shape.
function briefOf({ story, mood, style, voice }: SongInputs) {
  return {
    recipient: { name: story.recipientName },
    occasion: story.occasion,
    memories: { nickname: story.nickname, inside_joke: story.catchphrase, ritual: story.ritual, memory: story.memory, want_to_say: story.wantToSay },
    music: {
      mood: mood.toLowerCase(),
      genre: style,
      voice: Object.keys(VOICES).find((k) => VOICES[k] === voice),
      language: story.language,
    },
  }
}
