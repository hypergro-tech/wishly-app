// The Wishly website holds help, support and every policy, so the app links to
// it rather than keeping its own copies. Pages open in Safari inside the app.
import * as WebBrowser from 'expo-web-browser'

import { colors } from '@/theme'

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://trywishly.co').replace(/\/$/, '')

export const HELP = [
  { label: 'Frequently asked questions', path: '/faq' },
  { label: 'Contact us', path: '/contact' },
  { label: 'How it works', path: '/how-it-works' },
  { label: 'About Wishly', path: '/about' },
]

// The order of the website's "Help & legal" footer.
export const LEGAL = [
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Refund policy', path: '/refund-policy' },
  { label: 'Delivery policy', path: '/delivery-policy' },
  { label: 'Song licence', path: '/song-licence' },
  { label: 'AI disclosure', path: '/ai-disclosure' },
  { label: 'Copyright & IP', path: '/copyright' },
  { label: 'Accessibility', path: '/accessibility' },
  { label: 'Your privacy choices', path: '/privacy-choices' },
  { label: 'Seller & contact details', path: '/seller' },
]

export const siteUrl = (path: string) => `${SITE_URL}${path}`

export const openSitePage = (path: string) =>
  WebBrowser.openBrowserAsync(siteUrl(path), {
    controlsColor: colors.text,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  })
