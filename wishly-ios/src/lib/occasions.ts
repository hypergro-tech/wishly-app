// A picture and a colour for each occasion, for the Home tiles and the
// occasion choice on Create. Occasions without a picture show just their name.
import { OCCASION_TONES } from '@/lib/catalog'
import { colors, tint } from '@/theme'

const PICTURES: Record<string, number> = {
  Birthday: require('../../assets/occasions/birthday.png'),
  Anniversary: require('../../assets/occasions/anniversary.png'),
  Milestone: require('../../assets/occasions/milestone.png'),
  Christmas: require('../../assets/occasions/christmas.png'),
  Wedding: require('../../assets/occasions/wedding.png'),
  "Valentine's Day": require('../../assets/occasions/valentines-day.png'),
}

// Christmas gets a wintry pale blue, so the mint tree stands out and no two tiles match.
const COLOURS: Record<string, string> = { Milestone: colors.coral, Christmas: '#D6ECFF', Wedding: colors.mint, "Valentine's Day": '#FFD6E0' }

export const occasionPicture = (occasion: string): number | undefined => PICTURES[occasion]
export const occasionColour = (occasion: string) => COLOURS[occasion] ?? tint(OCCASION_TONES[occasion]?.tint ?? 'butter')
