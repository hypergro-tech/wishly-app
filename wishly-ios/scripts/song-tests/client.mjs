// Signs in to the Wishly Base44 app as the test buyer from .env.local
// (WISHLY_TEST_EMAIL / WISHLY_TEST_PASSWORD) for the song tests.
import { readFileSync } from 'node:fs'
import { createClient } from '@base44/sdk'

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

export async function signIn() {
  // Against `base44 dev` instead: WISHLY_SERVER_URL=http://localhost:4400 and
  // WISHLY_TOKEN from a buyer registered on that local server.
  if (process.env.WISHLY_SERVER_URL) {
    return createClient({ appId: env.EXPO_PUBLIC_BASE44_APP_ID, serverUrl: process.env.WISHLY_SERVER_URL, token: process.env.WISHLY_TOKEN })
  }
  const base44 = createClient({ appId: env.EXPO_PUBLIC_BASE44_APP_ID })
  const { access_token } = await base44.auth.loginViaEmailPassword(env.WISHLY_TEST_EMAIL, env.WISHLY_TEST_PASSWORD)
  base44.auth.setToken(access_token)
  return base44
}
