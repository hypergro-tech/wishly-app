// Tokens for the dark, music-app direction (canvas "Wishly App Screens", iOS
// page): a warm near-black canvas so covers and coral actions stand out. Brand
// colours from the Wishly Creative Brandbook carry over: coral marks actions,
// the soft colours become cover art, deep teal is kept for brand moments.
import { Platform, type TextStyle } from 'react-native'

export const colors = {
  bg: '#121110', // app canvas: warm near-black
  surface: '#1E1C1B', // cards and sheets
  raised: '#2A2826', // mini player, raised surfaces
  backdrop: '#080707', // behind sheets
  teal: '#143438', // brand deep teal, kept for brand moments (splash, gift cover)
  text: '#FFFAF5', // warm ivory
  muted: '#A8A29E', // warm grey secondary text, 7:1 on bg
  line: 'rgba(255,250,245,0.1)',
  outline: 'rgba(255,250,245,0.22)',
  fill: 'rgba(255,250,245,0.06)', // inputs and inner panels
  coral: '#FF6B7A', // actions; carries deep-teal labels, never small white type
  coralPressed: '#F7586A',
  ink: '#143438', // text on coral and soft colours
  lilac: '#F2E8FF',
  butter: '#FFF2C7',
  mint: '#E1FAED',
}

export type Tint = 'lilac' | 'butter' | 'mint' | 'coral'
export const tint = (name: Tint) => colors[name]

// Arial Bold is the practical voice, Georgia Italic the emotional accent. Both
// ship with iOS; other platforms fall back to their system fonts.
const arial = Platform.select({ ios: 'Arial', web: 'Arial, Helvetica, sans-serif', default: undefined })
const georgia = Platform.select({ ios: 'Georgia', web: 'Georgia, serif', default: 'serif' })

export const type = {
  bold: { fontFamily: arial, fontWeight: '700' } as TextStyle,
  regular: { fontFamily: arial, fontWeight: '400' } as TextStyle,
  accent: { fontFamily: georgia, fontStyle: 'italic' } as TextStyle,
  serif: { fontFamily: georgia } as TextStyle,
}

export const radius = { card: 22, field: 14, pill: 999 }
