// The Wishly website holds help, support and every policy, so the app links to
// it rather than keeping its own copies. Pages open in Safari inside the app.
import * as WebBrowser from 'expo-web-browser'

import { colors } from '@/theme'

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://trywishly.co').replace(/\/$/, '')

// Wishly's own pages, published from this repo's site/ folder (the same
// Base44 site as the gift pages) and served at trywishly.co once the domain
// points there. Old trywishly.co addresses land on the homepage.
export const HELP = [
  { label: 'Help & support', path: '/support.html' },
  { label: 'About Wishly', path: '/' },
]

export const LEGAL = [
  { label: 'Privacy Policy', path: '/privacy.html' },
  { label: 'Terms of Use', path: '/terms.html' },
]

export const siteUrl = (path: string) => `${SITE_URL}${path}`
export const TERMS_URL = siteUrl('/terms.html')
export const PRIVACY_URL = siteUrl('/privacy.html')

export const openSitePage = (path: string) =>
  WebBrowser.openBrowserAsync(siteUrl(path), {
    controlsColor: colors.text,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  })
