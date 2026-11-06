// "Your song is ready": pops up from any screen the moment a song finishes
// (lib/songReady.tsx watches for it), with a quick play and a way to the song.
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated'

import type { Order } from '@/api/orders'
import Cover from '@/components/Cover'
import { PlayPause } from '@/components/motion'
import { Body, Button, Chip, success } from '@/components/ui'
import { usePlayer, useTrack } from '@/lib/player'
import { orderCover, orderTrack, songTitle } from '@/lib/songs'
import { colors, type } from '@/theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const CONFETTI = ['#FF5A5F', '#FFB400', '#00A699', '#FC642D', '#8E44AD']

export function SongReadyModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const still = useReducedMotion()
  const { width, height } = useWindowDimensions()
  const player = usePlayer()
  const track = order ? orderTrack(order) : null
  const now = useTrack(track?.key)

  useEffect(() => { if (order) success() }, [order])

  const quickPlay = () => {
    if (!track) return
    if (now.isCurrent) player.toggle()
    else player.play(track)
  }
  // Read safely: the compiler checks what this handler uses on every render,
  // including while there's no song to show.
  const id = order?.id
  const view = () => {
    onClose()
    if (id) router.navigate(`/song/${id}`)
  }

  return (
    <Modal visible={Boolean(order && track)} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {order && track ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            entering={FadeIn.duration(220)}
            onPress={onClose}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(43,26,34,0.5)' }]}
          />
          <Animated.View
            accessibilityViewIsModal
            entering={still ? FadeIn.duration(200) : ZoomIn.springify(420).dampingRatio(0.62)}
            style={{ width: '100%', maxWidth: 360, alignItems: 'center', paddingTop: 26, paddingBottom: 18, paddingHorizontal: 22, borderRadius: 28, backgroundColor: colors.surface }}
          >
            <Text accessibilityRole="header" style={[type.bold, { fontSize: 24, letterSpacing: -0.4, color: colors.text, textAlign: 'center' }]}>Your Song is Ready! 🎉</Text>
            <View style={{ marginTop: 18, alignItems: 'center' }}>
              <Cover spec={orderCover(order)} size={156} shadow badge={<Chip label="♪ New song" bg={colors.coral} />} />
            </View>
            <Text numberOfLines={2} style={[type.bold, { marginTop: 16, fontSize: 19, color: colors.text, textAlign: 'center' }]}>{songTitle(order)}</Text>
            <Body muted size={14} style={{ marginTop: 4, textAlign: 'center' }}>A song for {order.recipient.name}</Body>
            <Button
              label={now.playing ? 'Pause' : 'Quick play'}
              icon={<PlayPause playing={now.playing} size={18} color={colors.ink} />}
              onPress={quickPlay}
              style={{ marginTop: 20, alignSelf: 'stretch' }}
            />
            <Button label="View song" variant="ghost" size="md" onPress={view} style={{ marginTop: 10, alignSelf: 'stretch' }} />
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose} style={{ marginTop: 6, height: 40, paddingHorizontal: 16, justifyContent: 'center' }}>
              <Text style={[type.bold, { fontSize: 14, color: colors.muted }]}>Later</Text>
            </Pressable>
          </Animated.View>
          {/* One party-popper blast over the card as it opens, once per song.
              Skipped with Reduce Motion. */}
          {still ? null : (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
              <ConfettiCannon key={order.id} count={100} origin={{ x: width / 2, y: height / 3 }} fallSpeed={3000} fadeOut colors={CONFETTI} />
            </View>
          )}
        </View>
      ) : null}
    </Modal>
  )
}
