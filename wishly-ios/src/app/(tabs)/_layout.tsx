import { Tabs } from 'expo-router'

import TabBar from '@/components/TabBar'
import { colors } from '@/theme'

// Home · Create · My songs, with the mini player riding above the tab bar.
export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="songs" options={{ title: 'My songs' }} />
    </Tabs>
  )
}
