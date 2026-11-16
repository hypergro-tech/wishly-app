// Checks a purchase Apple signed (StoreKit 2's signed transaction, a JWS) on
// the backend, so a song is only made for a real purchase. No Apple keys are
// needed: the JWS carries its certificate chain, which must lead to Apple's
// root certificate (below, from apple.com/certificateauthority), and the
// signature must match the first certificate in it.
import * as x509 from 'npm:@peculiar/x509@1.12.3'
import { compactVerify, decodeProtectedHeader } from 'npm:jose@5.9.6'

const APPLE_ROOT_G3 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA=='

export const BUNDLE_ID = 'com.hypergro.wishly'
// What each App Store product gives (src/lib/catalog.ts has the same ids).
export const PRODUCTS: Record<string, 'song' | 'monthly' | 'yearly'> = {
  'com.hypergro.wishly.song': 'song',
  'com.hypergro.wishly.monthly': 'monthly',
  'com.hypergro.wishly.yearly': 'yearly',
}

// Apple's marker extensions on its App Store signing certificates.
const LEAF_OID = '1.2.840.113635.100.6.11.1'
const INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1'

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const same = (a: ArrayBuffer, b: Uint8Array) => {
  const x = new Uint8Array(a)
  return x.length === b.length && x.every((v, i) => v === b[i])
}

export type Transaction = {
  transactionId: string
  originalTransactionId: string
  bundleId: string
  productId: string
  purchaseDate: number
  expiresDate?: number
  revocationDate?: number
  environment: 'Sandbox' | 'Production' | 'Xcode'
  appAccountToken?: string
  type: string
}

// The verified transaction, or an error saying why it isn't trusted. `root`
// is only swapped in tests.
export async function verifyTransaction(jws: string, root = fromB64(APPLE_ROOT_G3)): Promise<Transaction> {
  const { x5c, alg } = decodeProtectedHeader(jws)
  if (alg !== 'ES256' || !Array.isArray(x5c) || x5c.length !== 3) throw new Error('Not an App Store signature')
  const [leaf, middle, top] = x5c.map((c) => new x509.X509Certificate(fromB64(c)))
  if (!same(top.rawData, root)) throw new Error('Not signed by Apple')
  if (!middle.getExtension(INTERMEDIATE_OID) || !leaf.getExtension(LEAF_OID)) throw new Error('Not an App Store certificate')
  const now = new Date()
  if (!(await middle.verify({ publicKey: top, date: now })) || !(await leaf.verify({ publicKey: middle, date: now }))) {
    throw new Error('The certificate chain doesn’t check out')
  }
  const key = await leaf.publicKey.export({ name: 'ECDSA', namedCurve: 'P-256' }, ['verify'])
  const { payload } = await compactVerify(jws, key)
  const t = JSON.parse(new TextDecoder().decode(payload)) as Transaction
  if (t.bundleId !== BUNDLE_ID) throw new Error('Bought in another app')
  if (!PRODUCTS[t.productId]) throw new Error('Not a Wishly product')
  return { ...t, transactionId: String(t.transactionId), originalTransactionId: String(t.originalTransactionId) }
}
