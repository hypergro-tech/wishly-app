// Sings an order's lyrics and checks the name came out right.
// POST { order_id } -> { started: true }, then works in the background:
//
//   1. Sing it with the buyer's sounds-like spelling (else a tested or
//      suggested one for tricky names, else the name as written).
//   2. Listen three times. The name must be heard at least twice.
//   3. If not, sing it again with the next spelling, up to three tries.
//   4. Save the best take. If no try passed, the order stays in production and
//      is flagged (name_check.needs_person) for someone to listen first.

import { createClientFromRequest } from 'npm:@base44/sdk'
import { secrets, waitUntil } from 'base44:runtime'

import { listen, sing, suggestSpellings } from '../../shared/ai.ts'
import { isTricky, plainName, singable, testedSpelling } from '../../shared/names.ts'

const MAX_TRIES = 3
const LISTENS = 3

type Keys = { gemini: string; openai: string }
// deno-lint-ignore no-explicit-any
type Order = any

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    if (!(await base44.auth.me().catch(() => null))) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { order_id } = await req.json()
    // Read as the buyer, so the order's own access rules check it's theirs.
    const order = await base44.entities.Order.get(order_id)
    if (!order?.song?.sections?.length) return Response.json({ error: 'Write the lyrics first' }, { status: 400 })

    const gemini = secrets.get('GEMINI_API_KEY')
    const openai = secrets.get('OPENAI_API_KEY')
    if (!gemini || !openai) return Response.json({ error: 'GEMINI_API_KEY and OPENAI_API_KEY must be set' }, { status: 500 })

    const admin = base44.asServiceRole
    waitUntil(produce(admin, order, { gemini, openai }).catch(async (error) => {
      console.error('makeSong failed', order.id, error)
      await admin.entities.Order.update(order.id, {
        name_check: { passed: false, needs_person: true, tries: [], error: String(error?.message ?? error) },
      })
    }))
    return Response.json({ started: true })
  } catch (error) {
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}

// deno-lint-ignore no-explicit-any
async function produce(admin: any, order: Order, keys: Keys) {
  const name: string = order.recipient.name.trim()
  const { spellings, heardAs } = await plan(name, order.recipient.pronunciation, keys.gemini)

  // Counts as heard: the real name, any spelling we tried, or how a listener might write it.
  const accepted = [...new Set([name, ...spellings, ...heardAs].map(plainName).filter(Boolean))]
  const pattern = new RegExp(`\\b(${accepted.sort((a, b) => b.length - a.length).map(escape).join('|')})\\b`, 'i')

  const tries: { spelling: string; heard: number; audio: Uint8Array }[] = []
  for (const spelling of spellings) {
    const audio = await sing(songPrompt(order, spelling), keys.gemini)
    const texts = await Promise.all(Array.from({ length: LISTENS }, () => listen(audio, keys.openai)))
    const heard = texts.filter((t) => pattern.test(plainName(t))).length
    tries.push({ spelling, heard, audio })
    if (heard >= 2) break
  }

  const best = tries.reduce((a, b) => (b.heard > a.heard ? b : a))
  const passed = best.heard >= 2
  const file = new File([best.audio], `wishly-${order.id}-v${order.song_version || 1}.mp3`, { type: 'audio/mpeg' })
  const { file_url } = await admin.integrations.Core.UploadFile({ file })

  await admin.entities.Order.update(order.id, {
    song: { ...order.song, audio_url: file_url, sung_as: best.spelling },
    name_check: { passed, needs_person: !passed, tries: tries.map(({ spelling, heard }) => ({ spelling, heard })) },
    // A take that never passed waits for a person to listen before the buyer hears it.
    ...(passed ? { status: 'ready_for_review' } : {}),
  })
}

// Spellings to try, best first.
async function plan(name: string, chosen: string | undefined, geminiKey: string) {
  const spellings: string[] = []
  const heardAs: string[] = []
  if (chosen?.trim()) spellings.push(singable(chosen))
  if (isTricky(name)) {
    const tested = testedSpelling(name)
    if (tested) spellings.push(tested)
    try {
      const s = await suggestSpellings(name, geminiKey)
      spellings.push(...s.spellings.map(singable))
      heardAs.push(...(s.heard_as || []))
    } catch (error) {
      console.error('suggestSpellings failed', name, error)
    }
  }
  // A tricky name as written is the one spelling we know fails.
  if (!isTricky(name)) spellings.push(name)
  const seen = new Set<string>()
  const unique = spellings.filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
  return { spellings: unique.slice(0, MAX_TRIES), heardAs }
}

// The lyrics keep the real name; the singer gets the sounds-like spelling.
function songPrompt(order: Order, spelling: string) {
  const name = new RegExp(`\\b${escape(order.recipient.name.trim())}\\b`, 'gi')
  const lyrics = order.song.sections
    .map((s: { label: string; lines: string[] }) => `[${s.label}]\n${s.lines.map((l) => l.replace(name, spelling)).join('\n')}`)
    .join('\n\n')
  const { mood, genre, voice, language } = order.music || {}
  const sound = [mood, genre].filter(Boolean).join(' ').toLowerCase() || 'warm acoustic pop'
  const singer = voice && voice !== 'No preference' ? `, sung by a clear ${voice.toLowerCase()}` : ''
  return `A ${sound} song for ${order.occasion || 'a special day'}, a personal gift${singer}, in ${language || 'English'}, about 2 minutes 30 seconds long. Sing these lyrics exactly, word for word, and sing the name "${spelling}" clearly every time it appears:\n\n${lyrics}`
}
