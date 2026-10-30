// Wishly launches in the US. Choices and examples written for other markets
// stay in this file, marked with their market, and appear once that market is
// added to MARKETS.
export const MARKETS = ['us']
const live = (market) => !market || MARKETS.includes(market)

// Choices offered in one market only. Anything not listed is offered everywhere.
const MARKET_ONLY = {
  Bollywood: 'india',
  Hindi: 'india',
  Hinglish: 'india',
  French: 'international',
  Portuguese: 'international',
}
const offered = (choice) => live(MARKET_ONLY[choice])

export const CURRENCY = 'USD'

export const formatPrice = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(n)

export const RELATIONSHIPS = ['Partner', 'Parent', 'Friend', 'Sibling', 'Child', 'Couple', 'Grandparent', 'Colleague', 'Someone else']

export const OCCASIONS = [
  'Birthday', 'Anniversary', 'Wedding', "Valentine's Day", "Mother's Day", "Father's Day",
  'Christmas', 'Milestone', 'Remembrance', 'Just because',
]

export const PRONOUNS = ['she/her', 'he/him', 'they/them']

// Soft colours carry the emotional temperature: lilac reflective,
// butter joyful, mint quiet.
export const MOODS = [
  { id: 'tender', label: 'Tender', blurb: 'Soft, warm, close', tint: 'bg-lilac' },
  { id: 'joyful', label: 'Joyful', blurb: 'Bright and celebratory', tint: 'bg-butter' },
  { id: 'playful', label: 'Playful', blurb: 'Kitchen dancing and family jokes', tint: 'bg-butter' },
  { id: 'nostalgic', label: 'Nostalgic', blurb: 'Looking back together', tint: 'bg-lilac' },
  { id: 'reflective', label: 'Gentle', blurb: 'Patient, for remembering', tint: 'bg-mint' },
]

// One brand, different emotional temperatures.
export const OCCASION_TONES = {
  Birthday: { line: 'Make this birthday sound like them.', tint: 'bg-butter' },
  Anniversary: { line: 'Your love story deserves its own song.', tint: 'bg-lilac' },
  Wedding: { line: 'Give their beginning a soundtrack.', tint: 'bg-butter' },
  "Valentine's Day": { line: 'Your love story deserves its own song.', tint: 'bg-lilac' },
  "Mother's Day": { line: 'For the ways she made ordinary days better.', tint: 'bg-mint' },
  "Father's Day": { line: 'For the ways he made ordinary days better.', tint: 'bg-mint' },
  Christmas: { line: 'The best thing under the tree is a story only you could tell.', tint: 'bg-butter' },
  Milestone: { line: 'Look how far they’ve come. Tell them in a song.', tint: 'bg-butter' },
  Remembrance: { line: 'Start with one memory. When you are ready.', tint: 'bg-mint', gentle: true },
  'Just because': { line: 'No big reason. Just your person.', tint: 'bg-lilac' },
}

export const GENRES = ['Acoustic', 'Pop', 'Piano ballad', 'Folk', 'Country', 'R&B', 'Bollywood', 'Lullaby'].filter(offered)

export const VOICES = ['Female vocal', 'Male vocal', 'Duet', 'No preference']

export const LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'Portuguese'].filter(offered)

// The prompts that turn "write something nice" into specific, recognisable detail.
export const MEMORY_PROMPTS = [
  { key: 'ritual', label: 'One small thing they do that always makes you smile', placeholder: 'e.g. Sunday pancakes. He always burns the first one and eats it anyway.' },
  { key: 'nickname', label: 'The name only you call them', placeholder: 'e.g. Bubs, Captain, Peanut', short: true },
  { key: 'inside_joke', label: 'The thing they always say', placeholder: 'e.g. "Five more minutes." She has never once meant five.' },
  { key: 'memory', label: 'A moment you keep coming back to', placeholder: 'e.g. Getting lost in Lisbon and finding the best custard tart of our lives' },
  { key: 'want_to_say', label: 'Something you have always wanted to tell them', placeholder: 'e.g. You made every new city feel like home' },
]

export const CORE_PACKAGE = {
  id: 'core',
  name: 'Personal Song',
  price: 59,
  includes: [
    'A complete song, about 1 minute',
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

export function quote({ delivery = 'standard', extras = [] }) {
  const d = DELIVERY.find((x) => x.id === delivery) || DELIVERY[0]
  const extraTotal = EXTRAS.filter((e) => extras.includes(e.id)).reduce((s, e) => s + e.price, 0)
  const readyBy = new Date()
  readyBy.setDate(readyBy.getDate() + d.days)
  return { total: CORE_PACKAGE.price + d.price + extraTotal, readyBy: readyBy.toISOString(), delivery: d }
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// Example songs. Photography is illustrative and does not show real customers.
const ALL_EXAMPLES = [
  {
    id: 'ex1',
    title: 'Five More Minutes',
    for: 'For Maya, from her husband',
    occasion: 'Anniversary',
    mood: 'Playful · Acoustic',
    photo: '/brand/sunday-pancakes.jpg',
    photoAlt: 'A couple laughing on the kitchen floor over a stack of pancakes',
    tint: 'bg-lilac',
    detail: 'Sunday pancakes. The first one always burns.',
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
    mood: 'Joyful · Pop',
    photo: '/brand/friend-birthday.jpg',
    photoAlt: 'Friends laughing around a birthday cake at a crowded table',
    tint: 'bg-butter',
    detail: 'The friend who makes every plan better.',
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
    for: 'For Amma, from her daughter',
    occasion: "Mother's Day",
    mood: 'Tender · Piano ballad',
    photo: '/brand/hero-recognition.jpg',
    photoAlt: 'An older woman listening on headphones while her daughter watches her smile',
    tint: 'bg-mint',
    detail: 'For everything she never made a fuss about.',
    lines: [
      'Chai at six before the house was even up',
      'You saved the biggest piece and called the broken one your cup',
      'Amma, all the things you never made a fuss about',
      'I noticed every one. I’m singing them out loud',
    ],
    market: 'india', // only shown in this market
  },
]

export const EXAMPLES = ALL_EXAMPLES.filter((e) => live(e.market))
