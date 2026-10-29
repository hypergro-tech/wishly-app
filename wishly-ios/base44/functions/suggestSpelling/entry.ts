// A sounds-like spelling for a tricky name, for the Create screen.
// POST { name } -> { said, spellings, heard_as }

import { createClientFromRequest } from 'npm:@base44/sdk'
import { secrets } from 'base44:runtime'

import { suggestSpellings } from '../../shared/ai.ts'
import { isTricky, testedSpelling } from '../../shared/names.ts'

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req)
    if (!(await base44.auth.me().catch(() => null))) return Response.json({ error: 'Sign in first' }, { status: 401 })

    const { name } = await req.json()
    if (typeof name !== 'string' || !name.trim() || name.length > 80) {
      return Response.json({ error: 'Send the name to spell' }, { status: 400 })
    }
    if (!isTricky(name)) return Response.json({ said: '', spellings: [name.trim()], heard_as: [name.trim()] })

    const tested = testedSpelling(name)
    if (tested) return Response.json({ said: '', spellings: [tested], heard_as: [name.trim(), tested] })

    const key = secrets.get('GEMINI_API_KEY')
    if (!key) return Response.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
    return Response.json(await suggestSpellings(name.trim(), key))
  } catch (error) {
    return Response.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}
