// Wishly launches in the US. Choices and examples written for other markets
// stay in this file, marked with their market, and appear once that market is
// added to MARKETS.
export type Market = 'us' | 'india' | 'international'
export const MARKETS: Market[] = ['us']
const live = (market?: Market) => !market || MARKETS.includes(market)

// Choices offered in one market only. Anything not listed is offered everywhere.
const MARKET_ONLY: Record<string, Market> = {
  Bollywood: 'india',
  Hindi: 'india',
  Hinglish: 'india',
  French: 'international',
  Portuguese: 'international',
}
const offered = (choice: string) => live(MARKET_ONLY[choice])

export const CURRENCY = 'USD'

// Whole dollars show without cents ($29); anything else shows cents ($5.53).
export const formatPrice = (n: number) => {
  const digits = Number.isInteger(n) ? 0 : 2
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}

export const RELATIONSHIPS = ['Partner', 'Parent', 'Friend', 'Sibling', 'Child', 'Couple', 'Grandparent', 'Colleague', 'Someone else']

const ALL_OCCASIONS = [
  'Birthday', 'Anniversary', 'Wedding', "Valentine's Day", "Mother's Day", "Father's Day",
  'Christmas', 'Milestone', 'Remembrance', 'Just because',
]
// Everyday celebrations only for now (1 Nov 2026). Holidays like Mother's
// Day or Christmas go back in close to their date: add them here then.
const OCCASIONS_ON = ['Birthday', 'Anniversary', 'Milestone']
export const OCCASIONS = ALL_OCCASIONS.filter((o) => OCCASIONS_ON.includes(o))

export const PRONOUNS = ['she/her', 'he/him', 'they/them']

// Soft colours carry the emotional temperature: lilac heartfelt,
// butter bright, mint lively.
export const MOODS: { id: string; label: string; blurb: string; tint: Tint }[] = [
  { id: 'upbeat', label: 'Upbeat', blurb: 'Bright and celebratory', tint: 'butter' },
  { id: 'emotional', label: 'Emotional', blurb: 'Heartfelt, the kind that brings a tear', tint: 'lilac' },
  { id: 'playful', label: 'Playful', blurb: 'Kitchen dancing and family jokes', tint: 'butter' },
  { id: 'romantic', label: 'Romantic', blurb: 'For the one you love', tint: 'lilac' },
  { id: 'energetic', label: 'Energetic', blurb: 'Loud, fast, made to dance to', tint: 'mint' },
]

// One brand, different emotional temperatures.
export type Tint = 'lilac' | 'butter' | 'mint'

export const OCCASION_TONES: Record<string, { line: string; tint: Tint; gentle?: boolean }> = {
  Birthday: { line: 'Make this birthday sound like them.', tint: 'butter' },
  Anniversary: { line: 'Your love story deserves its own song.', tint: 'lilac' },
  Wedding: { line: 'Give their beginning a soundtrack.', tint: 'butter' },
  "Valentine's Day": { line: 'Your love story deserves its own song.', tint: 'lilac' },
  "Mother's Day": { line: 'For the ways she made ordinary days better.', tint: 'mint' },
  "Father's Day": { line: 'For the ways he made ordinary days better.', tint: 'mint' },
  Christmas: { line: 'The best thing under the tree is a story only you could tell.', tint: 'butter' },
  Milestone: { line: 'Look how far they’ve come. Tell them in a song.', tint: 'butter' },
  Remembrance: { line: 'Start with one memory. When you are ready.', tint: 'mint', gentle: true },
  'Just because': { line: 'No big reason. Just your person.', tint: 'lilac' },
}

export const GENRES = ['Pop', 'Rock', 'Electronic', 'Hip Hop', 'R&B', 'Acoustic', 'Country', 'Classical', 'Bollywood'].filter(offered)

export const VOICES = ['Female vocal', 'Male vocal', 'Duet', 'No preference']

// Songs are sung in English only for now (6 Nov 2026): the lyrics model and
// the singer are both told so. Add a language here to offer it again.
const LANGUAGES_ON = ['English']
export const LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'Portuguese'].filter((l) => offered(l) && LANGUAGES_ON.includes(l))

