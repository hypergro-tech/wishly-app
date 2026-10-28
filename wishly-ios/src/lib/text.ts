// Wrap a user's words in curly quotes. Quotes that wrap the whole text are
// dropped (no doubling); quotes inside become nested single quotes.
export const quoted = (s: string = '') => {
  let t = s.trim()
  const marks = t.match(/["“”]/g)?.length ?? 0
  if (marks === 2 && /^["“]/.test(t) && /["”]$/.test(t)) t = t.slice(1, -1)
  t = t.replace(/(^|\s)["“]/g, '$1‘').replace(/["”]/g, '’')
  return `“${t}”`
}
