import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useBottomTabBarHeight } from 'expo-router/js-tabs'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import Animated, { FadeIn, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Spark } from '@/components/brand'
import { StoryCards, StoryTip } from '@/components/StoryCards'
import { ScrollHeader, useScrollHeader } from '@/components/glass'
import { Squish } from '@/components/motion'
import { Body, Button, Field, Label, Pills, Segmented, SpeakButton, Title, nudge, styles as ui, tap } from '@/components/ui'
import { forCouple, takesSongLine, GENRES, LANGUAGES, MEMORY_PROMPTS, MOODS, OCCASIONS, OCCASION_TONES, RELATIONSHIPS } from '@/lib/catalog'
import { realSongs } from '@/api/base44Client'
import { suggestSpelling } from '@/api/orders'
import { filledMemories, missing, useDraft } from '@/lib/draft'
import { isTricky, singable, testedSpelling } from '@/lib/names'
import { useRise } from '@/lib/motion'
import { occasionColour, occasionPicture } from '@/lib/occasions'
import { useWallet } from '@/lib/wallet'
import { colors, tint, type } from '@/theme'

// Cards and choices glide to their new places when details are added.
const settle = LinearTransition.springify(420).dampingRatio(0.92)

const VOICES = [
  { id: 'Female vocal', label: 'Female' },
  { id: 'Male vocal', label: 'Male' },
  { id: 'Duet', label: 'Duet' },
  { id: 'No preference', label: 'Any' },
]

// One tap fills "What are we celebrating?"; they can type their own instead.
const MILESTONE_IDEAS = ['Promotion', 'New job', 'Graduation', 'First home', 'Retirement']
const OTHER_MILESTONE = 'Something else'

const LINE_EXAMPLES: Record<string, string> = {
  Anniversary: 'e.g. Ten years in, and I’d still choose you',
  Wedding: 'e.g. From that rainy bus stop to forever',
  "Valentine's Day": 'e.g. You’re still my favorite hello',
  Christmas: 'e.g. Every Christmas is better with you home',
}

const COUPLE_SONG: Record<string, string> = { Anniversary: 'An anniversary song', Wedding: 'A wedding song', "Valentine's Day": 'A Valentine’s song' }

// "Valentine's Day" is too long for its tile, so the tile says "Valentine’s".
const occasionLabel = (o: string) => (o === "Valentine's Day" ? 'Valentine’s' : o).replace("'", '’')

export default function Create() {
  const { version } = useDraft()
  return <CreateForm key={version} />
}

