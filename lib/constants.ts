import type { RateeRole } from './types'

// =============================================================================
// HINCH.AR — Constantes globales
// =============================================================================

// Paleta de colores — light theme, espejo de la landing (landing/styles.css)
export const COLORS = {
  // Fondos
  background:   '#FFFFFF',
  surface:      '#F6F7F9',
  card:         '#FFFFFF',
  cardElevated: '#F6F7F9',
  border:       '#E7E9EE',
  borderLight:  '#D7DBE3',

  // Marca
  primary:      '#1D4ED8',   // azul de marca
  primaryLight: '#3B82F6',
  primaryDark:  '#1843B8',
  accent:       '#1D4ED8',   // acento único = azul de marca (como la landing)
  accentDark:   '#1843B8',

  // Textos
  textPrimary:   '#0B1220',
  textSecondary: '#5B6472',
  textMuted:     '#98A1AD',
  textInverse:   '#FFFFFF',

  // Neutros
  white:         '#FFFFFF',
  black:         '#000000',

  // Marca — tinte claro para fondos suaves (chips, íconos)
  brandTint:     '#EEF3FF',

  // Semánticos
  success:  '#16A34A',
  successBg:'#DCFCE7',
  error:    '#DC2626',
  errorBg:  '#FEE2E2',
  warning:  '#D97706',
  warningBg:'#FEF3C7',
  info:     '#0EA5E9',

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
