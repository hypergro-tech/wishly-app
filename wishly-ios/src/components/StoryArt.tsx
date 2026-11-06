// Faint, hand-drawn patterns behind the empty "Their story" cards, one theme
// per detail: sparks for habits, speech bubbles for sayings, bubbles for
// nicknames, film and confetti for moments, hearts and stars for messages,
// squiggles and a peeking face for "leave out".
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

export type ArtKind = 'sparks' | 'speech' | 'bubbles' | 'film' | 'hearts' | 'peek'

const BOLT = 'M10 0 L0 14 H7 L4 24 L16 8 H9 Z'
const SPARKLE = 'M6 0 Q7 5 12 6 Q7 7 6 12 Q5 7 0 6 Q5 5 6 0 Z'
const HEART = 'M12 21 C12 21 3 14 3 8.5 C3 5.5 5.5 3 8.5 3 C10.2 3 11.4 3.9 12 5 C12.6 3.9 13.8 3 15.5 3 C18.5 3 21 5.5 21 8.5 C21 14 12 21 12 21 Z'
const STAR = 'M12 2 L14.6 8.6 L21.5 9.1 L16.2 13.6 L17.9 20.4 L12 16.7 L6.1 20.4 L7.8 13.6 L2.5 9.1 L9.4 8.6 Z'

const at = (x: number, y: number, scale = 1, rotate = 0) => `translate(${x} ${y}) rotate(${rotate}) scale(${scale})`

function Motifs({ kind, ink }: { kind: ArtKind; ink: string }) {
  const line = { stroke: ink, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  switch (kind) {
    case 'sparks':
      return (
        <>
          <Path d={BOLT} transform={at(54, 4, 1.2, 12)} {...line} />
          <Path d={BOLT} transform={at(16, 48, 0.9, -10)} {...line} />
          <Path d={SPARKLE} transform={at(66, 54, 1.1)} fill={ink} />
          <Path d={SPARKLE} transform={at(34, 22, 0.7)} fill={ink} />
          <Path d={SPARKLE} transform={at(74, 80, 0.6)} fill={ink} />
        </>
      )
    case 'speech':
      return (
        <>
          <G transform={at(38, 8, 1, 6)}>
            <Rect x={0} y={0} width={40} height={26} rx={9} {...line} />
            <Path d="M10 26 L6 35 L19 26" {...line} />
          </G>
          <G transform={at(12, 50, 0.75, -8)}>
            <Rect x={0} y={0} width={40} height={26} rx={9} {...line} />
            <Path d="M28 26 L33 35 L20 26" {...line} />
          </G>
          <Circle cx={62} cy={70} r={2} fill={ink} />
          <Circle cx={70} cy={70} r={2} fill={ink} />
          <Circle cx={78} cy={70} r={2} fill={ink} />
        </>
      )
    case 'bubbles':
      return (
        <>
          <Circle cx={64} cy={24} r={16} {...line} />
          <Circle cx={30} cy={42} r={6} {...line} />
          <Circle cx={74} cy={64} r={9} fill={ink} opacity={0.5} />
          <Circle cx={40} cy={74} r={13} {...line} />
          <Circle cx={84} cy={86} r={4} fill={ink} />
          <Circle cx={14} cy={82} r={3} fill={ink} opacity={0.6} />
        </>
      )
    case 'film':
      return (
        <>
          <G transform={at(52, 2, 1, 8)}>
            <Rect x={0} y={0} width={26} height={70} rx={4} {...line} />
            {[9, 25, 41, 57].map((y) => (
              <G key={y}>
                <Rect x={3} y={y - 3} width={4} height={6} rx={1.5} fill={ink} />
                <Rect x={19} y={y - 3} width={4} height={6} rx={1.5} fill={ink} />
              </G>
            ))}
          </G>
          <Rect x={14} y={58} width={7} height={4} rx={1} fill={ink} transform="rotate(25 17 60)" />
          <Rect x={30} y={78} width={7} height={4} rx={1} fill={ink} transform="rotate(-30 33 80)" />
          <Circle cx={26} cy={40} r={2.5} fill={ink} />
          <Rect x={74} y={82} width={6} height={4} rx={1} fill={ink} transform="rotate(50 77 84)" />
        </>
      )
    case 'hearts':
      return (
        <>
          <Path d={HEART} transform={at(46, 2, 1.2, 12)} {...line} />
          <Path d={HEART} transform={at(8, 50, 0.9, -14)} fill={ink} opacity={0.5} />
          <Path d={STAR} transform={at(52, 52, 1)} {...line} />
          <Path d={STAR} transform={at(76, 30, 0.5)} fill={ink} />
          <Path d={SPARKLE} transform={at(28, 28, 0.7)} fill={ink} />
        </>
      )
    case 'peek':
      return (
        <>
          <Path d="M8 16 q7 -8 14 0 t14 0 t14 0 t14 0 t14 0" {...line} />
          <Path d="M20 36 q7 -7 14 0 t14 0 t14 0 t14 0" {...line} />
          {/* A face peeking up from the bottom edge. */}
          <Path d="M34 92 a24 24 0 0 1 48 0" {...line} />
          <Circle cx={50} cy={78} r={3.5} {...line} />
          <Circle cx={66} cy={78} r={3.5} {...line} />
          <Circle cx={51} cy={79} r={1.4} fill={ink} />
          <Circle cx={67} cy={79} r={1.4} fill={ink} />
        </>
      )
  }
}

// A small stamp pinned in the card's bottom-right corner, below the text.
export const STAMP = 48

export function StoryArt({ kind, ink }: { kind: ArtKind; ink: string }) {
  return (
    <Svg viewBox="0 0 92 92" width={STAMP} height={STAMP} style={{ position: 'absolute', right: 8, bottom: 8 }} pointerEvents="none">
      <G opacity={0.3}>
        <Motifs kind={kind} ink={ink} />
      </G>
    </Svg>
  )
}