// The prompts that turn "write something nice" into specific, recognisable
// detail. Each opens as a card on Create: `title` and `examples` show on the
// empty card, `tag` labels what they wrote, and the sheet asks `question` with
// `ideas` to tap in as a start.
export type StoryPrompt = {
  key: string
  label: string
  title: string
  tag: string
  examples: string[]
  question: string
  ideas: string[]
  placeholder: string
  short?: boolean
  maxLength: number
}

export const MEMORY_PROMPTS: StoryPrompt[] = [
  {
    key: 'ritual', label: 'One small thing they do that always makes you smile', title: 'Something they do', tag: 'Habit',
    examples: ['Always burns the toast', 'Obsessed with pickleball'],
    question: 'What’s something funny or unique they do every single day?',
    ideas: ['Every morning, they ', 'They can’t walk past a ', 'Whenever music comes on, they '],
    placeholder: 'e.g. Sunday pancakes. He always burns the first one and eats it anyway.', maxLength: 600,
  },
  {
    key: 'inside_joke', label: 'The thing they always say', title: 'What they always say', tag: 'Catchphrase',
    examples: ['It is what it is', 'Did you feed the cat?'],
    question: 'What do they always say? The line everyone could finish for them.',
    ideas: ['When something goes wrong: “', 'Every phone call ends with “', 'Before any trip: “'],
    placeholder: 'e.g. “Five more minutes.” She has never once meant five.', maxLength: 600,
  },
  {
    key: 'nickname', label: 'The name only you call them', title: 'A nickname', tag: 'Nickname',
    examples: ['Captain Chaos', 'Little Pumpkin'],
    question: 'What do you call them that nobody else does?',
    ideas: ['Bubs', 'Champ', 'Sunshine'],
    placeholder: 'e.g. Bubs, Captain, Peanut', short: true, maxLength: 80,
  },
  {
    key: 'memory', label: 'A moment you keep coming back to', title: 'A moment you remember', tag: 'Moment',
    examples: ['Road trip to Big Sur in 2021', 'When we got stuck in the elevator'],
    question: 'Which moment with them do you keep coming back to?',
    ideas: ['The day we first met, ', 'That trip when ', 'The night we '],
    placeholder: 'e.g. Getting lost in Lisbon and finding the best custard tart of our lives', maxLength: 600,
  },
  {
    key: 'want_to_say', label: 'Something you have always wanted to tell them', title: 'What you’d tell them', tag: 'Message',
    examples: ['Thank you for always having my back'],
    question: 'If they only heard one line, what should it say?',
    ideas: ['Thank you for ', 'I’ve never told you that ', 'I’m so proud of you for '],
    placeholder: 'e.g. You made every new city feel like home', maxLength: 600,
  },
]

// Not a detail about them, so it doesn't count toward the song; same card and sheet.
export const AVOID_PROMPT: StoryPrompt = {
  key: 'avoid', label: 'Anything to leave out', title: 'Leave something out', tag: 'Leave out',
  examples: ['Their age', 'Anything about work'],
  question: 'Anything the song should stay away from?',
  ideas: ['Their age', 'Exes', 'Work'],
  placeholder: 'Topics, words or names that shouldn’t appear', maxLength: 300,
}

export const STORY_PROMPTS = [...MEMORY_PROMPTS, AVOID_PROMPT]

// Rotate under the story cards on Create.
export const STORY_TIPS = [
  'Specific places, pet names and inside jokes make the song sound like them.',
  'Use their exact words. “Did you feed the cat?” beats “they’re caring.”',
  'Small and specific wins: “burns the first pancake” over “loves cooking.”',
  'One true detail is enough to begin. You can add more any time.',
]

// How people pay, confirmed 13 Nov 2026: one song, or a monthly or yearly plan
// with 3 songs a month. Payment goes through Apple, so each plan is an App
// Store product with the id below, and its price in App Store Connect must
// match the one here. No free trial; unused songs don't carry over.
export const SONGS_PER_MONTH = 3
export type PlanId = 'song' | 'monthly' | 'yearly'
export type Plan = { id: PlanId; productId: string; name: string; price: number; per?: 'month' | 'year' }
export const PLANS: Plan[] = [
  { id: 'song', productId: 'com.hypergro.wishly.song', name: 'One song', price: 29 },
  { id: 'monthly', productId: 'com.hypergro.wishly.monthly', name: 'Monthly', price: 39, per: 'month' },
  { id: 'yearly', productId: 'com.hypergro.wishly.yearly', name: 'Yearly', price: 199, per: 'year' },
]
export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!

