// Sings an order's lyrics and checks the name came out right.
// POST { order_id, lyrics_prompt?, lyrics_schema? } -> { done, passed, sung_as }.
// It does all the work before replying (up to Base44's 5-minute limit):
// background work after the reply is cut off after about 30 seconds, which is
// shorter than one song takes. The app doesn't wait for the reply; it checks
// the order instead.
//
//   0. If the app sent a lyrics prompt, write the lyrics with Base44's AI first
//      (only backend functions may call it). The template lyrics stay if it fails.
//   1. Sing it with the buyer's sounds-like spelling (else a tested or
//      suggested one for tricky names, else the name as written).
//   2. Listen three times. The name must be heard at least twice.
//   3. If not, sing it again with the next spelling, up to three tries.
//   4. Save the best take. If no try passed, the order stays in production and
//      is flagged (name_check.needs_person) for someone to listen first.

import { createClientFromRequest } from 'npm:@base44/sdk'
import { secrets } from 'base44:runtime'

import { cleanKey, listen, sing, suggestSpellings } from '../../shared/ai.ts'
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

    const { order_id, lyrics_prompt, lyrics_schema } = await req.json()
    // Read as the buyer, so the order's own access rules check it's theirs.
    const order = await base44.entities.Order.get(order_id)
    if (!order?.song?.sections?.length) return Response.json({ error: 'Write the lyrics first' }, { status: 400 })

    const gemini = cleanKey(secrets.get('GEMINI_API_KEY'))
    const openai = cleanKey(secrets.get('OPENAI_API_KEY'))
    if (!gemini || !openai) return Response.json({ error: 'GEMINI_API_KEY and OPENAI_API_KEY must be set' }, { status: 500 })

    const admin = base44.asServiceRole
    const lyrics = typeof lyrics_prompt === 'string' ? { prompt: lyrics_prompt.slice(0, 8000), schema: lyrics_schema } : null
    try {
      return Response.json({ done: true, ...(await produce(admin, order, { gemini, openai }, lyrics)) })
    } catch (error) {
      console.error('makeSong failed', order.id, error)
      const message = String((error as Error)?.message ?? error)
      await admin.entities.Order.update(order.id, { name_check: { passed: false, needs_person: true, tries: [], error: message } })
      return Response.json({ done: false, error: message }, { status: 500 })
    }
  } catch (error) {
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}

// deno-lint-ignore no-explicit-any
async function produce(admin: any, order: Order, keys: Keys, lyrics: { prompt: string; schema: object } | null) {
  if (lyrics) {
    try {
      const written = await admin.integrations.Core.InvokeLLM({ prompt: lyrics.prompt, response_json_schema: lyrics.schema })
      if (written?.sections?.length) {
        order.song = { ...order.song, ...written }
        await admin.entities.Order.update(order.id, { song: order.song })
      }
    } catch (error) {
      console.error('Writing lyrics failed, singing the template', order.id, error)
    }
  }
  const name: string = order.recipient.name.trim()
  const { spellings, heardAs } = await plan(name, order.recipient.pronunciation, keys.gemini)

  // Counts as heard: the real name, any spelling we tried, or how a listener might write it.
  const accepted = [...new Set([name, ...spellings, ...heardAs].map(plainName).filter(Boolean))]
  const pattern = new RegExp(`\\b(${accepted.sort((a, b) => b.length - a.length).map(escape).join('|')})\\b`, 'i')

  // Each try is sung and listened to. Lyria's safety filter sometimes refuses a
  // spelling outright ("Neave" in some lyrics, while "Niamh" and "Emily" pass).
  // A refusal comes back at once and costs nothing, so it doesn't use up a try.
  const tries: { spelling: string; heard: number; audio?: Uint8Array; refused?: boolean }[] = []
  for (const spelling of spellings) {
    if (tries.filter((t) => !t.refused).length >= MAX_TRIES) break
    let audio: Uint8Array
    try {
      audio = await sing(songPrompt(order, spelling), keys.gemini)
    } catch (error) {
      if (!/no audio/i.test(String((error as Error).message))) throw error
      console.error('Lyria refused', order.id, spelling, (error as Error).message)
      tries.push({ spelling, heard: 0, refused: true })
      continue
    }
    const texts = await Promise.all(Array.from({ length: LISTENS }, () => listen(audio, keys.openai)))
    const heard = texts.filter((t) => pattern.test(plainName(t))).length
    tries.push({ spelling, heard, audio })
    if (heard >= 2) break
  }

  const sung = tries.filter((t) => t.audio)
  if (!sung.length) throw new Error(`Lyria refused every spelling: ${tries.map((t) => t.spelling).join(', ')}`)
  const best = sung.reduce((a, b) => (b.heard > a.heard ? b : a))
  const passed = best.heard >= 2
  const file = new File([best.audio!], `wishly-${order.id}-v${order.song_version || 1}.mp3`, { type: 'audio/mpeg' })
  const { file_url } = await admin.integrations.Core.UploadFile({ file })

  await admin.entities.Order.update(order.id, {
    song: { ...order.song, audio_url: file_url, sung_as: best.spelling },
    name_check: { passed, needs_person: !passed, tries: tries.map(({ spelling, heard, refused }) => ({ spelling, heard, refused: Boolean(refused) })) },
    // A take that never passed waits for a person to listen before the buyer hears it.
    ...(passed ? { status: 'ready_for_review' } : {}),
  })
  return { passed, sung_as: best.spelling }
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
  const seen = new Set<string>()
  const unique = spellings.filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
  // Extra spellings stand by in case Lyria refuses some. A tricky name as
  // written usually comes out wrong, so it goes last: only if Lyria refuses
  // every sounds-like spelling (it blocks some that sound like a famous name,
  // such as Neave / Neve). A person then checks that take before the buyer.
  const tried = unique.slice(0, MAX_TRIES + 3)
  if (!tried.some((s) => s.toLowerCase() === name.toLowerCase())) tried.push(name)
  return { spellings: tried, heardAs }
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
