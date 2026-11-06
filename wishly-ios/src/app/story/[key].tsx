// One detail of "Their story", asked as a question with a few ideas to start
// from. What they type is saved to the draft as they go, so swiping the sheet
// away keeps it.
import { router, useLocalSearchParams } from 'expo-router'
import { useRef } from 'react'
import { Pressable, ScrollView, Text, TextInput, View, type TextInputInstance } from 'react-native'

import { Body, Button, Eyebrow, Pill, SheetBody, Title, styles as ui, tap } from '@/components/ui'
import { STORY_PROMPTS } from '@/lib/catalog'
import { useDraft } from '@/lib/draft'
import { colors, shade, type } from '@/theme'

// An idea ending in a space or an open quote starts a sentence for them to finish.
const isStarter = (idea: string) => /[\s“]$/.test(idea)

export default function StoryDetail() {
  const { key } = useLocalSearchParams<{ key: string }>()
  const { draft, set } = useDraft()
  const input = useRef<TextInputInstance>(null)
  const prompt = STORY_PROMPTS.find((p) => p.key === key)
  if (!prompt) return null

  const value = draft.memories[prompt.key] ?? ''
  const name = draft.recipient.name.trim()
  const change = (v: string) => set('memories', { [prompt.key]: v })

  const addIdea = (idea: string) => {
    const before = value.trimEnd()
    change(!before ? idea : isStarter(idea) ? `${before} ${idea}` : `${before}, ${idea}`)
    input.current?.focus()
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.surface }} contentContainerStyle={{ paddingBottom: 40 }}>
      <SheetBody>
        <View>
          <Eyebrow>{prompt.title}{name ? ` · ${name}` : ''}</Eyebrow>
          <Title size={24} style={{ marginTop: 6, lineHeight: 29 }}>{prompt.question}</Title>
        </View>

        <TextInput
          ref={input}
          value={value}
          onChangeText={change}
          autoFocus
          multiline={!prompt.short}
          maxLength={prompt.maxLength}
          placeholder={`e.g. ${prompt.examples[0]}`}
          placeholderTextColor={shade(0.4)}
          keyboardAppearance="dark"
          selectionColor={colors.coral}
          autoCapitalize={prompt.short ? 'words' : 'sentences'}
          accessibilityLabel={prompt.label}
          style={[type.regular, ui.input, { fontSize: 17, lineHeight: 23, minHeight: prompt.short ? 52 : 108, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' }]}
        />

        <View style={{ gap: 8 }}>
          <Body muted size={13}>Need a start? Tap one.</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {prompt.ideas.map((idea) => <Pill key={idea} dashed label={isStarter(idea) ? `${idea.replace(/[\s“:]+$/, '')}…` : idea} onPress={() => addIdea(idea)} />)}
          </View>
        </View>

        <Button label={value.trim() ? 'Done' : 'Close'} variant={value.trim() ? 'primary' : 'ghost'} onPress={() => router.back()} style={{ marginTop: 4 }} />
        {value.trim() ? (
          <Pressable accessibilityRole="button" onPress={() => { tap(); change('') }} style={{ alignSelf: 'center', height: 44, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={[type.bold, { fontSize: 15, color: colors.muted }]}>Clear</Text>
          </Pressable>
        ) : null}
      </SheetBody>
    </ScrollView>
  )
}
