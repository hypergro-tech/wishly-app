import { router, useFocusEffect } from 'expo-router'
import { useBottomTabBarHeight } from 'expo-router/js-tabs'
import { useCallback, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { listOrders, type Order } from '@/api/orders'
import { useSession } from '@/api/session'
import { Spark } from '@/components/brand'
import Cover from '@/components/Cover'
import { ScrollHeader, useScrollHeader } from '@/components/glass'
import { ChevronRightIcon } from '@/components/icons'
import { Squish } from '@/components/motion'
import { Body, Button, Chip, Pill, Title, tap } from '@/components/ui'
import { orderCover, orderedLine, statusChip } from '@/lib/songs'
import { colors, type } from '@/theme'

const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'progress', label: 'In progress', match: (o: Order) => o.status !== 'approved' },
  { id: 'give', label: 'Ready to give', match: (o: Order) => o.status === 'approved' },
]

export default function MySongs() {
  const insets = useSafeAreaInsets()
  const tabBar = useBottomTabBarHeight()
  const header = useScrollHeader(12)
  const { user } = useSession()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const needsSignIn = !user // Songs belong to an account.

  const load = useCallback(async () => {
    try {
      setOrders(needsSignIn ? [] : await listOrders())
    } catch {
      setOrders([])
    }
  }, [needsSignIn])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const shown = (orders ?? []).filter(FILTERS.find((f) => f.id === filter)!.match)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={header.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: tabBar + 32 }}
        scrollIndicatorInsets={{ bottom: tabBar }}
        refreshControl={<RefreshControl tintColor={colors.muted} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
      >
        <Title size={34}>My songs</Title>

        {needsSignIn ? (
          <Empty title="Your songs, on any device." body="Sign in to hear the songs you’ve made." action="Sign in" onPress={() => router.push('/sign-in')} />
        ) : orders === null ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.muted} />
        ) : orders.length === 0 ? (
          <Empty title="No songs yet." body="One small memory is enough to begin." action="Create a song" onPress={() => router.navigate('/create')} />
        ) : (
          <>
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {FILTERS.map((f) => <Pill key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />)}
            </View>
            <View style={{ marginTop: 8 }}>
              {shown.map((o, i) => {
                const chip = statusChip(o)
                return (
                  <Squish
                    key={o.id}
                    accessibilityRole="button"
                    to={0.98}
                    onPress={() => { tap(); router.push(`/song/${o.id}`) }}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: i < shown.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,250,245,0.08)', opacity: pressed ? 0.85 : 1 })}
                  >
                    <Cover spec={orderCover(o)} size={68} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[type.bold, { fontSize: 17, color: colors.text }]}>A song for {o.recipient.name}</Text>
                      <Text numberOfLines={1} style={[type.regular, { fontSize: 13, color: colors.muted, marginTop: 2 }]}>{orderedLine(o)}</Text>
                      <View style={{ marginTop: 7 }}><Chip label={chip.label} bg={chip.bg} fg={chip.fg} /></View>
                    </View>
                    <ChevronRightIcon />
                  </Squish>
                )
              })}
              {shown.length === 0 && <Body muted style={{ marginTop: 20 }}>Nothing here yet.</Body>}
            </View>
          </>
        )}

        {user && (
          <Body muted size={13} style={{ marginTop: 28, textAlign: 'center' }}>Signed in as {user.email}</Body>
        )}
      </ScrollView>
      <ScrollHeader title="My songs" solid={header.solid} />
    </View>
  )
}

function Empty({ title, body, action, onPress }: { title: string; body: string; action: string; onPress: () => void }) {
  return (
    <View style={{ marginTop: 20, padding: 28, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center' }}>
      <Spark size={40} />
      <Text style={[type.bold, { fontSize: 22, color: colors.text, marginTop: 16, textAlign: 'center' }]}>{title}</Text>
      <Body muted style={{ marginTop: 6, textAlign: 'center' }}>{body}</Body>
      <Button label={action} onPress={onPress} style={{ marginTop: 20, alignSelf: 'stretch' }} />
    </View>
  )
}
