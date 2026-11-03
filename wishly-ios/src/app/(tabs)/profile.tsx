// Who's signed in, settings, and the website's help and policy pages.
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useBottomTabBarHeight } from 'expo-router/js-tabs'
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSession } from '@/api/session'
import { ScrollHeader, useScrollHeader } from '@/components/glass'
import { ChevronRightIcon } from '@/components/icons'
import { Body, Button, Title, tap } from '@/components/ui'
import { HELP, LEGAL, openSitePage } from '@/lib/site'
import { colors, type, shade } from '@/theme'

export default function Profile() {
  const insets = useSafeAreaInsets()
  const tabBar = useBottomTabBarHeight()
  const header = useScrollHeader(12)
  const { isBase44, user, signOut } = useSession()
  const name = user?.full_name?.trim()

  const logOut = () =>
    Alert.alert('Log out of Wishly?', 'Your songs stay saved to your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={header.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: tabBar + 32 }}
        scrollIndicatorInsets={{ bottom: tabBar }}
      >
        <Title size={34}>Profile</Title>

        {user ? (
          <View style={{ marginTop: 16, padding: 18, borderRadius: 22, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[type.bold, { fontSize: 22, color: colors.ink }]}>{(name || user.email)[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {name ? <Text numberOfLines={1} style={[type.bold, { fontSize: 19, color: colors.text }]}>{name}</Text> : null}
              <Text numberOfLines={1} style={[type.regular, { fontSize: 14, color: colors.muted, marginTop: name ? 2 : 0 }]}>{user.email}</Text>
              {!isBase44 && <Text style={[type.regular, { fontSize: 12, color: colors.muted, marginTop: 4 }]}>Demo mode: songs are saved on this phone only.</Text>}
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 16, padding: 18, borderRadius: 22, backgroundColor: colors.surface }}>
            <Text style={[type.bold, { fontSize: 19, color: colors.text }]}>Your songs, on any device.</Text>
            <Body muted size={14} style={{ marginTop: 4 }}>Sign in to keep every song you make.</Body>
            <Button label="Sign in" size="md" onPress={() => router.push('/sign-in')} style={{ marginTop: 14 }} />
          </View>
        )}

        <Section title="Your songs">
          <Row label="My songs" onPress={() => router.navigate('/songs')} />
          <Row label="Start a new song" onPress={() => router.navigate('/create')} />
        </Section>

        <Section title="Settings">
          <Row label="Notifications" detail="iPhone Settings" onPress={() => Linking.openSettings()} />
        </Section>

        <Section title="Help">
          {HELP.map((p) => <Row key={p.path} label={p.label} onPress={() => openSitePage(p.path)} />)}
        </Section>

        <Section title="Legal">
          {LEGAL.map((p) => <Row key={p.path} label={p.label} onPress={() => openSitePage(p.path)} />)}
        </Section>

        {user && <Button label="Log out" variant="ghost" size="md" onPress={logOut} style={{ marginTop: 28 }} />}

        <Text style={[type.regular, { marginTop: 20, fontSize: 12, color: colors.muted, textAlign: 'center' }]}>
          Wishly {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
      <ScrollHeader title="Profile" solid={header.solid} />
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode[] | React.ReactNode }) {
  return (
    <>
      <Text accessibilityRole="header" style={[type.bold, { marginTop: 28, marginBottom: 8, marginLeft: 4, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 }]}>{title}</Text>
      <View style={{ borderRadius: 18, backgroundColor: colors.surface, overflow: 'hidden' }}>{children}</View>
    </>
  )
}

function Row({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { tap(); onPress() }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16, backgroundColor: pressed ? colors.fill : 'transparent', borderBottomWidth: 1, borderBottomColor: shade(0.06) })}
    >
      <Text style={[type.regular, { flex: 1, fontSize: 16, color: colors.text }]}>{label}</Text>
      {detail ? <Text style={[type.regular, { fontSize: 14, color: colors.muted }]}>{detail}</Text> : null}
      <ChevronRightIcon />
    </Pressable>
  )
}
