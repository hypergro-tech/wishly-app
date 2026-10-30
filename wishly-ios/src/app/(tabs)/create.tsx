import { router } from 'expo-router'
import { useBottomTabBarHeight } from 'expo-router/js-tabs'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Spark } from '@/components/brand'
import { ScrollHeader, useScrollHeader } from '@/components/glass'
import { Squish } from '@/components/motion'
import { Body, Button, Field, Label, Pill, Pills, Segmented, SpeakButton, Title, nudge, styles as ui, tap } from '@/components/ui'
import { CORE_PACKAGE, DELIVERY, GENRES, LANGUAGES, MEMORY_PROMPTS, MOODS, OCCASIONS, OCCASION_TONES, RELATIONSHIPS, formatPrice } from '@/lib/catalog'
import { realSongs } from '@/api/base44Client'
import { suggestSpelling } from '@/api/orders'
import { filledMemories, missing, useDraft } from '@/lib/draft'
import { isTricky, singable, testedSpelling } from '@/lib/names'
import { focusSafe, useRise } from '@/lib/motion'
import { colors, tint, type, shade } from '@/theme'

// Cards and choices glide to their new places when details are added.
const settle = LinearTransition.springify(420).dampingRatio(0.92)

const VOICES = [
  { id: 'Female vocal', label: 'Female' },
  { id: 'Male vocal', label: 'Male' },
  { id: 'Duet', label: 'Duet' },
  { id: 'No preference', label: 'Any' },
]

const occasionLabel = (o: string) => o.replace("'", '’')

export default function Create() {
  const { version } = useDraft()
  return <CreateForm key={version} />
}

function CreateForm() {
  const insets = useSafeAreaInsets()
  const tabBar = useBottomTabBarHeight()
  const header = useScrollHeader(10)
  const rise = useRise()
  const { draft, set, reset } = useDraft()
  // Details someone has opened but not filled yet.
  const [opened, setOpened] = useState<string[]>([])
  const r = draft.recipient
  const tone = OCCASION_TONES[draft.occasion]
  const shown = MEMORY_PROMPTS.filter((m) => draft.memories[m.key]?.trim() || opened.includes(m.key))
  const hidden = MEMORY_PROMPTS.filter((m) => !shown.includes(m))
  const showAvoid = Boolean(draft.memories.avoid?.trim() || opened.includes('avoid'))
  const todo = missing(draft)
  const count = filledMemories(draft).length

  // A light tap the moment the song is ready to review.
  const complete = todo.length === 0
  const wasComplete = useRef(complete)
  useEffect(() => {
    if (complete && !wasComplete.current) nudge()
    wasComplete.current = complete
  }, [complete])

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
              <Pressable accessibilityRole="button" onPress={() => { tap(); startOver() }} hitSlop={10}>
                <Text style={[type.bold, { fontSize: 15, color: colors.muted }]}>Start over</Text>
              </Pressable>
            )}
          </View>

          <Section title="Who’s it for?">
            <Field label="Their name, as it’s written" big value={r.name} onChangeText={(name) => set('recipient', { name })} placeholder="e.g. Grace" autoCapitalize="words" autoCorrect={false} />
            <SoundsLike name={r.name} value={r.pronunciation} onChange={(pronunciation) => set('recipient', { pronunciation })} />
            <View>
              <Label>They are your…</Label>
              <Pills options={RELATIONSHIPS} value={r.relationship} onChange={(relationship) => set('recipient', { relationship })} />
            </View>
          </Section>

          <Section title="The occasion">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {OCCASIONS.map((o) => <Pill key={o} label={occasionLabel(o)} selected={draft.occasion === o} onPress={() => set('occasion', o)} />)}
            </View>
            {tone && (
              <Animated.View key={draft.occasion} entering={FadeIn.duration(260)} style={{ paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: colors.coral }}>
                <Text style={[type.accent, { fontSize: 17, lineHeight: 23, color: colors.text }]}>{tone.line}</Text>
              </Animated.View>
            )}
          </Section>

          <Section title="Their story" sub={tone?.gentle
            ? 'Share what you’d like them remembered for. One memory is enough, and this is saved, so you can come back when you feel ready.'
            : 'One small memory is enough to begin. The more specific, the more it sounds like them.'}
          >
            {shown.map((m) => (
              <Detail key={m.key} title={m.title}>
                <TextInput
                  value={draft.memories[m.key]}
                  onChangeText={(v) => set('memories', { [m.key]: v })}
                  placeholder={m.placeholder}
                  placeholderTextColor={shade(0.4)}
                  keyboardAppearance="dark"
                  selectionColor={colors.coral}
                  multiline={!m.short}
                  autoFocus={opened.includes(m.key) && !draft.memories[m.key]}
                  accessibilityLabel={m.label}
                  style={[type.regular, { fontSize: 16, lineHeight: 22, color: colors.text, padding: 0, marginTop: 6 }]}
                />
              </Detail>
            ))}
            {showAvoid && (
              <Detail title="Leave out">
                <TextInput
                  value={draft.memories.avoid}
                  onChangeText={(avoid) => set('memories', { avoid })}
                  placeholder="Topics, words or names that shouldn’t appear"
                  placeholderTextColor={shade(0.4)}
                  keyboardAppearance="dark"
                  selectionColor={colors.coral}
                  autoFocus={opened.includes('avoid') && !draft.memories.avoid}
                  accessibilityLabel="Anything to leave out"
                  style={[type.regular, { fontSize: 16, lineHeight: 22, color: colors.text, padding: 0, marginTop: 6 }]}
                />
              </Detail>
            )}
            <Animated.View layout={settle} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {hidden.map((m) => (
                <Animated.View key={m.key} layout={settle} exiting={FadeOut.duration(140)}>
                  <Pill dashed label={`+ ${m.chip}`} onPress={() => setOpened((o) => [...o, m.key])} />
                </Animated.View>
              ))}
              {!showAvoid && (
                <Animated.View layout={settle} exiting={FadeOut.duration(140)}>
                  <Pill dashed label="+ Leave something out" onPress={() => setOpened((o) => [...o, 'avoid'])} />
                </Animated.View>
              )}
            </Animated.View>
            <Animated.View layout={settle} style={{ flexDirection: 'row' }}>
              {count === 0 ? (
                <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}>Add one detail to begin</Text>
              ) : (
                <>
                  {/* The number rolls up as details are added, like iOS counters. */}
                  <Animated.Text key={count} entering={rise(0, 10)} style={[type.bold, { fontSize: 13, color: colors.text }]}>{count}</Animated.Text>
                  <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}> detail{count > 1 ? 's' : ''} added</Text>
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
                    <Squish
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
            <View>
              <Label>Language</Label>
              <Pills options={LANGUAGES} value={draft.music.language} onChange={(language) => set('music', { language })} />
            </View>
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
                  : `${formatPrice(CORE_PACKAGE.price)} · ready in ${DELIVERY[0].days} days · you check every name first`}
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

// Opens into place when added.
function Detail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Animated.View layout={settle} entering={focusSafe(FadeIn.duration(260))} style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.fill }}>
      <Text style={[type.bold, { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted }]}>{title}</Text>
      {children}
    </Animated.View>
  )
}