// What one song works out to on each plan, rounded to the cent.
export const pricePerSong = (p: Plan) =>
  Math.round((p.per === 'year' ? p.price / (SONGS_PER_MONTH * 12) : p.per === 'month' ? p.price / SONGS_PER_MONTH : p.price) * 100) / 100

// "Save 57%": yearly against twelve months of the monthly plan.
export const yearlySaving = () => Math.round((1 - planById('yearly').price / (planById('monthly').price * 12)) * 100)

export const CORE_PACKAGE = {
  id: 'core',
  name: 'Your song',
  price: planById('song').price,
  includes: [
    'A complete song, about 1 minute',
    'Lyrics written from the details you share',
    'A private listening page with your message. No account needed to listen',
    'You listen and check names, pronunciation and facts before it is given',
    'One correction round included',
  ],
}

// Songs are ready in a minute or two, so there's one delivery and no Express.
export const DELIVERY = [
  { id: 'standard', label: 'Standard', days: 0, price: 0 },
]

const ALL_EXTRAS = [
  { id: 'photo_film', label: 'Photo film', price: 19, blurb: 'Your photos set to the song, ready to play at a party' },
  { id: 'lyric_art', label: 'Lyric artwork', price: 12, blurb: 'A printable keepsake of the lyrics' },
  { id: 'share_video', label: 'Short share video', price: 9, blurb: 'A 30-second vertical clip for stories' },
]
// None of the extras are made yet, so none are offered. Add an id here to offer it.
const EXTRAS_ON: string[] = []
export const EXTRAS = ALL_EXTRAS.filter((e) => EXTRAS_ON.includes(e.id))

