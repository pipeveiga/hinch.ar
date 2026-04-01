// =============================================================================
// HINCH.AR — TypeScript Types
// Espejo del schema de Supabase. Actualizar cuando cambie la DB.
// =============================================================================

export type TripType = 'ida' | 'vuelta' | 'ida_y_vuelta'
export type EventType = 'partido' | 'recital' | 'otro'
export type TripStatus = 'active' | 'full' | 'cancelled' | 'completed'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentMethod = 'transferencia' | 'efectivo' | 'pendiente'
export type PaymentStatus = 'pendiente' | 'pagado' | 'cancelado'
export type RateeRole = 'driver' | 'passenger'

// =============================================================================
// User
// =============================================================================
export interface User {
  id: string
  created_at: string
  updated_at: string
  full_name: string
  phone?: string
  avatar_url?: string
  bio?: string
  dni?: string
  is_verified: boolean
  verified_at?: string
  avg_rating_as_driver: number
  total_trips_as_driver: number
  avg_rating_as_passenger: number
  total_trips_as_passenger: number
  has_car: boolean
  car_brand?: string
  car_model?: string
  car_year?: number
  car_color?: string
  car_plate?: string
  car_photo_url?: string
  is_active: boolean
}

// Versión resumida para mostrar en cards/listas
export interface UserSummary {
  id: string
  full_name: string
  avatar_url?: string
  is_verified: boolean
  avg_rating_as_driver: number
  avg_rating_as_passenger: number
  total_trips_as_driver: number
}

// =============================================================================
// Event
// =============================================================================
export interface Event {
  id: string
  created_at: string
  type: EventType
  title: string
  subtitle?: string
  venue_name: string
  venue_address: string
  venue_city: string
  venue_province: string
  venue_lat?: number
  venue_lng?: number
  event_date: string
  image_url?: string
  banner_url?: string
  home_team?: string
  away_team?: string
  competition?: string
  artist?: string
  genre?: string
  tags: string[]
  is_active: boolean
  is_featured: boolean
  // calculado en query (count de trips activos)
  trips_count?: number
}

// =============================================================================
// Trip
// =============================================================================
export interface Waypoint {
  address: string
  city: string
  lat?: number
  lng?: number
}

export interface Trip {
  id: string
  created_at: string
  updated_at: string
  driver_id: string
  event_id: string
  origin_address: string
  origin_city: string
  origin_province: string
  origin_lat?: number
  origin_lng?: number
  trip_type: TripType
  seats_total: number
  seats_available: number
  price_outbound?: number
  price_return?: number
  departure_time?: string
  return_time?: string
  notes?: string
  accepts_luggage: boolean
  accepts_pets: boolean
  waypoints: Waypoint[]
  status: TripStatus
  // joined
  driver?: UserSummary
  event?: Event
}

// Formulario para crear un viaje nuevo
export interface NewTripForm {
  event_id: string
  origin_address: string
  origin_city: string
  origin_province: string
  trip_type: TripType
  seats_total: number
  price_outbound?: number
  price_return?: number
  departure_time?: Date
  return_time?: Date
  notes?: string
  accepts_luggage: boolean
  accepts_pets: boolean
  waypoints: Waypoint[]
}

// =============================================================================
// Booking
// =============================================================================
export interface Booking {
  id: string
  created_at: string
  updated_at: string
  trip_id: string
  passenger_id: string
  segment: TripType
  seats_booked: number
  total_amount: number
  payment_method?: PaymentMethod
  payment_status: PaymentStatus
  status: BookingStatus
  passenger_message?: string
  pickup_point?: string
  driver_rated_passenger: boolean
  passenger_rated_driver: boolean
  // joined
  trip?: Trip
  passenger?: UserSummary
}

// Formulario para crear una reserva
export interface NewBookingForm {
  segment: TripType
  seats_booked: number
  payment_method: PaymentMethod
  passenger_message?: string
  pickup_point?: string
}

// =============================================================================
// Rating
// =============================================================================
export interface Rating {
  id: string
  created_at: string
  booking_id: string
  rater_id: string
  ratee_id: string
  ratee_role: RateeRole
  score_1: number
  score_2: number
  score_3: number
  score_4: number
  score_5: number
  overall_score: number
  comment?: string
}

// Scores del formulario de calificación
export interface RatingScores {
  score_1: number
  score_2: number
  score_3: number
  score_4: number
  score_5: number
  comment?: string
}

// =============================================================================
// Notification
// =============================================================================
export type NotificationType =
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'trip_cancelled'
  | 'rate_reminder'
  | 'payment_reminder'

export interface AppNotification {
  id: string
  created_at: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown>
  is_read: boolean
  read_at?: string
}

// =============================================================================
// Helpers de navegación / UI
// =============================================================================

// Filtros para buscar viajes en un evento
export interface TripSearchFilters {
  origin_city?: string
  trip_type?: TripType | 'todos'
  max_price?: number
  only_verified?: boolean
  only_with_seats?: boolean
}

// Estado de la pantalla de calificación
export interface RatingContext {
  booking: Booking
  rateeRole: RateeRole
  rateeName: string
  rateeAvatar?: string
  eventTitle: string
}
