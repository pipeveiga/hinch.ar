import Svg, { Path, Circle, Ellipse, Rect, Line } from 'react-native-svg'
import { COLORS } from '@/lib/constants'

// =============================================================================
// Set de íconos propio de hinch.ar — line icons hechos a mano (stroke 1.7,
// viewBox 24). Reemplazan a los emojis para tener identidad visual coherente.
// Uso: <Icon name="stadium" size={22} color={COLORS.accent} />
// =============================================================================

export type IconName =
  | 'stadium' | 'car' | 'chat' | 'user' | 'bell' | 'search'
  | 'pin' | 'ball' | 'music' | 'star' | 'ticket' | 'shield'
  | 'people' | 'coins' | 'calendar' | 'grid' | 'luggage' | 'paw'
  | 'check' | 'plus' | 'logout' | 'edit' | 'id' | 'help'

interface IconProps {
  name:         IconName
  size?:        number
  color?:       string
  strokeWidth?: number
}

// Cada ícono es una función que recibe el color de trazo y devuelve sus
// primitivas. Trazo redondeado, sin relleno: estilo consistente con la landing.
const PATHS: Record<IconName, (c: string, sw: number) => React.ReactNode> = {
  stadium: (c, sw) => (
    <>
      <Ellipse cx={12} cy={8.5} rx={9} ry={4.5} stroke={c} strokeWidth={sw} />
      <Ellipse cx={12} cy={8.5} rx={3.6} ry={1.8} stroke={c} strokeWidth={sw} />
      <Path d="M3 8.5v3.5c0 2.6 4 4.7 9 4.7s9-2.1 9-4.7V8.5" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  car: (c, sw) => (
    <>
      <Path d="M4 13.2l1.6-4A2.2 2.2 0 0 1 7.6 7.8h8.8a2.2 2.2 0 0 1 2 1.4l1.6 4" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={2.8} y={13.2} width={18.4} height={4.4} rx={1.4} stroke={c} strokeWidth={sw} />
      <Circle cx={7.2} cy={17.8} r={1.5} stroke={c} strokeWidth={sw} />
      <Circle cx={16.8} cy={17.8} r={1.5} stroke={c} strokeWidth={sw} />
    </>
  ),
  chat: (c, sw) => (
    <Path d="M4 12a7.5 7.5 0 0 1 7.5-7.5h.4A7.6 7.6 0 0 1 20 12.4c0 4-3.4 7.1-7.6 7.1a8.6 8.6 0 0 1-2.6-.4l-3.9 1 1-3.3A7.3 7.3 0 0 1 4 12z"
      stroke={c} strokeWidth={sw} strokeLinejoin="round" />
  ),
  user: (c, sw) => (
    <>
      <Circle cx={12} cy={8.4} r={3.6} stroke={c} strokeWidth={sw} />
      <Path d="M5 19.5c0-3.4 3-5.6 7-5.6s7 2.2 7 5.6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  bell: (c, sw) => (
    <>
      <Path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.2 5.8 2 6.5H4c.8-.7 2-2 2-6.5z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
      <Path d="M10 19.5a2.2 2.2 0 0 0 4 0" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  search: (c, sw) => (
    <>
      <Circle cx={11} cy={11} r={6.4} stroke={c} strokeWidth={sw} />
      <Line x1={15.8} y1={15.8} x2={20} y2={20} stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  pin: (c, sw) => (
    <>
      <Path d="M12 21c4-4 7-7.2 7-10.5A7 7 0 0 0 5 10.5C5 13.8 8 17 12 21z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
      <Circle cx={12} cy={10.3} r={2.4} stroke={c} strokeWidth={sw} />
    </>
  ),
  ball: (c, sw) => (
    <>
      <Circle cx={12} cy={12} r={8.4} stroke={c} strokeWidth={sw} />
      <Path d="M12 8.6l3.1 2.2-1.2 3.7h-3.8L8.9 10.8z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
      <Path d="M12 8.6V5.1M15.1 10.8l3.1-1.4M13.9 14.5l2 2.9M10.1 14.5l-2 2.9M8.9 10.8 5.8 9.4" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  music: (c, sw) => (
    <>
      <Path d="M9 17V6.2l9-2v9" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={6.6} cy={17} r={2.4} stroke={c} strokeWidth={sw} />
      <Circle cx={15.6} cy={15} r={2.4} stroke={c} strokeWidth={sw} />
    </>
  ),
  star: (c, sw) => (
    <Path d="M12 4l2.3 4.9 5.3.7-3.9 3.7 1 5.3L12 16.2 7.3 18.6l1-5.3-3.9-3.7 5.3-.7L12 4z"
      stroke={c} strokeWidth={sw} strokeLinejoin="round" />
  ),
  ticket: (c, sw) => (
    <>
      <Path d="M4 8.2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a2 2 0 0 0 0-4V8.2z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
      <Line x1={14} y1={7.5} x2={14} y2={16.5} stroke={c} strokeWidth={sw} strokeDasharray="1.6 2.2" strokeLinecap="round" />
    </>
  ),
  shield: (c, sw) => (
    <>
      <Path d="M12 3l7 2.5v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9v-5L12 3z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4.3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  people: (c, sw) => (
    <>
      <Circle cx={9} cy={8.4} r={2.8} stroke={c} strokeWidth={sw} />
      <Circle cx={16.6} cy={9.6} r={2.1} stroke={c} strokeWidth={sw} />
      <Path d="M4 18c0-2.9 2.2-4.8 5-4.8 1.8 0 3.3.8 4.2 2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M15 18c.1-2.1 1.4-3.4 3.3-3.4 1.2 0 2.2.5 2.9 1.5" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  coins: (c, sw) => (
    <>
      <Circle cx={12} cy={12} r={8.4} stroke={c} strokeWidth={sw} />
      <Path d="M12 6.8v10.4M14.6 9c-.6-.8-1.6-1.2-2.6-1.2-1.5 0-2.7.9-2.7 2.1s1.1 1.8 2.7 2.1 2.7 1 2.7 2.2-1.2 2.1-2.7 2.1c-1 0-2-.4-2.6-1.2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  calendar: (c, sw) => (
    <>
      <Rect x={4} y={5.5} width={16} height={15} rx={2.4} stroke={c} strokeWidth={sw} />
      <Path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  grid: (c, sw) => (
    <>
      <Rect x={4} y={4} width={6.5} height={6.5} rx={1.8} stroke={c} strokeWidth={sw} />
      <Rect x={13.5} y={4} width={6.5} height={6.5} rx={1.8} stroke={c} strokeWidth={sw} />
      <Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.8} stroke={c} strokeWidth={sw} />
      <Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.8} stroke={c} strokeWidth={sw} />
    </>
  ),
  luggage: (c, sw) => (
    <>
      <Rect x={6} y={8} width={12} height={11} rx={2} stroke={c} strokeWidth={sw} />
      <Path d="M9.5 8V6.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V8M10 19v1.5M14 19v1.5" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  paw: (c, sw) => (
    <>
      <Ellipse cx={12} cy={15} rx={3.6} ry={3} stroke={c} strokeWidth={sw} />
      <Circle cx={7.5} cy={11} r={1.4} stroke={c} strokeWidth={sw} />
      <Circle cx={16.5} cy={11} r={1.4} stroke={c} strokeWidth={sw} />
      <Circle cx={9.8} cy={7.8} r={1.4} stroke={c} strokeWidth={sw} />
      <Circle cx={14.2} cy={7.8} r={1.4} stroke={c} strokeWidth={sw} />
    </>
  ),
  check: (c, sw) => (
    <Path d="M5 12.5l4.5 4.5L19 7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  ),
  plus: (c, sw) => (
    <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  ),
  logout: (c, sw) => (
    <>
      <Path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 8l4 4-4 4M21 12H9.5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  edit: (c, sw) => (
    <Path d="M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  ),
  id: (c, sw) => (
    <>
      <Rect x={3.5} y={6} width={17} height={12} rx={2.2} stroke={c} strokeWidth={sw} />
      <Circle cx={9} cy={11.5} r={1.8} stroke={c} strokeWidth={sw} />
      <Path d="M6.4 15.4c.3-1.3 1.4-2 2.6-2s2.3.7 2.6 2M14 10h4M14 13.5h3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  help: (c, sw) => (
    <>
      <Circle cx={12} cy={12} r={8.4} stroke={c} strokeWidth={sw} />
      <Path d="M9.5 9.5a2.6 2.6 0 0 1 5 .8c0 1.7-2.5 2-2.5 3.7" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Circle cx={12} cy={16.6} r={0.6} stroke={c} strokeWidth={sw} fill={c} />
    </>
  ),
}

export function Icon({ name, size = 24, color = COLORS.textPrimary, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name](color, strokeWidth)}
    </Svg>
  )
}

// Mapa de tipo de evento → ícono (para EventCard, filtros, etc.)
export const EVENT_TYPE_ICON_NAME: Record<string, IconName> = {
  partido: 'ball',
  recital: 'music',
  otro:    'pin',
}
