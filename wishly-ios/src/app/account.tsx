// The signed-in person, and a way out. Nobody lands here signed out: every
// "Sign in" opens the sign-in sheet instead.
import { router } from 'expo-router'
import { ScrollView } from 'react-native'

import { useSession } from '@/api/session'
import { Spark } from '@/components/brand'
import { Body, Button, SheetBody, Title } from '@/components/ui'
import { colors } from '@/theme'

export default function Account() {
  const { isBase44, user, signOut } = useSession()

  return (
    <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={{ paddingBottom: 32 }}>
      <SheetBody>
        <Spark size={32} />
        <Title size={26}>Your account</Title>
        {user ? (
          <>
            <Body muted>Signed in as {user.email}</Body>
            {!isBase44 && <Body muted size={13}>Demo mode: songs are saved on this phone only.</Body>}
            <Button label="Sign out" variant="ghost" onPress={async () => { await signOut(); router.back() }} style={{ marginTop: 8 }} />
          </>
        ) : (
          <>
            <Body muted>You’re not signed in.</Body>
            <Button label="Sign in" onPress={() => router.replace('/sign-in')} style={{ marginTop: 8 }} />
          </>
        )}
      </SheetBody>
    </ScrollView>
  )
}
