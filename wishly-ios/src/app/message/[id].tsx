import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { approveAndWrap, getOrder, type Order } from '@/api/orders'
import { Body, Button, Field, SheetBody, Title, success } from '@/components/ui'
import { colors, type } from '@/theme'

export default function AddMessage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [message, setMessage] = useState('')
  const [from, setFrom] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOrder(id).then((o) => {
      setOrder(o)
      setMessage(o.gift?.message ?? '')
      setFrom(o.gift?.from_name || o.buyer.name)
    })
  }, [id])

  if (!order) return null

  async function save() {
    setSaving(true)
    await approveAndWrap(order!, { message: message.trim(), from_name: from.trim() })
    success()
    router.back()
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.surface }} contentContainerStyle={{ paddingBottom: 40 }}>
      <SheetBody>
        <View>
          <Title size={26}>A few words from you</Title>
          <Body muted style={{ marginTop: 6 }}>{order.recipient.name} will see this just before the song.</Body>
        </View>
        <Field
          label="Your message"
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="For the way you turn an ordinary Sunday into our favorite day."
          style={[type.accent, { fontSize: 19, lineHeight: 26, minHeight: 112 }]}
        />
        <Field label="From" value={from} onChangeText={setFrom} autoCapitalize="words" placeholder="Your name" />
        <Button label={order.status === 'approved' ? 'Save message' : 'Create their gift link'} disabled={!from.trim()} busy={saving} onPress={save} style={{ marginTop: 4 }} />
      </SheetBody>
    </ScrollView>
  )
}
