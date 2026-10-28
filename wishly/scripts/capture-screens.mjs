// Captures every Wishly screen and state at phone size for the Claude Design
// canvas ("Wishly App Screens"). Run with `npm run screens`.
//
// It starts its own Vite server, drives a headless Chrome with a fresh profile
// (your own browser data is untouched), seeds demo gifts in every state through
// the app's own services, and writes JPEGs plus screens/manifest.json. Each
// manifest entry names the canvas artboard it belongs to, so the canvas can be
// refreshed by re-uploading the images and pointing each artboard at its new one.
//
// Env: CHROME_PATH to use a specific Chrome/Chromium, SCREENS_DIR to change
// where the output goes (default: ./screens).

import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'

const OUT = path.resolve(process.env.SCREENS_DIR || 'screens')
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESKTOP = { width: 1280, height: 860, deviceScaleFactor: 1.5 }

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p))
if (!chrome) {
  console.error('Could not find Chrome. Set CHROME_PATH to your Chrome or Chromium binary.')
  process.exit(1)
}

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' })
await server.listen()
const BASE = server.resolvedUrls.local[0].replace(/\/$/, '')

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
await page.setViewport(PHONE)

const manifest = []

async function go(route) {
  await page.goto(BASE + route, { waitUntil: 'networkidle0' })
  await sleep(500)
}

// Long screens: grow the window to the content height so pinned bars sit at
// the bottom instead of being painted mid-page.
async function shot(board, title, row, { full = true } = {}) {
  const vp = page.viewport()
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewport({ ...vp, height: Math.max(h, vp.height) })
    await sleep(400)
  }
  const size = page.viewport()
  const file = board.replace('.dc.html', '.jpg')
  await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 86 })
  if (full) await page.setViewport(vp)
  manifest.push({ board, title, row, file, width: size.width, height: size.height })
  console.log(`  ${file} (${size.width}×${size.height})`)
}

async function click(text, selector = 'button, a') {
  const el = await page.evaluateHandle(
    (t, s) => [...document.querySelectorAll(s)].find((e) => e.textContent.includes(t)),
    text,
    selector,
  )
  if (!el.asElement()) throw new Error(`Nothing to click containing "${text}"`)
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await el.click()
  await sleep(500)
}

