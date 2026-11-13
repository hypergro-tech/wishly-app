// Song cover art. Example songs use a photo. A buyer's songs take turns
// through five calm minimalist artworks (no people), with the song title
// on top; without one, the cover is the title on its occasion's soft colour.
import { Image } from 'expo-image'
import type { ReactNode } from 'react'
import { Text, View, type ViewStyle } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import { colors, tint, type, type Tint } from '@/theme'
import { Spark } from './brand'

export type CoverSpec = { name: string; tint: Tint; photo?: number | null; photoAlt?: string; caption?: string; art?: number }

// The five artworks, in the order songs take them. A soft dark fade at the
// bottom keeps the white title readable on every one.
export const COVER_ART: number[] = [
  require('../../assets/covers/cover1.jpg'), // glass bubbles, sage
  require('../../assets/covers/cover2.jpg'), // sand waves, terracotta
  require('../../assets/covers/cover3.jpg'), // pink arch, blush
  require('../../assets/covers/cover4.jpg'), // pebbles, sage and clay
  require('../../assets/covers/cover5.jpg'), // vase with a dried flower, lavender
]

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
  const art = spec.art !== undefined ? COVER_ART[spec.art % COVER_ART.length] : null
  if (art) {
    const ink = '#FFFFFF'
    const glow = 'rgba(0,0,0,0.45)'
    return (
      <View
        accessible
        accessibilityLabel={`Cover: ${spec.name}`}
        style={[{ width: size, height: size, borderRadius: r, overflow: 'hidden', padding: pad, justifyContent: 'space-between' }, lift, style]}
      >
        <Image source={art} contentFit="cover" style={{ position: 'absolute', inset: 0, borderRadius: r }} accessibilityIgnoresInvertColors />
        {/* A soft fade behind the title, so it reads on every artwork. */}
        <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.55" stopColor="#0B0F1A" stopOpacity={0} />
              <Stop offset="1" stopColor="#0B0F1A" stopOpacity={0.5} />
            </LinearGradient>
          </Defs>
          <Rect width={size} height={size} fill="url(#fade)" />
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Spark size={Math.round(size * 0.08)} color={colors.butter} />
          {badge}
        </View>
        {/* Small covers sit next to the title already, so they show only the art. */}
        {spec.name && size >= 90 ? (
          <View>
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={[type.bold, { color: ink, fontSize: Math.max(11, Math.round(size * 0.1)), lineHeight: Math.max(13, Math.round(size * 0.118)), letterSpacing: -size * 0.001, textShadowColor: glow, textShadowRadius: 8 }]}
            >
              {spec.name}
            </Text>
            {big && spec.caption ? (
              <Text style={[type.regular, { color: ink, opacity: 0.85, fontSize: Math.max(11, Math.round(size * 0.048)), marginTop: 4, textShadowColor: glow, textShadowRadius: 6 }]}>
                {spec.caption} · wishly<Text style={{ color: colors.butter }}>.</Text>
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    )
  }
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
