// The song engine's inputs and output: what the buyer chose on Create, and the
// payload the music model sings from. Plain types only, so the song-test
// scripts can import the engine outside the app.

export type Mood = 'Upbeat' | 'Emotional' | 'Playful' | 'Romantic' | 'Energetic'

export type Style = 'Pop' | 'Rock' | 'Electronic' | 'Hip Hop' | 'R&B' | 'Acoustic' | 'Country' | 'Classical'

export type Voice = 'Female' | 'Male' | 'Duet' | 'Any'

// Everything the buyer told us about the person. Empty strings mean "not given".
export type UserStoryDetails = {
  recipientName: string
  // The sounds-like spelling the singer is given, e.g. "Shivawn" for Siobhan.
  sungAs: string
  pronouns: string
  relationship: string
  occasion: string
  nickname: string
  // "The thing they always say".
  catchphrase: string
  // "Something they do that makes you smile".
  ritual: string
  memory: string
  wantToSay: string
  // Topics, words or names that must not appear.
  avoid: string
  fromName: string
  language: string
}

export type SongInputs = {
  story: UserStoryDetails
  mood: Mood
  style: Style
  voice: Voice
}

export type SongPayload = {
  title: string
  // Bracket-tagged lyrics: "[Short Intro]\n\n[Verse]\n…\n\n[Chorus]\n…\n\n[Fade Out]\n[End]". These are the
  // template lyrics; the backend replaces them with ones written from `lyricPrompt`.
  lyrics: string
  // Comma-separated sound tags for the music model, under 120 characters.
  styleTags: string
  // The system prompt the lyrics model writes from.
  lyricPrompt: string
}
