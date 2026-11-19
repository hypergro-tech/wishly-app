// A sounds-like spelling for a tricky name, for the Create screen.
// POST { name } -> { said, spellings, heard_as }

import { createClientFromRequest } from 'npm:@base44/sdk'
import { secrets } from 'base44:runtime'

import { cleanKey, suggestSpellings } from '../../shared/ai.ts'
import { overLimit } from '../../shared/limits.ts'
import { isTricky, testedSpelling } from '../../shared/names.ts'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    const user = await base44.auth.me().catch(() => null)
    if (!user?.email) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { name } = await req.json()
    if (typeof name !== 'string' || !name.trim() || name.length > 80) {
      return Response.json({ error: 'Send the name to spell' }, { status: 400 })
    }
    if (!isTricky(name)) return Response.json({ said: '', spellings: [name.trim()], heard_as: [name.trim()] })

    const tested = testedSpelling(name)
    if (tested) return Response.json({ said: '', spellings: [tested], heard_as: [name.trim(), tested] })

    const key = cleanKey(secrets.get('GEMINI_API_KEY'))
    if (!key) return Response.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
    // Each suggestion is a paid Gemini call: a few a minute, a set number a day.
    const limited = await overLimit(base44.asServiceRole, user.email, 'suggestSpelling')
    if (limited) return Response.json({ error: limited, code: 'rate_limited' }, { status: 429 })
    return Response.json(await suggestSpellings(name.trim(), key))
  } catch (error) {
    console.error('suggestSpelling failed', error)
    return Response.json({ error: 'Something went wrong. Try again in a moment.' }, { status: 500 })
  }
}
