// On-device stand-in for the Base44 SDK, used when no app ID is configured.
// Same calls the app makes against Base44 (`entities.<Name>.create/get/list/
// filter/update/delete`, `integrations.Core.InvokeLLM`, `auth.me`), stored in
// AsyncStorage, so every screen works offline as a demo.

import AsyncStorage from '@react-native-async-storage/async-storage'

import { writeSong } from '@/lib/songwriter'

type Row = { id: string; created_date: string; updated_date: string; created_by: string; [key: string]: unknown }

const PREFIX = 'wishly:'
const DEMO_USER = { id: 'local', email: 'you@this-phone', full_name: 'You' }

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

async function load(name: string): Promise<Row[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(PREFIX + name)) || '[]')
  } catch {
    return []
  }
}

const save = (name: string, rows: Row[]) => AsyncStorage.setItem(PREFIX + name, JSON.stringify(rows))

function sortRows(rows: Row[], sort?: string) {
  if (!sort) return rows
  const desc = sort.startsWith('-')
  const key = desc ? sort.slice(1) : sort
  return [...rows].sort((a, b) => ((a[key] as string) > (b[key] as string) ? 1 : -1) * (desc ? -1 : 1))
}

function entity(name: string) {
  return {
    async create(data: Record<string, unknown>) {
      await delay()
      const now = new Date().toISOString()
      const row: Row = { id: uid(), created_date: now, updated_date: now, created_by: DEMO_USER.email, ...data }
      await save(name, [...(await load(name)), row])
      return row
    },
    async get(id: string) {
      await delay()
      const row = (await load(name)).find((r) => r.id === id)
      if (!row) throw new Error(`${name} ${id} not found`)
      return row
    },
    async list(sort = '-created_date', limit?: number) {
      await delay()
      return sortRows(await load(name), sort).slice(0, limit)
    },
    async filter(query: Record<string, unknown> = {}, sort = '-created_date', limit?: number) {
      await delay()
      const rows = (await load(name)).filter((r) => Object.entries(query).every(([k, v]) => r[k] === v))
      return sortRows(rows, sort).slice(0, limit)
    },
    async update(id: string, data: Record<string, unknown>) {
      await delay()
      const rows = await load(name)
      const i = rows.findIndex((r) => r.id === id)
      if (i < 0) throw new Error(`${name} ${id} not found`)
      rows[i] = { ...rows[i], ...data, updated_date: new Date().toISOString() }
      await save(name, rows)
      return rows[i]
    },
    async delete(id: string) {
      await delay()
      await save(name, (await load(name)).filter((r) => r.id !== id))
    },
  }
}

// Sign-in that behaves like Base44's, so the whole flow can be tried on the
// phone: email accounts confirm with a 6-digit code (any six digits work here),
// and Apple or Google sign in at once.
type LocalAccount = { password: string; verified: boolean }
const USER_KEY = PREFIX + 'user'
const ACCOUNTS_KEY = PREFIX + 'accounts'

const fail = (status: number) => Object.assign(new Error(`Request failed with status ${status}`), { status })

async function accounts(): Promise<Record<string, LocalAccount>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(ACCOUNTS_KEY)) || '{}')
  } catch {
    return {}
  }
}

async function signInAs(email: string, full_name = '') {
  const user = { ...DEMO_USER, id: email, email, full_name }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
  return { access_token: 'local', user }
}

const localAuth = {
  async me() {
    const raw = await AsyncStorage.getItem(USER_KEY)
    if (!raw) throw fail(401)
    return JSON.parse(raw)
  },
  async loginViaEmailPassword(email: string, password: string) {
    await delay(400)
    const a = (await accounts())[email.toLowerCase()]
    if (!a || a.password !== password || !a.verified) throw fail(401)
    return signInAs(email.toLowerCase())
  },
  async register({ email, password }: { email: string; password: string }) {
    await delay(400)
    const all = await accounts()
    if (all[email.toLowerCase()]) throw fail(409)
    all[email.toLowerCase()] = { password, verified: false }
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all))
  },
  async verifyOtp({ email, otpCode }: { email: string; otpCode: string }) {
    await delay(400)
    const all = await accounts()
    if (!all[email.toLowerCase()] || !/^\d{6}$/.test(otpCode)) throw fail(400)
    all[email.toLowerCase()].verified = true
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all))
  },
  resendOtp: async () => delay(300),
  resetPasswordRequest: async () => delay(300),
  setToken: () => {},
  // Stand-in for the Apple / Google web sign-in.
  signInWithProvider: (provider: string) => signInAs(`you@${provider}.example`),
  forget: () => AsyncStorage.removeItem(USER_KEY),
}

export function createLocalClient() {
  return {
    entities: { Order: entity('Order') },
    integrations: {
      Core: {
        // Base44 runs a real model here; locally the template songwriter writes
        // from the brief passed in `context`.
        async InvokeLLM({ context }: { prompt: string; response_json_schema?: object; context: { order: unknown } }) {
          await delay(900)
          return writeSong(context.order)
        },
      },
    },
    auth: localAuth,
  }
}
