// Line icons from the design canvas, drawn once so every screen matches.
import Svg, { Circle, Path, Rect } from 'react-native-svg'

import { colors } from '@/theme'

type P = { size?: number; color?: string }

export const PlayIcon = ({ size = 20, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" fill={color} /></Svg>
)

export const PauseIcon = ({ size = 20, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={5} y={4} width={5} height={16} rx={1} fill={color} /><Rect x={14} y={4} width={5} height={16} rx={1} fill={color} /></Svg>
)

export const BackIcon = ({ size = 24, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
)

export const ChevronDownIcon = ({ size = 26, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
)

export const ChevronRightIcon = ({ size = 18, color = colors.muted }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
)

export const ShareIcon = ({ size = 24, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
)

export const LyricsIcon = ({ size = 24, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 6h16M4 12h10M4 18h13" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" /></Svg>
)

export const PlusIcon = ({ size = 20, color = colors.ink }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.6} strokeLinecap="round" fill="none" /></Svg>
)

export const HomeIcon = ({ size = 26, color = colors.text, filled }: P & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" fill={filled ? color : 'none'} stroke={color} strokeWidth={filled ? 0 : 2} strokeLinejoin="round" />
  </Svg>
)

export const SongsIcon = ({ size = 26, color = colors.text, filled }: P & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={3} y={7} width={14} height={14} rx={2.5} fill={filled ? color : 'none'} stroke={color} strokeWidth={filled ? 0 : 2} />
    <Path d="M7 3h11.5A2.5 2.5 0 0 1 21 5.5V17" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
    <Circle cx={10} cy={14} r={2.5} fill={filled ? colors.bg : color} />
  </Svg>
)

export const SpeakerIcon = ({ size = 22, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M11 5 6 9H3v6h3l5 4V5Z" fill={color} />
    <Path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
  </Svg>
)

export const MessageIcon = ({ size = 24, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 5h16v11H9l-5 4V5Z" stroke={color} strokeWidth={2} strokeLinejoin="round" fill="none" /></Svg>
)

export const EmailIcon = ({ size = 24, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={3} y={5} width={18} height={14} rx={2} stroke={color} strokeWidth={2} fill="none" />
    <Path d="M4 7l8 6 8-6" stroke={color} strokeWidth={2} strokeLinejoin="round" fill="none" />
  </Svg>
)

export const LinkIcon = ({ size = 24, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
  </Svg>
)

export const MoreIcon = ({ size = 22, color = colors.text }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={5} cy={12} r={2} fill={color} /><Circle cx={12} cy={12} r={2} fill={color} /><Circle cx={19} cy={12} r={2} fill={color} />
  </Svg>
)

export const CheckIcon = ({ size = 14, color = colors.bg }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
)

export const ArrowIcon = ({ size = 22, color = colors.ink }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
)

export const AppleIcon = ({ size = 20, color = '#000000' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66ZM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28Z" fill={color} />
  </Svg>
)

export const BellIcon = ({ size = 30, color = colors.ink }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
)
