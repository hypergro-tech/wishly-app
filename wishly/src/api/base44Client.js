// Local stand-in for the Base44 SDK client.
//
// It exposes the same surface the app needs from `@base44/sdk`
// (`entities.<Name>.create/get/list/filter/update` and
// `integrations.Core.InvokeLLM`), backed by localStorage. When you connect
// Base44, replace this file's export with:
//
//   import { createClient } from '@base44/sdk'
//   export const base44 = createClient({ appId: import.meta.env.VITE_BASE44_APP_ID })
//
// and nothing else in the app needs to change.

import { writeSong } from '../lib/songwriter'

const PREFIX = 'wishly:'
const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms))
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function load(name) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + name)) || []
  } catch {
    return []
  }
}

function save(name, rows) {
  localStorage.setItem(PREFIX + name, JSON.stringify(rows))
}

function sortRows(rows, sort) {
  if (!sort) return rows
  const desc = sort.startsWith('-')
  const key = desc ? sort.slice(1) : sort
  return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : -1) * (desc ? -1 : 1))
}

function entity(name) {
  return {
    async create(data) {
      await delay()
      const now = new Date().toISOString()
      const row = { id: uid(), created_date: now, updated_date: now, ...data }
      save(name, [...load(name), row])
      return row
    },
    async get(id) {
      await delay()
      const row = load(name).find((r) => r.id === id)
      if (!row) throw new Error(`${name} ${id} not found`)
      return row
    },
    async list(sort = '-created_date', limit) {
      await delay()
      return sortRows(load(name), sort).slice(0, limit)
    },
    async filter(query = {}, sort = '-created_date', limit) {
      await delay()
      const rows = load(name).filter((r) => Object.entries(query).every(([k, v]) => r[k] === v))
      return sortRows(rows, sort).slice(0, limit)
    },
    async update(id, data) {
      await delay()
      const rows = load(name)
      const i = rows.findIndex((r) => r.id === id)
      if (i < 0) throw new Error(`${name} ${id} not found`)
      rows[i] = { ...rows[i], ...data, updated_date: new Date().toISOString() }
      save(name, rows)
      return rows[i]
    },
    async delete(id) {
      await delay()
      save(name, load(name).filter((r) => r.id !== id))
    },
  }
}

export const base44 = {
  entities: {
    Order: entity('Order'),
  },
  integrations: {
    Core: {
      // With Base44 this becomes a real LLM call; `context` is passed so the
      // local songwriter can build lyrics from the brief without a model.
      async InvokeLLM({ context }) {
        await delay(900)
        return writeSong(context.order, context.correction)
      },
    },
  },
}
