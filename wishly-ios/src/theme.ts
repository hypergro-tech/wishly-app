// Tokens for the bright, happy direction (30 Oct 2026): a warm cream canvas,
// white cards, deep teal text and sunny pastel covers, so the app feels like a
// celebration rather than a night-time music app. Brand colours from the Wishly
// Creative Brandbook carry over: coral marks actions, the soft colours become
// cover art, deep teal is the text and the gift cover.
import { Platform, type TextStyle } from 'react-native'

export const colors = {
  bg: '#FFF5EB', // app canvas: warm cream
  surface: '#FFFFFF', // cards and sheets
  raised: '#FFFFFF', // mini player, raised surfaces
  backdrop: '#2B1A22', // behind sheets, dimmed
  teal: '#143438', // brand deep teal: the splash and the gift cover
  text: '#143438', // deep teal
  muted: '#5B6466', // secondary text, 5.8:1 on bg
  ivory: '#FFFAF5', // text on teal and on photos
  line: 'rgba(20,52,56,0.1)',
  outline: 'rgba(20,52,56,0.22)',
  fill: 'rgba(20,52,56,0.05)', // inputs and inner panels
  coral: '#FF6B7A', // actions; carries deep-teal labels, never small white type
  coralPressed: '#F7586A',
  ink: '#143438', // text on coral and soft colours
  lilac: '#E6D6FF',
  butter: '#FFE07A',
  mint: '#BDF2D5',
}

// Deep teal at an opacity, for tracks, borders and placeholders on the cream canvas.
export const shade = (opacity: number) => `rgba(20,52,56,${opacity})`

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
