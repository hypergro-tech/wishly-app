// "Their story" on Create: a soft card per detail, with an example to jog a
// memory. Tapping one opens its sheet (src/app/story/[key].tsx).
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated'

import { Squish } from '@/components/motion'
import { CheckIcon } from '@/components/icons'
import { STAMP, StoryArt, type ArtKind } from '@/components/StoryArt'
import { tap } from '@/components/ui'
import { STORY_PROMPTS, STORY_TIPS, type StoryPrompt } from '@/lib/catalog'
import { quoted } from '@/lib/text'
import { type } from '@/theme'

export function StoryCards({ memories }: { memories: Record<string, string> }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {STORY_PROMPTS.map((p) => <StoryCard key={p.key} prompt={p} value={memories[p.key]?.trim() ?? ''} />)}
    </View>
  )
}

// Each empty card is a soft colour with a small stamp of its theme in the
// corner (src/components/StoryArt.tsx). A filled card drops the stamp for a
// soft green tint, a green tick and what they wrote.
const TITLE = '#1A2B2C'
const EXAMPLE = '#52606D'
const DONE = { bg: '#F0FDF4', border: '#BBF7D0', tick: '#16A34A', ink: '#166534' }

const STORY_LOOKS: Record<string, { bg: string; art: ArtKind; ink: string }> = {
  ritual: { bg: '#FFF3E0', art: 'sparks', ink: '#E8892B' },
  inside_joke: { bg: '#E8F5E9', art: 'speech', ink: '#43A047' },
  nickname: { bg: '#F3E5F5', art: 'bubbles', ink: '#AB47BC' },
  memory: { bg: '#E1F5FE', art: 'film', ink: '#039BE5' },
  want_to_say: { bg: '#FFFDE7', art: 'hearts', ink: '#F9A825' },
  avoid: { bg: '#FFEBEE', art: 'peek', ink: '#E57373' },
}

function StoryCard({ prompt, value }: { prompt: StoryPrompt; value: string }) {
  const filled = Boolean(value)
  const look = STORY_LOOKS[prompt.key]
  // Sayings and nicknames read as quotes, like on Review.
  const snippet = prompt.key === 'inside_joke' || prompt.key === 'nickname' ? quoted(value) : value
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={filled ? `${prompt.tag}: ${value}. Edit` : `Add ${prompt.title.toLowerCase()}. For example ${prompt.examples.join(', or ')}`}
      to={0.96}
      onPress={() => { tap(); router.push({ pathname: '/story/[key]', params: { key: prompt.key } }) }}
      style={{
        width: '48%',
        minWidth: 150,
        flexGrow: 1,
        minHeight: 116,
        padding: 14,
        justifyContent: 'space-between',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: filled ? DONE.border : 'transparent',
        overflow: 'hidden',
        backgroundColor: filled ? DONE.bg : look.bg,
        transitionProperty: ['backgroundColor', 'borderColor'],
        transitionDuration: 220,
      }}
    >
      {filled ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: DONE.tick, alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={10} color="#FFFFFF" />
            </View>
            <Text style={[type.bold, { flex: 1, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', color: DONE.ink }]}>{prompt.tag}</Text>
          </View>
          <Text numberOfLines={3} style={[type.accent, { marginTop: 10, fontSize: 15, lineHeight: 20, color: TITLE }]}>{snippet}</Text>
        </View>
      ) : (
        <>
          <StoryArt kind={look.art} ink={look.ink} />
          {/* Room at the bottom keeps the text clear of the corner stamp. */}
          <View style={{ marginBottom: STAMP - 6 }}>
            <Text style={[type.bold, { fontSize: 14, lineHeight: 18, color: TITLE }]}>{prompt.title}</Text>
            <Text numberOfLines={2} style={[type.regular, { marginTop: 4, fontSize: 12, lineHeight: 16, color: EXAMPLE }]}>e.g. “{prompt.examples[0]}”</Text>
          </View>
        </>
      )}
    </Squish>
  )
}

const EVERY = 6000

// A tip that changes every few seconds. Tap for the next one.
export function StoryTip() {
  const still = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setI((n) => (n + 1) % STORY_TIPS.length), EVERY)
    return () => clearInterval(timer)
  }, [i])

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tip: ${STORY_TIPS[i]} Next tip`}
      onPress={() => setI((n) => (n + 1) % STORY_TIPS.length)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F0E6D2', backgroundColor: '#FFFDF5', minHeight: 56 }}
    >
      <Text style={{ fontSize: 12, lineHeight: 18 }}>💡</Text>
      <Animated.Text
        key={i}
        entering={still ? undefined : FadeIn.duration(320)}
        exiting={still ? undefined : FadeOut.duration(160)}
        style={[type.regular, { flex: 1, fontSize: 12, lineHeight: 18, color: '#5F6B7B' }]}
      >
        {STORY_TIPS[i]}
      </Animated.Text>
    </Pressable>
  )
}
