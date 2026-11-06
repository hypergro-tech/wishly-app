// Turns the buyer's Mood, Style and Voice into the short tag list the music
// model sings to, e.g. "acoustic pop, fingerpicked guitar, soft piano,
// heartfelt slow build, 86 bpm, warm female vocal, intimate room sound".
// Plain musical words only: no artist names, and nothing about gifts (wording
// like "a personal gift" made Lyria refuse whole songs, 30 Oct 2026).

import type { Mood, Style, Voice } from '../types/songEngine.ts'

export const MAX_STYLE_TAGS = 120

type StyleSound = {
  genre: string
  instruments: string[] // most characteristic first
  production: string
  bpm: [number, number] // slowest and fastest that still sound like the style
  texture: string // how the voice sits in this style
}

export const STYLE_SOUNDS: Record<Style, StyleSound> = {
  Pop: { genre: 'modern pop', instruments: ['punchy drums', 'glossy synths', 'bright piano'], production: 'polished radio mix', bpm: [96, 124], texture: 'crisp' },
  Rock: { genre: 'pop rock', instruments: ['driving electric guitars', 'live drums', 'bass guitar'], production: 'big room mix', bpm: [100, 140], texture: 'gritty' },
  Electronic: { genre: 'electropop', instruments: ['pulsing synth bass', 'four-on-the-floor kick', 'shimmering arps'], production: 'wide club mix', bpm: [110, 128], texture: 'airy' },
  'Hip Hop': { genre: 'melodic hip hop', instruments: ['boom bap drums', '808 bass', 'soulful keys'], production: 'warm vinyl texture', bpm: [84, 98], texture: 'rhythmic' },
  'R&B': { genre: 'smooth R&B', instruments: ['silky Rhodes', 'finger snaps', 'deep bass'], production: 'late-night mix', bpm: [68, 92], texture: 'soulful' },
  Acoustic: { genre: 'acoustic pop', instruments: ['fingerpicked guitar', 'soft piano', 'light percussion'], production: 'intimate room sound', bpm: [80, 112], texture: 'warm' },
  Country: { genre: 'modern country', instruments: ['acoustic guitar', 'pedal steel', 'banjo'], production: 'Nashville polish', bpm: [88, 118], texture: 'heartfelt' },
  Classical: { genre: 'orchestral pop', instruments: ['string quartet', 'grand piano', 'soft harp'], production: 'cinematic hall reverb', bpm: [64, 90], texture: 'clear' },
}

type MoodSound = {
  feel: string
  energy: number // 0 = the style's slowest tempo, 1 = its fastest
}

export const MOOD_SOUNDS: Record<Mood, MoodSound> = {
  Upbeat: { feel: 'bright celebratory hooks', energy: 0.75 },
  Emotional: { feel: 'heartfelt slow build', energy: 0.15 },
  Playful: { feel: 'bouncy and cheeky', energy: 0.6 },
  Romantic: { feel: 'tender and intimate', energy: 0.3 },
  Energetic: { feel: 'high-energy anthem', energy: 1 },
}

export const VOICE_SOUNDS: Record<Voice, string> = {
  Female: 'female vocal',
  Male: 'male vocal',
  Duet: 'male and female duet',
  Any: 'lead vocal',
}

export const tempoFor = (mood: Mood, style: Style) => {
  const [slow, fast] = STYLE_SOUNDS[style].bpm
  return Math.round(slow + (fast - slow) * MOOD_SOUNDS[mood].energy)
}

// Tags in order of importance; the least important are dropped first until
// the list fits in MAX_STYLE_TAGS characters.
export function compileStylePrompt(mood: Mood, style: Style, voice: Voice) {
  const s = STYLE_SOUNDS[style]
  const tags = [
    s.genre,
    `${s.texture} ${VOICE_SOUNDS[voice]}`,
    MOOD_SOUNDS[mood].feel,
    `${tempoFor(mood, style)} bpm`,
    s.instruments[0],
    s.instruments[1],
    s.production,
    s.instruments[2],
  ]
  const order = [...tags]
  while (order.join(', ').length > MAX_STYLE_TAGS && order.length > 1) order.pop()
  return order.join(', ')
}