export function quote({ delivery = 'standard', extras = [] as string[] }: { delivery?: string; extras?: string[] }) {
  const d = DELIVERY.find((x) => x.id === delivery) || DELIVERY[0]
  const extraTotal = EXTRAS.filter((e) => extras.includes(e.id)).reduce((s, e) => s + e.price, 0)
  const readyBy = new Date()
  readyBy.setDate(readyBy.getDate() + d.days)
  return { total: CORE_PACKAGE.price + d.price + extraTotal, readyBy: readyBy.toISOString(), delivery: d }
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// Example songs. Photography is illustrative and does not show real customers.
export type Example = {
  id: string
  title: string
  for: string
  occasion: string
  mood: string // music-box mood id
  tags: string[]
  photo: number | null
  photoAlt: string
  tint: Tint
  coverName: string
  lines: string[] // a few lines to quote on cards
  // A real song made with the Wishly song engine, and its full lyrics. Only
  // examples with a recording are shown: a music-only preview doesn't show
  // people what they'd get.
  art?: number // which cover artwork (0–4), for examples without a photo
  audio?: number
  sections?: { label: string; lines: string[] }[]
  market?: Market // only shown in this market
}

const ALL_EXAMPLES: Example[] = [
  {
    id: 'ex1',
    title: 'Five More Minutes',
    for: 'For Maya, from her husband',
    occasion: 'Anniversary',
    mood: 'tender',
    tags: ['Anniversary', 'Romantic', 'Acoustic'],
    photo: require('../../assets/brand/sunday-pancakes.jpg'),
    photoAlt: 'A couple laughing on the kitchen floor over a stack of pancakes',
    tint: 'lilac',
    coverName: 'Maya',
    lines: [
      'You whisper five more minutes from the bed',
      'On Sunday mornings, Maya, at the stove',
      'You made every new city feel like home',
      'With you, my Maya, I never look back',
    ],
    audio: require('../../assets/audio/examples/maya.mp3'),
    sections: [
      {
        label: 'Verse',
        lines: [
          'You whisper five more minutes from the bed,',
          'Though you have never meant just five instead.',
          'On Sunday mornings, Maya, at the stove,',
          'You eat the first burned pancake that you strove.',
        ],
      },
      {
        label: 'Chorus',
        lines: [
          'Oh Maya, sweet Bubs, look how far we roam,',
          'You made every new city feel like home.',
          'Through every single box we had to pack,',
          'With you, my Maya, I never look back.',
        ],
      },
      { label: 'Outro', lines: ['I love our Sunday mornings, my sweet Maya.'] },
    ],
  },
  {
    id: 'ex2',
    title: 'Seven-Stop Map',
    for: 'For Mei, from her friends',
    occasion: 'Birthday',
    mood: 'joyful',
    tags: ['Birthday', 'Upbeat', 'Pop'],
    photo: require('../../assets/brand/friend-birthday.jpg'),
    photoAlt: 'Friends laughing around a birthday cake at a crowded table',
    tint: 'butter',
    coverName: 'Mei',
    lines: [
      'You plan every trip we take, Mei',
      'With a seven-stop map for the day',
      'Walked home singing with all our might',
      'Happy birthday to you, sweet Mei',
    ],
    audio: require('../../assets/audio/examples/mei.mp3'),
    sections: [
      {
        label: 'Verse',
        lines: [
          'You plan every trip we take, Mei',
          'With a seven-stop map for the day',
          'A forty-minute nap on the way',
          'Then you are ready to go and play',
        ],
      },
      {
        label: 'Chorus',
        lines: [
          'Oh Mei, remember that late night',
          'We missed the last train out of sight',
          'Walked home singing with all our might',
          'Happy birthday to you, sweet Mei',
        ],
      },
      { label: 'Outro', lines: ['Walking and singing with you, dear Mei'] },
    ],
  },
  {
    id: 'ex3',
    title: 'Never Made a Fuss',
    for: 'For Mom, from her daughter',
    occasion: "Mother's Day",
    mood: 'tender',
    tags: ['Mother’s Day', 'Emotional', 'Acoustic'],
    photo: null,
    photoAlt: '',
    tint: 'mint',
    coverName: 'Mom',
    lines: [
      'Coffee at six before the house was even up',
      'You saved the biggest piece and called the broken one your cup',
      'Mom, all the things you never made a fuss about',
      'I noticed every one. I’m singing them out loud',
    ],
  },
  {
    id: 'ex3-india',
    title: 'Never Made a Fuss',
    for: 'For Amma, from her daughter',
    occasion: "Mother's Day",
    mood: 'tender',
    tags: ['Mother’s Day', 'Emotional', 'Acoustic'],
    photo: require('../../assets/brand/hero-recognition.jpg'),
    photoAlt: 'An older woman listening on headphones while her daughter watches her smile',
    tint: 'mint',
    coverName: 'Amma',
    lines: [
      'Chai at six before the house was even up',
      'You saved the biggest piece and called the broken one your cup',
      'Amma, all the things you never made a fuss about',
      'I noticed every one. I’m singing them out loud',
    ],
    market: 'india',
  },
  {
    id: 'ex4',
    title: 'Captain of the Kitchen',
    for: 'For Dad, from his three kids',
    occasion: 'Birthday',
    mood: 'playful',
    tags: ['Birthday', 'Playful', 'Acoustic'],
    photo: null,
    photoAlt: '',
    tint: 'mint',
    coverName: 'Dad',
    lines: [
      'Dad, you are the Captain of the Kitchen',
      'Saturday pancakes and singing to the radio',
      'Happy birthday to our favorite Dad',
      'I know we would choose you all over again',
    ],
    art: 1,
    audio: require('../../assets/audio/examples/dad.mp3'),
    sections: [
      {
        label: 'Verse',
        lines: [
          'Dad, you are the Captain of the Kitchen,',
          'Saturday pancakes and singing to the radio.',
          'You set off the smoke alarm every single time,',
          'Just to let the whole neighborhood know.',
        ],
      },
      {
        label: 'Chorus',
        lines: [
          'Oh Dad, you taught the three of us to ride,',
          'In that same empty parking lot back then.',
          'Happy birthday to our favorite Dad,',
          'I know we would choose you all over again.',
        ],
      },
      {
        label: 'Outro',
        lines: [
          'Put the spatula down now, Dad.',
        ],
      },
    ],
  },
  {
    id: 'ex5',
    title: 'Custard Tart Streets',
    for: 'For Jess, from Sam',
    occasion: 'Just because',
    mood: 'tender',
    tags: ['Just because', 'Emotional', 'Acoustic'],
    photo: null,
    photoAlt: '',
    tint: 'lilac',
    coverName: 'Lisbon',
    lines: [
      'We got lost in Lisbon with the map upside down',
      'Found a custard tart that turned the whole day around',
      'Jess, every street we walk feels like it’s ours',
      'You make a new city feel like home beneath the stars',
    ],
  },
  {
    id: 'ex6',
    title: 'Sweet Tea and Peach Pie',
    for: 'For Grandma, from all of us',
    occasion: 'Milestone',
    mood: 'nostalgic',
    tags: ['Milestone', 'Emotional', 'Country'],
    photo: null,
    photoAlt: '',
    tint: 'butter',
    coverName: 'Grandma',
    lines: [
      'Sweet tea on the front porch swing',
      'You taught us to bake peach pie',
      'Ninety years, oh sweet Grandma',
      'Still the heart of our family, Grandma',
    ],
    art: 4,
    audio: require('../../assets/audio/examples/grandma.mp3'),
    sections: [
      {
        label: 'Verse',
        lines: [
          'Sweet tea on the front porch swing',
          'Every July evening with you',
          'Grandma, when I was your age',
          'Begins every story so true',
        ],
      },
      {
        label: 'Chorus',
        lines: [
          'You taught us to bake peach pie',
          'Never wrote the recipe down',
          'Ninety years, oh sweet Grandma',
          'Grandma, you are the heart of this family',
        ],
      },
      {
        label: 'Outro',
        lines: [
          'Still the heart of our family, Grandma',
        ],
      },
    ],
  },
  {
    id: 'ex7',
    title: 'Five Alarms and Graduating',
    for: 'For Leo, from Mom',
    occasion: 'Milestone',
    mood: 'joyful',
    tags: ['Milestone', 'Upbeat', 'Pop'],
    photo: null,
    photoAlt: '',
    tint: 'mint',
    coverName: 'Leo',
    lines: [
      'First day of kindergarten, Leo',
      'Five alarms and still late for the bus',
      'Oh Leo, look how far you came',
      'I am so proud of who you became',
    ],
    art: 2,
    audio: require('../../assets/audio/examples/leo.mp3'),
    sections: [
      {
        label: 'Verse',
        lines: [
          'First day of kindergarten, Leo,',
          'You refused to let go of my hand.',
          'Late-night study snacks at the kitchen table,',
          "Now you're a graduating man.",
        ],
      },
      {
        label: 'Chorus',
        lines: [
          'Oh Leo, you always make a fuss,',
          'Five alarms and still late for the bus!',
          'Oh Leo, look how far you came,',
          'I am so proud of who you became.',
        ],
      },
      {
        label: 'Outro',
        lines: [
          'Keep chasing those midnight snacks, my Leo.',
        ],
      },
    ],
  },
  {
    id: 'ex6-india',
    title: 'Ninety Summers',
    for: 'For Nani, from all of us',
    occasion: 'Milestone',
    mood: 'nostalgic',
    tags: ['Milestone', 'Emotional', 'Bollywood'],
    photo: null,
    photoAlt: '',
    tint: 'butter',
    coverName: 'Nani',
    lines: [
      'Ninety summers on the veranda swing',
      'Mango season and the songs you used to sing',
      'Every story starts with “When I was your age”',
      'Nani, you’re the first line on every page',
    ],
    market: 'india',
  },
]

export const EXAMPLES = ALL_EXAMPLES.filter((e) => e.audio && live(e.market) && OCCASIONS.includes(e.occasion))
// The welcome screen's photo and song: a birthday, since that's what Wishly leads with.
export const HERO_EXAMPLE = ALL_EXAMPLES.find((e) => e.id === 'ex2')!