try {
  console.log(`Capturing from ${BASE} into ${OUT}`)

  // Discover, before anything is stored.
  await go('/')
  await page.evaluate(() => localStorage.clear())
  await go('/')
  await shot('Main.dc.html', 'Home · first visit', 'Discover')
  await go('/my-gifts')
  await shot('My-gifts-empty.dc.html', 'My gifts · empty', 'Discover', { full: false })
  await go('/')
  await click('Play “Five More Minutes”', 'button')
  await sleep(3800)
  await shot('Example-sheet.dc.html', 'Example song sheet', 'Discover', { full: false })

  // Demo gifts in every state, created through the app's own services.
  const ids = await page.evaluate(async () => {
    const o = await import('/src/api/orders.js')
    const brief = (recipient, occasion, memories, music, pkg = { delivery: 'standard', extras: [] }) => ({
      recipient, occasion, occasion_date: '', memories, music, package: pkg, buyer: { name: 'Sam', email: 'sam@example.com' },
    })
    const sound = (mood, genre) => ({ mood, genre, voice: 'Female vocal', language: 'English' })

    let amma = await o.placeOrder(brief({ name: 'Amma', pronunciation: 'UM-mah', pronouns: 'she/her', relationship: 'Parent' }, "Mother's Day",
      { ritual: 'Chai at six before the house was up.', nickname: '', inside_joke: '', memory: 'She saved the biggest piece for us every time', want_to_say: 'I noticed everything you never made a fuss about' }, sound('tender', 'Piano ballad')))
    amma = await o.finishProduction(amma)
    amma = await o.requestCorrection(amma, { kind: 'fact', note: 'It was chai at six, not seven', changes: {} })

    const mei = await o.placeOrder(brief({ name: 'Mei', pronunciation: 'MAY', pronouns: 'she/her', relationship: 'Friend' }, 'Birthday',
      { ritual: 'Sends a seven-stop plan to the group chat every Friday.', nickname: 'Captain', inside_joke: '', memory: '', want_to_say: 'You make every plan better' }, sound('joyful', 'Pop')))

    let dad = await o.placeOrder(brief({ name: 'Dad', pronunciation: '', pronouns: 'he/him', relationship: 'Parent' }, "Father's Day",
      { ritual: 'Sings along to the radio while chopping onions every Saturday.', nickname: 'Captain of the kitchen', inside_joke: '"Who wants tea?" Every hour, on the hour.', memory: '', want_to_say: 'We would choose you all over again' }, sound('playful', 'Folk')))
    dad = await o.finishProduction(dad)

    const priyaMemories = { ritual: 'Sunday pancakes. She always burns the first one and eats it anyway.', nickname: 'Bubs', inside_joke: '"Five more minutes." She has never once meant five.', memory: 'Getting lost in Lisbon and finding the best custard tart of our lives', want_to_say: 'You made every new city feel like home' }
    let priya = await o.placeOrder(brief({ name: 'Priya', pronunciation: 'PREE-yah', pronouns: 'she/her', relationship: 'Partner' }, 'Anniversary',
      priyaMemories, sound('playful', 'Acoustic'), { delivery: 'express', extras: ['lyric_art'] }))
    priya = await o.finishProduction(priya)
    priya = await o.approveAndWrap(priya, { message: 'Happy anniversary, Bubs. Five more minutes with you is never enough.', from_name: 'Sam' })

    // A part-filled order for the create flow.
    localStorage.setItem('wishly:draft', JSON.stringify({
      recipient: { name: 'Priya', pronunciation: 'PREE-yah', pronouns: 'she/her', relationship: 'Partner' },
      occasion: 'Anniversary', occasion_date: '',
      memories: { ...priyaMemories, want_to_say: '', avoid: '' },
      music: { mood: 'playful', genre: 'Acoustic', voice: 'No preference', language: 'English' },
      package: { delivery: 'standard', extras: ['lyric_art'] },
      buyer: { name: 'Sam', email: 'sam@example.com' },
    }))
    return { amma: amma.id, mei: mei.id, dad: dad.id, priya: priya.id, token: priya.gift_token }
  })

  await go('/')
  await shot('Home-returning.dc.html', 'Home · returning, gifts in progress', 'Discover', { full: false })
  await go('/my-gifts')
  await shot('My-gifts.dc.html', 'My gifts', 'Discover', { full: false })

  // Create a song.
  await go('/create')
  await shot('Create-1-who.dc.html', 'Step 1 · Who it’s for', 'Create a song')
  await click('Continue', '#app-scroll button')
  await shot('Create-2-details.dc.html', 'Step 2 · Their details', 'Create a song')
  await click('Continue', '#app-scroll button')
  await shot('Create-3-feeling.dc.html', 'Step 3 · The feeling', 'Create a song')
  await click('Continue', '#app-scroll button')
  await page.evaluate(() => document.querySelector('#app-scroll input[type=checkbox]').click())
  await sleep(300)
  await shot('Create-4-check.dc.html', 'Step 4 · Check the brief', 'Create a song')
  await click('Choose the gift', '#app-scroll button')
  await shot('Create-5-gift.dc.html', 'Step 5 · Your gift', 'Create a song')

  // Listen, check and give.
  await go(`/orders/${ids.mei}`)
  await shot('Order-writing.dc.html', 'Writing their song', 'Listen, check and give')
  await go(`/orders/${ids.dad}`)
  await shot('Order-ready-to-check.dc.html', 'Ready to listen and check', 'Listen, check and give')
  await click('Something needs another look', 'button')
  await shot('Sheet-correction.dc.html', 'Correction sheet', 'Listen, check and give', { full: false })
  await go(`/orders/${ids.amma}`)
  await shot('Order-correction.dc.html', 'Making your correction', 'Listen, check and give')
  await go(`/orders/${ids.dad}`)
  await click('It’s right', 'button')
  await shot('Sheet-message.dc.html', 'Personal message sheet', 'Listen, check and give', { full: false })
  await go(`/orders/${ids.priya}`)
  await shot('Order-ready-to-give.dc.html', 'Ready to give', 'Listen, check and give')

  // What the recipient sees.
  await go(`/gift/${ids.token}`)
  await shot('Gift-cover.dc.html', 'Gift cover', 'The gift (what they see)', { full: false })
  await click('Listen to your song', 'button')
  await sleep(3800)
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(300)
  await shot('Gift-opened.dc.html', 'Gift opened, song playing', 'The gift (what they see)')

  // On a computer.
  await page.setViewport(DESKTOP)
  await go('/')
  await shot('Desktop.dc.html', 'Desktop · app beside brand panel', 'On a computer', { full: false })

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), screens: manifest }, null, 2))
  console.log(`Done: ${manifest.length} screens and manifest.json in ${OUT}`)
} finally {
  await browser.close()
  await server.close()
}
