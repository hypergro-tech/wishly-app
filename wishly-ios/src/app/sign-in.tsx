// Sign-in, asked once: when a song is saved, or from "Sign in". Three ways in,
// one screen each. Email is the same two boxes for new and returning people; a
// 6-digit code confirms a new address.
import * as WebBrowser from 'expo-web-browser'
import { router, useLocalSearchParams } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { LayoutAnimationConfig, cubicBezier, useReducedMotion } from 'react-native-reanimated'

import { showDemoTools } from '@/api/base44Client'
import { AuthError, useSession, type Provider } from '@/api/session'
import { Spark } from '@/components/brand'
import Cover from '@/components/Cover'
import { AppleIcon, BackIcon, EmailIcon } from '@/components/icons'
import { Squish } from '@/components/motion'
import { Body, Button, Field, IconButton, success, tap } from '@/components/ui'
import { OCCASION_TONES } from '@/lib/catalog'
import { useDraft } from '@/lib/draft'
import { focusSafe, popIn, slideIn, stillFade, useShake } from '@/lib/motion'
import { colors, radius, type } from '@/theme'

type Mode = 'choose' | 'email' | 'code'
const STEPS: Mode[] = ['choose', 'email', 'code']

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL
const ERROR = 'Something went wrong. Try again in a moment.'

