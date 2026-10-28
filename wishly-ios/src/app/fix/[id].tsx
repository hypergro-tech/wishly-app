import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { getOrder, requestCorrection, type Order } from '@/api/orders'
import { Body, Button, CheckCircle, Field, Label, Pills, SheetBody, SpeakButton, Title, success, tap } from '@/components/ui'
import { MEMORY_PROMPTS } from '@/lib/catalog'
import { colors, type } from '@/theme'

const KINDS = [
  { id: 'name', label: 'Their name or how it’s said' },
  { id: 'fact', label: 'A detail or fact' },
  { id: 'wording', label: 'A line doesn’t sound right' },
  { id: 'other', label: 'Something else' },
]

export default function FixSomething() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [kind, setKind] = useState('name')
  const [note, setNote] = useState('')
  const [name, setName] = useState('')
  const [pronunciation, setPronunciation] = useState('')
  const [field, setField] = useState('ritual')
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getOrder(id).then((o) => {
      setOrder(o)
      setName(o.recipient.name)
      setPronunciation(o.recipient.pronunciation)
      const first = MEMORY_PROMPTS.find((m) => o.memories[m.key])?.key ?? 'ritual'
      setField(first)
      setValue(o.memories[first] ?? '')
    })
  }, [id])

  if (!order) return null

  const canSend = kind === 'name' || kind === 'fact' || note.trim()
  const filled = MEMORY_PROMPTS.filter((m) => order.memories[m.key])

  async function send() {
    setSending(true)
    const changes = kind === 'name' ? { recipient: { name, pronunciation } } : kind === 'fact' ? { memories: { [field]: value } } : {}
    await requestCorrection(order!, { kind, note: note || KINDS.find((k) => k.id === kind)!.label, changes })
    success()
    router.back()
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.surface }} contentContainerStyle={{ paddingBottom: 40 }}>
      <SheetBody>
        <View>
          <Title size={26}>What needs another look?</Title>
          <Body muted style={{ marginTop: 8 }}>Tell us what’s not right. You’ll hear the new version first.</Body>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KINDS.map((k) => {
            const on = kind === k.id
            return (
              <Pressable
                key={k.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => { tap(); setKind(k.id) }}
                style={{ width: '48.5%', minHeight: 66, padding: 12, paddingRight: 34, borderRadius: 16, borderWidth: 2, borderColor: on ? colors.text : 'transparent', backgroundColor: colors.fill }}
              >
                <Text style={[type.bold, { fontSize: 15, lineHeight: 19, color: colors.text }]}>{k.label}</Text>
                {on && <View style={{ position: 'absolute', top: 10, right: 10 }}><CheckCircle checked size={20} /></View>}
              </Pressable>
            )
          })}
        </View>

        {kind === 'name' && (
          <View style={{ padding: 16, borderRadius: 18, backgroundColor: colors.bg, gap: 14 }}>
            <Body>That name needs another look? You can correct it here.</Body>
            <Field label="Name" value={name} onChangeText={setName} autoCorrect={false} style={{ fontWeight: '700' }} />
            <View style={{ gap: 8 }}>
              <Text style={[type.bold, { fontSize: 13, color: colors.muted }]}>How it’s said</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Field value={pronunciation} onChangeText={setPronunciation} autoCorrect={false} accessibilityLabel="How it’s said" /></View>
                <SpeakButton text={pronunciation || name} size={50} />
              </View>
            </View>
          </View>
        )}

        {kind === 'fact' && (
          <View style={{ padding: 16, borderRadius: 18, backgroundColor: colors.bg, gap: 14 }}>
            <View>
              <Label>Which detail?</Label>
              <Pills
                options={filled.map((m) => m.chip)}
                value={MEMORY_PROMPTS.find((m) => m.key === field)?.chip ?? ''}
                onChange={(chip) => {
                  const key = MEMORY_PROMPTS.find((m) => m.chip === chip)!.key
                  setField(key)
                  setValue(order.memories[key] ?? '')
                }}
              />
            </View>
            <Field label="What it should say" value={value} onChangeText={setValue} multiline />
          </View>
        )}

        <Field
          label={kind === 'wording' ? 'Which line, and what should change?' : 'Anything else we should know? (optional)'}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder={kind === 'name' ? `e.g. It’s ${pronunciation || 'PREE-yah'}, not PRY-ah` : undefined}
        />

        <Button label="Send correction" disabled={!canSend} busy={sending} onPress={send} style={{ marginTop: 4 }} />
      </SheetBody>
    </ScrollView>
  )
}
