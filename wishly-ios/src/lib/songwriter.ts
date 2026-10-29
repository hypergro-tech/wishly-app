export type Song = {
  title: string
  style?: string
  duration_sec?: number
  audio_url?: string | null
  // The spelling the singer was given, e.g. "Shivawn" for Siobhan.
  sung_as?: string
  sections: { label: string; lines: string[] }[]
}

// Template songwriter used until a real model (Base44 InvokeLLM) and a
// vocal/music generator are connected. It builds a structured song from the
// brief so the review, correction and gift flows can be exercised end to end.

const clean = (s: string = '') => s.trim().replace(/^["“]|["”]$/g, '').replace(/[.!]+$/, '')
const PROPER = /^(I|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b/
const lower = (s: string) => (s && !PROPER.test(s) ? s[0].toLowerCase() + s.slice(1) : s)
const firstSentence = (s: string = '') => clean(s.trim().split(/(?<=[.!?])\s+/)[0])
// "Five more minutes." She never means five  ->  Five more minutes
const catchphraseOf = (s: string = '') => {
  const q = s.match(/["“]([^"”]+)["”]/)
  return clean(q ? q[1] : s.split(/\s[—–-]\s/)[0]).replace(/[.,!?]+$/, '')
}

const OPENERS: Record<string, string> = {
  tender: 'Some things are too small to say out loud',
  joyful: "Turn it up, turn it up, it's a day for you",
  playful: "Okay, listen, I've got something to confess",
  nostalgic: 'Remember when the days were long and slow',
  reflective: 'I keep you in the quiet parts of every day',
}

const OCCASION_LINES: Record<string, string> = {
  Birthday: 'So here’s to another year of you',
  Anniversary: 'Every year with you, I’d choose again',
  Wedding: 'Today we start the rest of it, side by side',
  "Valentine's Day": 'No roses ever said it quite like this',
  "Mother's Day": 'Everything I am began with you',
  "Father's Day": 'Everything I am began with you',
  Christmas: 'The best thing under any tree is you',
  Milestone: 'Look how far you’ve come, look at you go',
  Remembrance: 'You’re still here in every song I know',
  'Just because': 'No reason, no occasion, only you',
}

export function writeSong(order: any): Song {
  const { recipient, memories = {}, music = {}, occasion } = order
  const name = recipient.name.trim()
  const call = clean(memories.nickname) || name
  const mood = music.mood || 'tender'
  const m = {
    ritual: firstSentence(memories.ritual),
    joke: clean(memories.inside_joke),
    memory: firstSentence(memories.memory),
    say: firstSentence(memories.want_to_say),
  }
  const catchphrase = catchphraseOf(memories.inside_joke)

  const verse1 = [
    OPENERS[mood] || OPENERS.tender,
    m.ritual ? `Like ${lower(m.ritual)}` : 'Like the way you hum when you think no one hears',
    m.joke ? `And you still say "${catchphrase}"` : 'And you laugh before the punchline every time',
    `${call}, that’s the stuff I wouldn’t trade`,
  ]

  const chorus = [
    `Oh ${name}, ${name}, this one’s yours`,
    m.say ? lower(m.say) : 'you make the ordinary feel like more',
    OCCASION_LINES[occasion] || OCCASION_LINES['Just because'],
    `Oh ${name}, this one’s yours`,
  ]

  const verse2 = [
    m.memory ? `I think about ${lower(m.memory)}` : 'I think about the nights we stayed up way too late',
    'How we didn’t know then it would matter this much',
    'All the little things that only we would catch',
    `${call}, that’s the story, that’s us`,
  ]

  const bridge = [
    'If I could write it down in one line',
    `It would just be your name, ${name}, every time`,
  ]

  const title = memories.nickname
    ? `${clean(memories.nickname)}`
    : m.joke
      ? `"${catchphrase}"`
      : `This One’s Yours, ${name}`

  return {
    title,
    style: [music.genre, music.voice !== 'No preference' && music.voice, music.language].filter(Boolean).join(' · '),
    duration_sec: 168,
    audio_url: null,
    sections: [
      { label: 'Verse 1', lines: verse1 },
      { label: 'Chorus', lines: chorus },
      { label: 'Verse 2', lines: verse2 },
      { label: 'Chorus', lines: chorus },
      { label: 'Bridge', lines: bridge },
      { label: 'Chorus', lines: chorus },
    ],
  }
}

export function buildSongPrompt(order: any) {
  return [
    'Write lyrics for a personal gift song. Specific details must carry the emotion;',
    'use the details verbatim where natural and never invent facts about the people.',
    JSON.stringify({
      recipient: order.recipient,
      occasion: order.occasion,
      memories: order.memories,
      music: order.music,
      from: order.buyer?.name,
    }),
  ].join('\n')
}

export const SONG_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    sections: {
      type: 'array',
      items: { type: 'object', properties: { label: { type: 'string' }, lines: { type: 'array', items: { type: 'string' } } } },
    },
  },
}