export default function SignIn() {
  const { name } = useLocalSearchParams<{ name?: string }>()
  const { draft } = useDraft()
  const session = useSession()
  const still = useReducedMotion()
  const [mode, setMode] = useState<Mode>('choose')
  const [back, setBack] = useState(false) // which way the steps slide
  const [boxesWidth, setBoxesWidth] = useState(0)
  const codeShake = useShake()
  const formShake = useShake()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<Provider | 'email' | 'code' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const validEmail = /\S+@\S+\.\S+/.test(email.trim())

  // Steps slide in from the side they're heading to, like moving through Settings.
  const go = (next: Mode) => {
    setBack(STEPS.indexOf(next) < STEPS.indexOf(mode))
    setMode(next)
  }
  const slide = focusSafe(still ? stillFade() : slideIn(back ? 'left' : 'right'))
  const digitIn = still ? stillFade() : popIn()
  const box = boxesWidth ? (boxesWidth - 8 * 5) / 6 : 0

  const done = () => {
    success()
    router.back()
    session.runAfterSignIn()
  }

  async function attempt(what: Provider | 'email' | 'code', run: () => Promise<void>, onFail?: () => void) {
    setBusy(what)
    setError(null)
    setNote(null)
    try {
      await run()
    } catch (e) {
      setError(e instanceof AuthError ? e.message : ERROR)
      onFail?.()
    } finally {
      setBusy(null)
    }
  }

  const withProvider = (provider: Provider) => attempt(provider, async () => {
    if (await session.signInWithProvider(provider)) done()
  })

  const withEmail = () => attempt('email', async () => {
    const result = await session.continueWithEmail(email, password)
    if (result === 'signed-in') done()
    else go('code')
  }, formShake.shake)

  const confirm = (digits: string) => attempt('code', async () => {
    try {
      await session.confirmCode(email, digits, password)
      done()
    } catch (e) {
      setCode('')
      throw e
    }
  }, codeShake.shake)

  const onCode = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6 && !busy) confirm(digits)
  }

  const resend = () => attempt('code', async () => {
    await session.resendCode(email)
    setNote('New code sent. Check your email.')
  })

  const forgot = () => {
    if (!validEmail) {
      setError('Enter your email first, then tap “Forgot your password?”')
      return
    }
    attempt('email', async () => {
      await session.resetPassword(email)
      Alert.alert('Check your email', `We sent a link to reset your password to ${email.trim()}.`)
    })
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <LayoutAnimationConfig skipEntering>
        {mode === 'choose' && (
          <Animated.View key="choose" entering={slide}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {name ? (
                <Cover spec={{ name, tint: OCCASION_TONES[draft.occasion]?.tint ?? 'lilac' }} size={52} />
              ) : (
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center' }}>
                  <Spark size={26} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={styles.title}>{name ? `Save ${name}’s song` : 'Sign in to Wishly'}</Text>
                <Body muted size={14} style={{ marginTop: 4, lineHeight: 20 }}>
                  {name ? 'So you can hear it when it’s ready, on any device.' : 'Hear your songs on any device. New here? The same buttons get you started.'}
                </Body>
              </View>
            </View>

            <View style={{ marginTop: 22, gap: 10 }}>
              {/* Apple's own button artwork can replace this in a native build. */}
              <ProviderButton label="Continue with Apple" busy={busy === 'apple'} onPress={() => withProvider('apple')} light icon={<AppleIcon />} />
              <ProviderButton
                label="Continue with Google"
                busy={busy === 'google'}
                onPress={() => withProvider('google')}
                icon={
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[type.bold, { fontSize: 14, color: colors.ink }]}>G</Text>
                  </View>
                }
              />
              <ProviderButton label="Continue with email" onPress={() => { setError(null); go('email') }} icon={<EmailIcon size={20} />} />
            </View>

            <Problem text={error} />

            <Text style={[type.regular, { marginTop: 18, marginHorizontal: 8, textAlign: 'center', fontSize: 12, lineHeight: 18, color: colors.muted }]}>
              We only use your email for your songs. By continuing you agree to the{' '}
              <Doc label="Terms" url={TERMS_URL} /> and <Doc label="Privacy Policy" url={PRIVACY_URL} />.
            </Text>
          </Animated.View>
        )}

        {mode === 'email' && (
          <Animated.View key="email" entering={slide}>
            <Header title="Continue with email" onBack={() => { setError(null); go('choose') }} />
            <Body muted size={15} style={{ marginTop: 6 }}>New or returning, it’s the same two boxes.</Body>

            {/* Shakes "no" when the email and password don't match. */}
            <Animated.View style={[{ marginTop: 18, gap: 14 }, formShake.style]}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                textContentType="username"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                autoFocus
              />
              <View style={{ gap: 8 }}>
                <Text style={[type.bold, { fontSize: 13, color: colors.muted }]}>Password</Text>
                <View>
                  <TextInput
                    accessibilityLabel="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={() => { if (validEmail && password.length >= 8) withEmail() }}
                    keyboardAppearance="dark"
                    selectionColor={colors.coral}
                    style={[type.regular, styles.input, { paddingRight: 72 }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    hitSlop={8}
                    onPress={() => { tap(); setShowPassword(!showPassword) }}
                    style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
                  >
                    <Text style={[type.bold, { fontSize: 14, color: colors.muted }]}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
                <Text style={[type.regular, { fontSize: 13, color: colors.muted }]}>At least 8 characters. Your iPhone can remember it for you.</Text>
              </View>
            </Animated.View>

            <Problem text={error} />

            <Button label="Continue" busy={busy === 'email'} disabled={!validEmail || password.length < 8} onPress={withEmail} style={{ marginTop: 20 }} />
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => { tap(); forgot() }} style={{ alignSelf: 'center', marginTop: 16 }}>
              <Text style={[type.bold, { fontSize: 14, color: colors.muted }]}>Forgot your password?</Text>
            </Pressable>
          </Animated.View>
        )}

        {mode === 'code' && (
          <Animated.View key="code" entering={slide}>
            <Text accessibilityRole="header" style={styles.title}>Check your email</Text>
            <Body muted size={15} style={{ marginTop: 6, lineHeight: 21 }}>
              We sent a 6-digit code to <Text style={[type.bold, { color: colors.text }]}>{email.trim()}</Text>. It’s only needed the first time.
            </Body>

            {/* A wrong code shakes the boxes, like the iPhone passcode screen. */}
            <Animated.View style={[{ marginTop: 22 }, codeShake.style]}>
              <View onLayout={(e) => setBoxesWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', gap: 8 }} aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 60,
                      borderRadius: radius.field,
                      backgroundColor: colors.fill,
                      borderWidth: 1,
                      borderColor: 'rgba(255,250,245,0.14)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {code[i] ? (
                      <Animated.Text key={`${i}${code[i]}`} entering={digitIn} style={[type.bold, { fontSize: 26, color: colors.text }]}>{code[i]}</Animated.Text>
                    ) : null}
                  </View>
                ))}
                {/* The coral ring glides to the next box. */}
                {box > 0 && (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: box,
                      height: 60,
                      borderRadius: radius.field,
                      borderWidth: 2,
                      borderColor: colors.coral,
                      opacity: code.length < 6 ? 1 : 0,
                      transform: [{ translateX: Math.min(code.length, 5) * (box + 8) }],
                      transitionProperty: ['transform', 'opacity'],
                      transitionDuration: 220,
                      transitionTimingFunction: cubicBezier(0.2, 0.9, 0.3, 1),
                    }}
                  />
                )}
              </View>
              {/* One real field under the boxes, so iOS can offer the code from Mail. */}
              <TextInput
                accessibilityLabel="6-digit code"
                value={code}
                onChangeText={onCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                caretHidden
                editable={busy !== 'code'}
                style={[StyleSheet.absoluteFill, { opacity: 0.02, color: 'transparent' }]}
              />
            </Animated.View>

            <View style={{ marginTop: 16, padding: 12, paddingHorizontal: 14, borderRadius: radius.field, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <EmailIcon size={20} color={colors.muted} />
              <Text style={[type.regular, { flex: 1, fontSize: 13, lineHeight: 18, color: colors.muted }]}>
                {showDemoTools ? 'Demo: any six digits work.' : 'Your iPhone offers the code from Mail above the keyboard.'} It confirms on its own once all six digits are in.
              </Text>
            </View>

            <Problem text={error} />
            {note && <Text accessibilityLiveRegion="polite" style={[type.regular, { marginTop: 14, fontSize: 14, color: colors.text }]}>{note}</Text>}

            <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable accessibilityRole="button" hitSlop={10} disabled={busy === 'code'} onPress={() => { tap(); resend() }}>
                <Text style={[type.bold, { fontSize: 14, color: colors.text, textDecorationLine: 'underline', textDecorationColor: colors.coral }]}>Resend code</Text>
              </Pressable>
              <Pressable accessibilityRole="button" hitSlop={10} onPress={() => { tap(); setCode(''); setError(null); setNote(null); go('email') }}>
                <Text style={[type.bold, { fontSize: 14, color: colors.muted }]}>Use a different email</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </LayoutAnimationConfig>
    </ScrollView>
  )
}

function ProviderButton({ label, onPress, icon, light, busy }: { label: string; onPress: () => void; icon: ReactNode; light?: boolean; busy?: boolean }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={() => { tap(); onPress() }}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: light ? (pressed ? '#E8E8E8' : '#FFFFFF') : pressed ? colors.fill : 'transparent',
        borderWidth: light ? 0 : 1,
        borderColor: 'rgba(255,250,245,0.28)',
        opacity: busy ? 0.6 : 1,
      })}
    >
      {icon}
      <Text style={[type.bold, { fontSize: 17, color: light ? '#000000' : colors.text }]}>{busy ? 'Opening…' : label}</Text>
    </Squish>
  )
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -10 }}>
      <IconButton label="Back" onPress={onBack}><BackIcon /></IconButton>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    </View>
  )
}

function Problem({ text }: { text: string | null }) {
  if (!text) return null
  return <Text accessibilityLiveRegion="polite" style={[type.regular, { marginTop: 14, fontSize: 15, lineHeight: 21, color: colors.coral }]}>{text}</Text>
}

function Doc({ label, url }: { label: string; url?: string }) {
  if (!url) return <Text style={{ color: colors.text }}>{label}</Text>
  return (
    <Text accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(url)} style={{ color: colors.text, textDecorationLine: 'underline' }}>
      {label}
    </Text>
  )
}

const styles = StyleSheet.create({
  title: { ...type.bold, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: colors.text },
  input: { minHeight: 50, fontSize: 17, color: colors.text, backgroundColor: colors.fill, borderWidth: 1, borderColor: 'rgba(255,250,245,0.14)', borderRadius: radius.field, paddingHorizontal: 16 },
})
