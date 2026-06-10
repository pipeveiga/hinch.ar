import type { RateeRole } from './types'

// =============================================================================
// HINCH.AR — Constantes globales
// =============================================================================

// Paleta de colores — light theme estilo Apple, espejo de la landing
// (landing/styles.css): azul de marca + tintas frías, vidrio y sombras suaves.
export const COLORS = {
  // Fondos
  background:   '#FFFFFF',
  surface:      '#F5F7FB',
  card:         '#FFFFFF',
  cardElevated: '#F5F7FB',
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
  textSecondary: '#51596B',
  textMuted:     '#8A93A3',
  textInverse:   '#FFFFFF',

  // Neutros
  white:         '#FFFFFF',
  black:         '#000000',

  // Marca — tinte claro para fondos suaves (chips, íconos)
  brandTint:     '#EEF3FF',

  // Vidrio (liquid glass) — superficies translúcidas con blur detrás
  glass:        'rgba(255,255,255,0.72)',
  glassStrong:  'rgba(255,255,255,0.85)',
  glassBorder:  'rgba(255,255,255,0.65)',
  glassEdge:    'rgba(11,18,32,0.08)',

  // Semánticos
  success:  '#34C759',
  successBg:'#E4F8EA',
  error:    '#FF3B30',
  errorBg:  '#FFE5E3',
  warning:  '#FF9500',
  warningBg:'#FFF2DF',
  info:     '#32ADE6',

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

// Border radius — curvas generosas estilo iOS
export const RADIUS = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  full: 9999,
} as const

// Sombras — suaves y difusas, estilo Apple. Usar con spread (...SHADOWS.card)
export const SHADOWS = {
  card: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  button: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
} as const

// Alto reservado al final de las listas para que el contenido no quede
// tapado por la tab bar flotante de vidrio
export const TAB_BAR_SPACE = 104

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
