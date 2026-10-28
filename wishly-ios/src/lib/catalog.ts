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

export const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(n)

export const RELATIONSHIPS = ['Partner', 'Parent', 'Friend', 'Sibling', 'Child', 'Couple', 'Grandparent', 'Colleague', 'Someone else']

export const OCCASIONS = [
  'Birthday', 'Anniversary', 'Wedding', "Valentine's Day", "Mother's Day", "Father's Day",
  'Christmas', 'Milestone', 'Remembrance', 'Just because',
]

export const PRONOUNS = ['she/her', 'he/him', 'they/them']

// Soft colours carry the emotional temperature: lilac reflective,
// butter joyful, mint quiet.
export const MOODS: { id: string; label: string; blurb: string; tint: Tint }[] = [
  { id: 'tender', label: 'Tender', blurb: 'Soft, warm, close', tint: 'lilac' },
  { id: 'joyful', label: 'Joyful', blurb: 'Bright and celebratory', tint: 'butter' },
  { id: 'playful', label: 'Playful', blurb: 'Kitchen dancing and family jokes', tint: 'butter' },
  { id: 'nostalgic', label: 'Nostalgic', blurb: 'Looking back together', tint: 'lilac' },
  { id: 'reflective', label: 'Gentle', blurb: 'Patient, for remembering', tint: 'mint' },
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

export const GENRES = ['Acoustic', 'Pop', 'Piano ballad', 'Folk', 'Country', 'R&B', 'Bollywood', 'Lullaby'].filter(offered)

export const VOICES = ['Female vocal', 'Male vocal', 'Duet', 'No preference']

export const LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'Portuguese'].filter(offered)

// The prompts that turn "write something nice" into specific, recognisable detail.
// The prompts that turn "write something nice" into specific, recognisable
// detail. `title` labels a filled detail, `chip` adds an empty one.
export const MEMORY_PROMPTS: { key: string; label: string; title: string; chip: string; placeholder: string; short?: boolean }[] = [
  { key: 'ritual', label: 'One small thing they do that always makes you smile', title: 'Something they do that makes you smile', chip: 'Something they do', placeholder: 'e.g. Sunday pancakes. He always burns the first one and eats it anyway.' },
  { key: 'inside_joke', label: 'The thing they always say', title: 'The thing they always say', chip: 'What they always say', placeholder: 'e.g. "Five more minutes." She has never once meant five.' },
  { key: 'nickname', label: 'The name only you call them', title: 'The name only you call them', chip: 'A nickname', placeholder: 'e.g. Bubs, Captain, Peanut', short: true },
  { key: 'memory', label: 'A moment you keep coming back to', title: 'A moment you remember', chip: 'A moment you remember', placeholder: 'e.g. Getting lost in Lisbon and finding the best custard tart of our lives' },
  { key: 'want_to_say', label: 'Something you have always wanted to tell them', title: 'What you’d tell them', chip: 'What you’d tell them', placeholder: 'e.g. You made every new city feel like home' },
]

export const CORE_PACKAGE = {
  id: 'core',
  name: 'Personal Song',
  price: 59,
  includes: [
    'A complete song, about 2½ to 3 minutes',
    'Lyrics written from the details you share',
    'A private listening page with your message. No account needed to listen',
    'You listen and check names, pronunciation and facts before it is given',
    'One correction round included',
  ],
}

export const DELIVERY = [
  { id: 'standard', label: 'Standard', days: 3, price: 0 },
  { id: 'express', label: 'Express', days: 1, price: 25 },
]

export const EXTRAS = [
  { id: 'photo_film', label: 'Photo film', price: 19, blurb: 'Your photos set to the song, ready to play at a party' },
  { id: 'lyric_art', label: 'Lyric artwork', price: 12, blurb: 'A printable keepsake of the lyrics' },
  { id: 'share_video', label: 'Short share video', price: 9, blurb: 'A 30-second vertical clip for stories' },
]

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
  lines: string[]
  market?: Market // only shown in this market
}

const ALL_EXAMPLES: Example[] = [
  {
    id: 'ex1',
    title: 'Five More Minutes',
    for: 'For Maya, from her husband',
    occasion: 'Anniversary',
    mood: 'playful',
    tags: ['Anniversary', 'Playful', 'Acoustic'],
    photo: require('../../assets/brand/sunday-pancakes.jpg'),
    photoAlt: 'A couple laughing on the kitchen floor over a stack of pancakes',
    tint: 'lilac',
    coverName: 'Maya',
    lines: [
      'You say "five more minutes" and I know what that means',
      'Half an hour of sunlight spilling through the seams',
      'Sunday pancakes, and the first one always burns',
      'Ten years in, Maya, and it’s still my favorite turn',
    ],
  },
  {
    id: 'ex2',
    title: 'Every Plan Better',
    for: 'For Mei, from her roommates',
    occasion: 'Birthday',
    mood: 'joyful',
    tags: ['Birthday', 'Joyful', 'Pop'],
    photo: require('../../assets/brand/friend-birthday.jpg'),
    photoAlt: 'Friends laughing around a birthday cake at a crowded table',
    tint: 'butter',
    coverName: 'Mei',
    lines: [
      'Group chat’s gone quiet, then Mei sends a map',
      'Seven stops, a picnic and a forty-minute nap',
      'You turn a Tuesday into something we retell',
      'Happy birthday to the friend who plans it all so well',
    ],
  },
  {
    id: 'ex3',
    title: 'Never Made a Fuss',
    for: 'For Mom, from her daughter',
    occasion: "Mother's Day",
    mood: 'tender',
    tags: ['Mother’s Day', 'Tender', 'Piano ballad'],
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
    tags: ['Mother’s Day', 'Tender', 'Piano ballad'],
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
    occasion: "Father's Day",
    mood: 'playful',
    tags: ['Father’s Day', 'Playful', 'Folk'],
    photo: null,
    photoAlt: '',
    tint: 'mint',
    coverName: 'Dad',
    lines: [
      'Captain of the kitchen with a dish towel on your arm',
      'Singing to the radio and setting off the alarm',
      'Every Saturday the onions and the rain',
      'Dad, we’d choose you all over again',
    ],
  },
  {
    id: 'ex5',
    title: 'Custard Tart Streets',
    for: 'For Jess, from Sam',
    occasion: 'Just because',
    mood: 'tender',
    tags: ['Just because', 'Tender', 'Piano ballad'],
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
    title: 'Ninety Summers',
    for: 'For Grandma, from all of us',
    occasion: 'Milestone',
    mood: 'nostalgic',
    tags: ['Milestone', 'Nostalgic', 'Country'],
    photo: null,
    photoAlt: '',
    tint: 'butter',
    coverName: 'Grandma',
    lines: [
      'Ninety summers on the front porch swing',
      'Sweet tea in July and the songs you used to sing',
      'Every story starts with “When I was your age”',
      'Grandma, you’re the first line on every page',
    ],
  },
  {
    id: 'ex6-india',
    title: 'Ninety Summers',
    for: 'For Nani, from all of us',
    occasion: 'Milestone',
    mood: 'nostalgic',
    tags: ['Milestone', 'Nostalgic', 'Bollywood'],
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

export const EXAMPLES = ALL_EXAMPLES.filter((e) => live(e.market))
