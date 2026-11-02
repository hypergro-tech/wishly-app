// Lets the buyer keep the song as an MP3. On a phone it opens the share sheet
// (Save to Files, WhatsApp, AirDrop…); in a browser it downloads the file.

import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'

const fileName = (title: string) => `${title.replace(/[^\p{L}\p{N} ,'’-]+/gu, '').trim() || 'Wishly song'}.mp3`

export async function saveSong(audioUrl: string, title: string) {
  const name = fileName(title)
  if (Platform.OS === 'web') {
    // A link to another site ignores `download`, so fetch the file first.
    const blob = await (await fetch(audioUrl)).blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
    return
  }
  const file = new File(Paths.cache, name)
  if (file.exists) file.delete()
  const saved = await File.downloadFileAsync(audioUrl, file)
  await Sharing.shareAsync(saved.uri, { mimeType: 'audio/mpeg', UTI: 'public.mp3', dialogTitle: title })
}