function CreateForm() {
  const wallet = useWallet()
  const insets = useSafeAreaInsets()
  const tabBar = useBottomTabBarHeight()
  const header = useScrollHeader(10)
  const rise = useRise()
  const { draft, set, reset } = useDraft()
  const r = draft.recipient
  const tone = OCCASION_TONES[draft.occasion]
  const todo = missing(draft)
  const count = filledMemories(draft).length
  // Milestone: a quick pick, or "Something else" opens a box to type their own.
  const note = draft.occasion_note ?? ''
  const [ownNote, setOwnNote] = useState(() => !!note.trim() && !MILESTONE_IDEAS.includes(note))
  const pickMilestone = (v: string) => {
    if (v === OTHER_MILESTONE) {
      setOwnNote(!ownNote)
      set('occasion_note', '')
    } else {
      setOwnNote(false)
      set('occasion_note', v === note ? '' : v) // tapping the chosen one again clears it
    }
  }

  // A light tap the moment the song is ready to review.
  const complete = todo.length === 0
  const wasComplete = useRef(complete)
  useEffect(() => {
    if (complete && !wasComplete.current) nudge()
    wasComplete.current = complete
  }, [complete])

  // "Emma and Jake" typed as one name, then Anniversary picked: split it
  // into the two boxes, so each name is sung and checked on its own.
  const pickOccasion = (o: string) => {
    set('occasion', o)
    const both = r.name.trim().match(/^(.+?)\s+(?:and|&)\s+(.+)$/i)
    if (forCouple(o) && both && !r.partner_name?.trim()) {
      set('recipient', { name: both[1].trim(), pronunciation: '', partner_name: both[2].trim(), partner_pronunciation: '' })
    }
  }

  const startOver = () =>
    Alert.alert('Start over?', 'This clears the song you’re creating.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Start over', style: 'destructive', onPress: reset },
    ])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={header.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: tabBar + 32 }}
        scrollIndicatorInsets={{ bottom: tabBar }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Only changes animate, not what's already there when the screen opens. */}
        <LayoutAnimationConfig skipEntering skipExiting>
          <View style={{ paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Title size={34}>Create</Title>
            {(r.name || count > 0) && (
              <Pressable ph-label="Start over" accessibilityRole="button" onPress={() => { tap(); startOver() }} hitSlop={10}>
                <Text style={[type.bold, { fontSize: 15, color: colors.muted }]}>Start over</Text>
              </Pressable>
            )}
          </View>

          <Section title="Who’s it for?">
            <Field label="Their name, as it’s written" big value={r.name} onChangeText={(name) => set('recipient', { name })} placeholder="e.g. Grace" autoCapitalize="words" autoCorrect={false} />
            {/* A couple's card below has a "Sounds like" for each name instead. */}
            {!forCouple(draft.occasion) && <SoundsLike name={r.name} value={r.pronunciation} onChange={(pronunciation) => set('recipient', { pronunciation })} />}
            <View>
              <Label>They are your…</Label>
              <Pills options={RELATIONSHIPS} value={r.relationship} onChange={(relationship) => set('recipient', { relationship })} />
            </View>
          </Section>

          <Section title="The occasion">
            {/* One row that scrolls sideways, so more occasions fit (Neha, 16 Nov
                2026). It runs to the card's edges, so the next tile peeks in. */}
            <ScrollView
              horizontal
              accessibilityRole="radiogroup"
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -18 }}
              contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}
            >
              {OCCASIONS.map((o) => <OccasionCard key={o} occasion={o} selected={draft.occasion === o} onPress={() => pickOccasion(o)} />)}
            </ScrollView>
            {tone && (
              <Animated.View key={draft.occasion} entering={FadeIn.duration(260)} style={{ paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: colors.coral }}>
                <Text style={[type.accent, { fontSize: 17, lineHeight: 23, color: colors.text }]}>{tone.line}</Text>
              </Animated.View>
            )}
            {/* An anniversary, wedding or Valentine's song is for a couple: one
                name in each box, each with its own "Sounds like", both sung.
                Both show here together, so it's plain the second one is the
                partner, not the person giving the song. */}
            {forCouple(draft.occasion) && (
              <Animated.View entering={FadeIn.duration(260)} layout={settle} style={{ gap: 14, padding: 14, borderRadius: 18, backgroundColor: colors.bg }}>
                <View>
                  <Text style={[type.bold, { fontSize: 17, color: colors.text }]}>The couple</Text>
                  <Body muted size={14} style={{ marginTop: 4 }}>{COUPLE_SONG[draft.occasion] ?? 'This song'} is for two people. Put one name in each box, and we’ll sing both.</Body>
                </View>
                <Field
                  label="First name"
                  value={r.name}
                  onChangeText={(name) => set('recipient', { name })}
                  placeholder="e.g. Emma"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <SoundsLike name={r.name} value={r.pronunciation} onChange={(pronunciation) => set('recipient', { pronunciation })} />
                <Field
                  label="Their partner’s name"
                  value={r.partner_name ?? ''}
                  onChangeText={(partner_name) => set('recipient', { partner_name })}
                  placeholder="e.g. Jake"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <SoundsLike name={r.partner_name ?? ''} value={r.partner_pronunciation ?? ''} onChange={(partner_pronunciation) => set('recipient', { partner_pronunciation })} />
                {r.name.trim() && r.partner_name?.trim() ? (
                  <Text style={[type.accent, { fontSize: 16, color: colors.text }]}>A song for {r.name.trim()} & {r.partner_name.trim()}</Text>
                ) : null}
              </Animated.View>
            )}
            {/* A couple's or Christmas song can carry one line in the buyer's own
                words, sung in the chorus. Optional, like Their story (16 Nov 2026). */}
            {takesSongLine(draft.occasion) && (
              <Animated.View entering={FadeIn.duration(260)} layout={settle} style={{ gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.bg }}>
                <View>
                  <Text style={[type.bold, { fontSize: 17, color: colors.text }]}>A line for the song</Text>
                  <Body muted size={14} style={{ marginTop: 4 }}>Optional. Something you’d love to hear sung, in your own words.</Body>
                </View>
                <Field
                  value={draft.song_line ?? ''}
                  onChangeText={(song_line) => set('song_line', song_line)}
                  placeholder={LINE_EXAMPLES[draft.occasion] ?? 'e.g. You’re still my favorite hello'}
                  maxLength={150}
                  multiline
                  accessibilityLabel="A line for the song, optional"
                />
              </Animated.View>
            )}
            {/* A milestone could be anything, so the buyer can say which one,
                and the song congratulates them on it. Optional (16 Nov 2026). */}
            {draft.occasion === 'Milestone' && (
              <Animated.View entering={FadeIn.duration(260)} layout={settle} style={{ gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.bg }}>
                <View>
                  <Text style={[type.bold, { fontSize: 17, color: colors.text }]}>What are we celebrating?</Text>
                  <Body muted size={14} style={{ marginTop: 4 }}>Optional. Pick one and the song will congratulate them on it.</Body>
                </View>
                <Pills options={[...MILESTONE_IDEAS, OTHER_MILESTONE]} value={ownNote ? OTHER_MILESTONE : note} onChange={pickMilestone} />
                {ownNote && (
                  <Animated.View entering={FadeIn.duration(220)}>
                    <Field
                      value={note}
                      onChangeText={(occasion_note) => set('occasion_note', occasion_note)}
                      placeholder="e.g. Promotion to Head of Design"
                      maxLength={120}
                      autoFocus
                      accessibilityLabel="What are we celebrating?"
                    />
                  </Animated.View>
                )}
              </Animated.View>
            )}
          </Section>

          <Section title="Their story" sub={tone?.gentle
            ? 'Share what you’d like them remembered for. One memory is enough, and this is saved, so you can come back when you feel ready.'
            : 'Optional. A detail or two makes the song sound like them.'}
          >
            <StoryCards memories={draft.memories} />
            <StoryTip />
            <Animated.View layout={settle} style={{ flexDirection: 'row' }}>
              {count === 0 ? (
                <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}>Optional</Text>
              ) : (
                <>
                  {/* The number rolls up as details are added, like iOS counters. */}
                  <Animated.Text key={count} entering={rise(0, 10)} style={[type.bold, { fontSize: 13, color: colors.text }]}>{count}</Animated.Text>
                  <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}> of {MEMORY_PROMPTS.length} details added</Text>
                </>
              )}
            </Animated.View>
          </Section>

          <Section title="The sound">
            <View>
              <Label>Mood</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {MOODS.map((m) => {
                  const on = draft.music.mood === m.id
                  return (
                    <Squish ph-label={m.label}
                      key={m.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${m.label}: ${m.blurb}`}
                      to={0.94}
                      pop={on}
                      onPress={() => { tap(); set('music', { mood: m.id }) }}
                      style={{ width: '31.5%', height: 60, paddingHorizontal: 10, borderRadius: 14, justifyContent: 'center', backgroundColor: tint(m.tint), borderWidth: 3, borderColor: on ? colors.text : 'transparent', transitionProperty: 'borderColor', transitionDuration: 180 }}
                    >
                      <Text style={[type.bold, { fontSize: 15, color: colors.ink }]}>{m.label}</Text>
                    </Squish>
                  )
                })}
              </View>
            </View>
            <View>
              <Label>Style</Label>
              <Pills options={GENRES} value={draft.music.genre} onChange={(genre) => set('music', { genre })} />
            </View>
            <View>
              <Label>Voice</Label>
              <Segmented label="Voice" options={VOICES} value={draft.music.voice} onChange={(voice) => set('music', { voice })} />
            </View>
            {/* Only shown when there's more than one to choose from. */}
            {LANGUAGES.length > 1 && (
              <View>
                <Label>Language</Label>
                <Pills options={LANGUAGES} value={draft.music.language} onChange={(language) => set('music', { language })} />
              </View>
            )}
          </Section>

          <Animated.View layout={settle}>
            <Button
              label="Review your song"
              icon={<Spark size={20} color={colors.ink} />}
              disabled={!complete}
              onPress={() => router.push('/review')}
              style={{ marginTop: 20, minHeight: 58 }}
            />
            <Animated.View key={complete ? 'ready' : 'todo'} entering={FadeIn.duration(240)}>
              <Body muted size={13} style={{ marginTop: 12, textAlign: 'center' }}>
                {todo.length > 0
                  ? `Still to add: ${todo.join(', ')}`
                  : `From ${wallet.price('song').label} · ready in minutes · you check every name first`}
              </Body>
            </Animated.View>
          </Animated.View>
        </LayoutAnimationConfig>
      </ScrollView>
      <ScrollHeader title="Create" solid={header.solid} />
    </View>
  )
}

// What the singer actually sings. The music model reads names the way an English
// reader would, so Siobhan comes out as "see over". Tricky names fill in a
// tested or suggested sounds-like spelling (Shivawn); anyone can type their own.
function SoundsLike({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const tricky = isTricky(name)
  // The last spelling filled in for them. Anything else they typed is kept.
  const filled = useRef(value && value === testedSpelling(name) ? value : '')
  const [looking, setLooking] = useState(false)

  useEffect(() => {
    if (value && value !== filled.current) return
    const fill = (v: string) => { filled.current = v; if (v !== value) onChange(v) }
    const n = name.trim()
    if (!n || !isTricky(n)) return fill('')
    const tested = testedSpelling(n)
    if (tested) return fill(tested)
    if (!realSongs) return fill('')
    // Ask the backend once they stop typing.
    let live = true
    const timer = setTimeout(() => {
      setLooking(true)
      suggestSpelling(n)
        .then((s) => { if (live && s) fill(s) })
        .catch(() => {})
        .finally(() => { if (live) setLooking(false) })
    }, 700)
    return () => { live = false; clearTimeout(timer); setLooking(false) }
    // Only a new name should refill it; `value` is read to protect their own typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  const sung = singable(value)
  const hint = looking
    ? 'Finding how to sing it…'
    : /[-]/.test(value) && sung
      ? `One word works best. We’ll sing “${sung}”.`
      : tricky
        ? value
          ? 'Tap the speaker to hear it. Sounds wrong? Type it the way it sounds, as one word.'
          : 'Type it the way it sounds, as one word, so the singer gets it right.'
        : undefined

  return (
    <View style={[{ gap: 8 }, tricky ? { borderWidth: 1, borderColor: colors.coral, borderRadius: 16, padding: 12 } : null]}>
      <Text style={[type.bold, { fontSize: 13, color: colors.muted }]}>
        {tricky ? <Text style={{ color: colors.coral }}>✱ </Text> : null}
        {tricky ? 'Tricky name. We’ll sing it as' : 'Sounds like (optional)'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field
            value={value}
            onChangeText={onChange}
            placeholder={tricky ? 'Type it the way it sounds' : 'e.g. Keeva, for Caoimhe'}
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel="Sounds like"
          />
        </View>
        <SpeakButton text={sung || name} size={50} />
      </View>
      {hint ? <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}>{hint}</Text> : null}
    </View>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <Animated.View layout={settle} style={[ui.card, { marginTop: 14, gap: 14 }]}>
      <View>
        <Text accessibilityRole="header" style={[type.bold, { fontSize: 19, color: colors.text }]}>{title}</Text>
        {sub ? <Body muted size={14} style={{ marginTop: 6 }}>{sub}</Body> : null}
      </View>
      {children}
    </Animated.View>
  )
}

// Picture cards for the occasion, in a row that scrolls sideways.
function OccasionCard({ occasion, selected, onPress }: { occasion: string; selected: boolean; onPress: () => void }) {
  const picture = occasionPicture(occasion)
  return (
    <Squish ph-label={occasionLabel(occasion)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={occasionLabel(occasion)}
      to={0.95}
      onPress={() => { tap(); onPress() }}
      style={{ width: 96, alignItems: 'center', paddingTop: 8, paddingBottom: 10, borderRadius: 18, backgroundColor: occasionColour(occasion), borderWidth: 3, borderColor: selected ? colors.ink : 'transparent' }}
    >
      {picture ? <Image source={picture} style={{ width: 60, height: 60 }} contentFit="contain" accessibilityIgnoresInvertColors /> : <View style={{ height: 16 }} />}
      <Text numberOfLines={1} adjustsFontSizeToFit style={[type.bold, { marginTop: 4, fontSize: 15, color: colors.ink }]}>{occasionLabel(occasion)}</Text>
    </Squish>
  )
}
