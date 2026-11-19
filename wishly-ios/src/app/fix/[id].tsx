import { router, useLocalSearchParams } from 'expo-router'
import { track, trackFailure } from '@/lib/analytics'
import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

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
  // An anniversary couple's second name.
  const [partner, setPartner] = useState('')
  const [partnerSays, setPartnerSays] = useState('')
  const [field, setField] = useState('ritual')
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getOrder(id).then((o) => {
      setOrder(o)
      setName(o.recipient.name)
      setPronunciation(o.recipient.pronunciation)
      setPartner(o.recipient.partner_name ?? '')
      setPartnerSays(o.recipient.partner_pronunciation ?? '')
      const first = MEMORY_PROMPTS.find((m) => o.memories[m.key])?.key ?? 'ritual'
      setField(first)
      setValue(o.memories[first] ?? '')
    })
  }, [id])

  if (!order) return null

  // A name or detail fix needs the corrected text; the others need a note.
  const couple = Boolean(order.recipient.partner_name?.trim())
  const canSend = kind === 'name' ? name.trim() && (!couple || partner.trim()) : kind === 'fact' ? value.trim() : note.trim()
  const filled = MEMORY_PROMPTS.filter((m) => order.memories[m.key])

  async function send() {
    setSending(true)
    const changes = kind === 'name'
      ? { recipient: { name: name.trim(), pronunciation: pronunciation.trim(), ...(couple ? { partner_name: partner.trim(), partner_pronunciation: partnerSays.trim() } : {}) } }
      : kind === 'fact' ? { memories: { [field]: value.trim() } } : {}
    try {
      await requestCorrection(order!, { kind, note: note || KINDS.find((k) => k.id === kind)!.label, changes })
    } catch (error) {
      trackFailure('send correction', error)
      // The backend says why (e.g. a song remade the most times the app allows).
      const reason = (error as { response?: { data?: { error?: string } }; data?: { error?: string } })
      Alert.alert('We couldn’t remake this song', reason?.response?.data?.error || reason?.data?.error || 'Check your connection and try again.')
      setSending(false)
      return
    }
    track('correction_sent', { kind })
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
              <Pressable ph-label={k.label}
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
              <Text style={[type.bold, { fontSize: 13, color: colors.muted }]}>Sounds like (one word)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Field value={pronunciation} onChangeText={setPronunciation} autoCorrect={false} accessibilityLabel="Sounds like" autoCapitalize="words" /></View>
                <SpeakButton text={pronunciation || name} size={50} />
              </View>
            </View>
            {couple && (
              <>
                <Field label="Second name" value={partner} onChangeText={setPartner} autoCorrect={false} style={{ fontWeight: '700' }} />
                <View style={{ gap: 8 }}>
                  <Text style={[type.bold, { fontSize: 13, color: colors.muted }]}>Sounds like (one word)</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}><Field value={partnerSays} onChangeText={setPartnerSays} autoCorrect={false} accessibilityLabel="Second name sounds like" autoCapitalize="words" /></View>
                    <SpeakButton text={partnerSays || partner} size={50} />
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {kind === 'fact' && (
          <View style={{ padding: 16, borderRadius: 18, backgroundColor: colors.bg, gap: 14 }}>
            <View>
              <Label>Which detail?</Label>
              <Pills
                options={filled.map((m) => m.title)}
                value={MEMORY_PROMPTS.find((m) => m.key === field)?.title ?? ''}
                onChange={(title) => {
                  const key = MEMORY_PROMPTS.find((m) => m.title === title)!.key
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
          placeholder={kind === 'name' ? `e.g. It should sound like ${pronunciation || 'Keeva'}, not Kay-oh-im` : undefined}
        />

        <Button label="Send correction" disabled={!canSend} busy={sending} onPress={send} style={{ marginTop: 4 }} />
      </SheetBody>
    </ScrollView>
  )
}
