// Song cover art. Example songs use a photo; every gift gets a cover made from
// the recipient's name (or the song title) on its occasion's soft colour.
import { Image } from 'expo-image'
import type { ReactNode } from 'react'
import { Text, View, type ViewStyle } from 'react-native'

import { colors, tint, type, type Tint } from '@/theme'
import { Spark } from './brand'

export type CoverSpec = { name: string; tint: Tint; photo?: number | null; photoAlt?: string; caption?: string }

export default function Cover({ spec, size, badge, shadow, style }: {
  spec: CoverSpec
  size: number
  badge?: ReactNode
  shadow?: boolean
  style?: ViewStyle
}) {
  const r = Math.max(9, Math.round(size * 0.09))
  const lift = shadow ? { shadowColor: '#5A2A1A', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 18 } } : null

  if (spec.photo) {
    return (
      <View style={[{ width: size, height: size, borderRadius: r }, lift, style]}>
        <Image source={spec.photo} accessibilityLabel={spec.photoAlt} contentFit="cover" style={{ width: size, height: size, borderRadius: r }} />
      </View>
    )
  }

  const pad = Math.round(size * 0.08)
  const big = size >= 160
  return (
    <View
      accessible
      accessibilityLabel={`Cover: ${spec.name}`}
      style={[{ width: size, height: size, borderRadius: r, padding: pad, backgroundColor: tint(spec.tint), justifyContent: 'space-between' }, lift, style]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Spark size={Math.round(size * 0.13)} color={spec.tint === 'coral' ? colors.ink : colors.coral} />
        {badge}
      </View>
      <View>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={[type.bold, { color: colors.ink, fontSize: Math.round(size * 0.2), lineHeight: Math.round(size * 0.21), letterSpacing: -size * 0.005 }]}
        >
          {spec.name}
        </Text>
        {big && spec.caption ? (
          <Text style={[type.bold, { color: colors.ink, fontSize: 12, marginTop: 6 }]}>
            {spec.caption} · wishly<Text style={{ color: spec.tint === 'coral' ? colors.ink : colors.coral }}>.</Text>
          </Text>
        ) : null}
      </View>
    </View>
  )
}
