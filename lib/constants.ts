import type { RateeRole } from './types'

// =============================================================================
// HINCH.AR — Constantes globales
// =============================================================================

// Paleta de colores — dark theme, tribuna argentina
export const COLORS = {
  // Fondos
  background:   '#080808',
  surface:      '#111111',
  card:         '#1A1A1A',
  cardElevated: '#222222',
  border:       '#2C2C2C',
  borderLight:  '#383838',

  // Marca
  primary:      '#1D4ED8',   // azul fuerte
  primaryLight: '#3B82F6',
  primaryDark:  '#1E3A8A',
  accent:       '#EAB308',   // amarillo cancha
  accentDark:   '#A16207',

  // Textos
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted:     '#475569',
  textInverse:   '#080808',

  // Semánticos
  success:  '#22C55E',
  successBg:'#14532D',
  error:    '#EF4444',
  errorBg:  '#450A0A',
  warning:  '#F59E0B',
  warningBg:'#451A03',
  info:     '#38BDF8',

  // Equipos (para theming contextual)
  bocaBlue:     '#003DA5',
  bocaYellow:   '#FFD100',
  riverRed:     '#CC0000',
  riverWhite:   '#FFFFFF',
  racingBlue:   '#00B4E5',
  indieRed:     '#E30613',
  centralBlue:  '#003087',
  newellsRed:   '#C8102E',
} as const

// Tipografía
export const FONTS = {
  regular: 'System',
  medium:  'System',
  bold:    'System',
  mono:    'System',
} as const

// Espaciado base (múltiplos de 4)
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const

// Border radius
export const RADIUS = {
  sm:   6,
  md:   12,
  lg:   18,
  xl:   24,
  full: 9999,
} as const

// =============================================================================
// Sistema de calificación 5x5
// =============================================================================
export const RATING_CATEGORIES: Record<RateeRole, string[]> = {
  driver: [
    'Puntualidad',   // Llegó a tiempo al punto de encuentro
    'Seguridad',     // Manejo con cuidado
    'Estado del auto',// Auto limpio y en buenas condiciones
    'Comunicación',  // Avisó cambios, estuvo disponible
    'Clima',         // Hizo el viaje agradable
  ],
  passenger: [
    'Pago',          // Pagó correctamente y sin drama
    'Puntualidad',   // Estuvo a tiempo en el punto de encuentro
    'Comportamiento',// Se portó bien en el auto
    'Comunicación',  // Avisó cambios, estuvo disponible
    'Identidad',     // Era quien decía ser
  ],
}

export const RATING_CATEGORY_ICONS: Record<RateeRole, string[]> = {
  driver:    ['⏰', '🛡️', '🚗', '💬', '😎'],
  passenger: ['💸', '⏰', '🙌', '💬', '🪪'],
}

// Descripción corta de cada score
export const RATING_SCORE_LABELS = [
  'Pésimo',
  'Malo',
  'Regular',
  'Bueno',
  '¡Crac!',
] as const

// =============================================================================
// Tipos de viaje — labels y colores
// =============================================================================
export const TRIP_TYPE_LABELS = {
  ida:           'Solo Ida',
  vuelta:        'Solo Vuelta',
  ida_y_vuelta:  'Combo Ida y Vuelta',
} as const

export const TRIP_TYPE_COLORS = {
  ida:          COLORS.primaryLight,
  vuelta:       COLORS.success,
  ida_y_vuelta: COLORS.accent,
} as const

export const TRIP_TYPE_ICONS = {
  ida:          '→',
  vuelta:       '←',
  ida_y_vuelta: '⇄',
} as const

// =============================================================================
// Tipos de evento
// =============================================================================
export const EVENT_TYPE_LABELS = {
  partido: 'Partido',
  recital: 'Recital',
  otro:    'Evento',
} as const

export const EVENT_TYPE_ICONS = {
  partido: '⚽',
  recital: '🎸',
  otro:    '📍',
} as const

// =============================================================================
// Estados de reserva
// =============================================================================
export const BOOKING_STATUS_LABELS = {
  pending:   'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
} as const

export const BOOKING_STATUS_COLORS = {
  pending:   COLORS.warning,
  confirmed: COLORS.success,
  cancelled: COLORS.error,
  completed: COLORS.textSecondary,
} as const

// =============================================================================
// Ciudades principales de Argentina (para filtros)
// =============================================================================
export const MAJOR_CITIES = [
  'Buenos Aires',
  'Rosario',
  'Córdoba',
  'La Plata',
  'Mar del Plata',
  'Mendoza',
  'Tucumán',
  'Salta',
  'Santa Fe',
  'Quilmes',
  'Lanús',
  'Avellaneda',
  'San Miguel',
  'Morón',
  'Lomas de Zamora',
] as const

// =============================================================================
// Límites del negocio
// =============================================================================
export const BUSINESS_RULES = {
  MAX_SEATS:          7,
  MIN_RATING_TRIPS:   3,  // mínimo de viajes para mostrar rating
  RATING_WINDOW_DAYS: 3,  // días post-evento para calificar
  MAX_BOOKING_SEATS:  4,  // máximo de asientos por reserva
} as const
