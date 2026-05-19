import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// En web usamos localStorage con guard SSR (window no existe durante el render estático)
const webStorage = {
  getItem:    (key: string) => typeof window !== 'undefined' ? localStorage.getItem(key) : null,
  setItem:    (key: string, value: string) => { if (typeof window !== 'undefined') localStorage.setItem(key, value) },
  removeItem: (key: string) => { if (typeof window !== 'undefined') localStorage.removeItem(key) },
}

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage
import type {
  User, Event, Trip, Booking, Rating, Message,
  AppNotification, TripSearchFilters, NewTripForm, NewBookingForm, RatingScores,
} from './types'

// Durante el build estático (Vercel) las vars pueden no estar — el runtime las tendrá
const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? 'https://placeholder.supabase.co'
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

// Manda una notificación push via Edge Function (fire and forget)
async function sendPushNotification(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    await supabase.functions.invoke('send-notification', {
      body: { user_id: userId, title, body, data: data ?? {} },
    })
  } catch {
    // No bloquear el flujo principal si falla la notificación
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// =============================================================================
// AUTH
// =============================================================================

export const auth = {
  async signUpWithEmail(email: string, password: string, fullName: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
  },

  async signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  },

  async signOut() {
    return supabase.auth.signOut()
  },

  async getSession() {
    return supabase.auth.getSession()
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback)
  },
}

// =============================================================================
// USERS
// =============================================================================

export const usersApi = {
  async getMe(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return data
  },

  async getById(id: string): Promise<Partial<User> | null> {
    // Solo campos públicos — nunca exponer dni, car_plate, verification_status, etc.
    const { data } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, bio, is_verified, avg_rating_as_driver, avg_rating_as_passenger, total_trips_as_driver, total_trips_as_passenger, created_at')
      .eq('id', id)
      .single()
    return data
  },

  async updateProfile(id: string, updates: Partial<User>) {
    // Whitelist de campos editables — nunca permitir is_verified, verification_status, etc.
    const { full_name, bio, phone, avatar_url, has_car,
            car_brand, car_model, car_year, car_color,
            car_plate, car_photo_url } = updates
    return supabase
      .from('users')
      .update({ full_name, bio, phone, avatar_url, has_car,
                car_brand, car_model, car_year, car_color,
                car_plate, car_photo_url })
      .eq('id', id)
  },

  async uploadAvatar(userId: string, uri: string): Promise<string> {
    const path = `${userId}/avatar_${Date.now()}.jpg`

    const response    = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { upsert: true, contentType: 'image/jpeg' })

    if (error) throw error

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  },
}

// =============================================================================
// VERIFICATION
// =============================================================================

export const verificationApi = {
  async uploadPhoto(userId: string, type: 'dni_front' | 'dni_back' | 'selfie', uri: string): Promise<string> {
    const ext  = uri.split('.').pop() ?? 'jpg'
    const path = `${userId}/${type}.${ext}`

    const response = await fetch(uri)
    const blob     = await response.blob()

    const { error } = await supabase.storage
      .from('verifications')
      .upload(path, blob, { upsert: true, contentType: `image/${ext}` })

    if (error) throw error
    return path
  },

  async submit(userId: string) {
    const { error } = await supabase
      .from('users')
      .update({
        verification_status:       'pending',
        verification_submitted_at: new Date().toISOString(),
      })
      .eq('id', userId)
    if (error) throw error
  },
}

// =============================================================================
// EVENTS
// =============================================================================

export const eventsApi = {
  async list(filters?: { type?: string; city?: string; fromDate?: Date }) {
    let query = supabase
      .from('events')
      .select(`
        *,
        trips_count:trips(count)
      `)
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })

    if (filters?.type && filters.type !== 'todos') {
      query = query.eq('type', filters.type)
    }
    if (filters?.city) {
      query = query.ilike('venue_city', `%${filters.city}%`)
    }
    if (filters?.fromDate) {
      query = query.gte('event_date', filters.fromDate.toISOString())
    }

    const { data, error } = await query
    if (error) throw error
    return data as Event[]
  },

  async getById(id: string): Promise<Event | null> {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    return data
  },

  async getFeatured(): Promise<Event[]> {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(5)
    return data ?? []
  },
}

// =============================================================================
// TRIPS
// =============================================================================

export const tripsApi = {
  async listByEvent(eventId: string, filters?: TripSearchFilters) {
    let query = supabase
      .from('trips')
      .select(`
        *,
        driver:users!driver_id (
          id, full_name, avatar_url, is_verified,
          avg_rating_as_driver, total_trips_as_driver
        ),
        event:events!event_id (
          id, title, event_date, venue_name, venue_city
        )
      `)
      .eq('event_id', eventId)
      .in('status', ['active', 'full'])
      .order('created_at', { ascending: false })

    if (filters?.origin_city) {
      query = query.ilike('origin_city', `%${filters.origin_city}%`)
    }
    if (filters?.trip_type && filters.trip_type !== 'todos') {
      query = query.or(`trip_type.eq.${filters.trip_type},trip_type.eq.ida_y_vuelta`)
    }
    if (filters?.only_with_seats) {
      query = query.gt('seats_available', 0)
    }
    if (filters?.only_verified) {
      query = query.eq('driver.is_verified', true)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Trip[]
  },

  async getById(id: string): Promise<Trip | null> {
    const { data } = await supabase
      .from('trips')
      .select(`
        *,
        driver:users!driver_id (
          id, full_name, avatar_url, is_verified,
          avg_rating_as_driver, total_trips_as_driver,
          car_brand, car_model, car_year, car_color, car_photo_url
        ),
        event:events!event_id (*)
      `)
      .eq('id', id)
      .single()
    return data
  },

  async getMyTrips(userId: string): Promise<Trip[]> {
    const { data } = await supabase
      .from('trips')
      .select(`
        *,
        event:events!event_id (id, title, event_date, venue_city, venue_name, image_url)
      `)
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
    return data ?? []
  },

  async create(driverId: string, form: NewTripForm) {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        driver_id:       driverId,
        event_id:        form.event_id,
        origin_address:  form.origin_address,
        origin_city:     form.origin_city,
        origin_province: form.origin_province,
        trip_type:       form.trip_type,
        seats_total:     form.seats_total,
        seats_available: form.seats_total,  // empieza lleno de disponibilidad
        price_outbound:  form.price_outbound,
        price_return:    form.price_return,
        departure_time:  form.departure_time?.toISOString(),
        return_time:     form.return_time?.toISOString(),
        notes:           form.notes,
        accepts_luggage: form.accepts_luggage,
        accepts_pets:    form.accepts_pets,
        waypoints:       form.waypoints,
      })
      .select()
      .single()

    if (error) throw error
    return data as Trip
  },

  async update(tripId: string, driverId: string, updates: {
    price_outbound?: number
    price_return?:   number
    seats_total?:    number
    notes?:          string
  }) {
    const { error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .eq('driver_id', driverId)
    if (error) throw error
  },

  async cancel(tripId: string, driverId: string) {
    return supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('id', tripId)
      .eq('driver_id', driverId)
  },
}

// =============================================================================
// BOOKINGS
// =============================================================================

export const bookingsApi = {
  async getMyBookings(passengerId: string): Promise<Booking[]> {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        trip:trips!trip_id (
          *,
          driver:users!driver_id (
            id, full_name, avatar_url, is_verified, avg_rating_as_driver
          ),
          event:events!event_id (
            id, title, event_date, venue_name, venue_city, image_url
          )
        )
      `)
      .eq('passenger_id', passengerId)
      .order('created_at', { ascending: false })
    return data ?? []
  },

  async getDriverBookings(driverId: string): Promise<Booking[]> {
    const { data: trips } = await supabase
      .from('trips')
      .select('id')
      .eq('driver_id', driverId)
    if (!trips?.length) return []
    const tripIds = trips.map((t) => t.id)
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        passenger:users!passenger_id (
          id, full_name, avatar_url, is_verified, avg_rating_as_passenger
        ),
        trip:trips!trip_id (
          *,
          driver:users!driver_id (
            id, full_name, avatar_url, is_verified, avg_rating_as_driver
          ),
          event:events!event_id (
            id, title, event_date, venue_name, venue_city, image_url
          )
        )
      `)
      .in('trip_id', tripIds)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
    return data ?? []
  },

  async getByTrip(tripId: string): Promise<Booking[]> {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        passenger:users!passenger_id (
          id, full_name, avatar_url, is_verified, avg_rating_as_passenger
        )
      `)
      .eq('trip_id', tripId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })
    return data ?? []
  },

  async create(passengerId: string, tripId: string, form: NewBookingForm, totalAmount: number) {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        trip_id:           tripId,
        passenger_id:      passengerId,
        segment:           form.segment,
        seats_booked:      form.seats_booked,
        total_amount:      totalAmount,
        payment_method:    form.payment_method,
        passenger_message: form.passenger_message,
        pickup_point:      form.pickup_point,
      })
      .select()
      .single()

    if (error) {
      const msg = error.message ?? ''
      if (msg.includes('bookings_trip_id_passenger_id_segment_key') || msg.includes('duplicate key'))
        throw new Error('Ya tenés una reserva para este viaje y tramo.')
      if (msg.includes('foreign key') || msg.includes('violates foreign key'))
        throw new Error('El viaje ya no existe.')
      if (msg.includes('check constraint') || msg.includes('violates check'))
        throw new Error('Los datos ingresados no son válidos.')
      throw new Error(msg || 'No se pudo reservar. Intentá de nuevo.')
    }

    // Notificar al conductor
    const { data: trip } = await supabase
      .from('trips')
      .select('driver_id, event:events!event_id(title)')
      .eq('id', tripId)
      .single()
    if (trip) {
      const eventTitle = (trip.event as any)?.title ?? 'un evento'
      const { data: passenger } = await supabase.from('users').select('full_name').eq('id', passengerId).single()
      sendPushNotification(
        trip.driver_id,
        '¡Nueva reserva! 🚗',
        `${passenger?.full_name ?? 'Alguien'} quiere sumarse a tu viaje para ${eventTitle}`,
        { booking_id: (data as Booking).id },
      )
    }

    return data as Booking
  },

  async confirm(bookingId: string, driverId: string) {
    // El conductor confirma: primero verificamos que el trip le pertenece
    const { data: booking } = await supabase
      .from('bookings')
      .select('trip_id')
      .eq('id', bookingId)
      .single()

    if (!booking) throw new Error('Reserva no encontrada')

    const { data: trip } = await supabase
      .from('trips')
      .select('driver_id')
      .eq('id', booking.trip_id)
      .single()

    if (!trip || trip.driver_id !== driverId) {
      throw new Error('No tenés permiso para confirmar esta reserva')
    }

    const result = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .select('passenger_id, trip:trips!trip_id(event:events!event_id(title))')
      .single()

    if (result.data) {
      const eventTitle = (result.data.trip as any)?.event?.title ?? 'un evento'
      sendPushNotification(
        result.data.passenger_id,
        '¡Reserva confirmada! ✅',
        `Tu lugar para ${eventTitle} está confirmado. ¡A prepararse!`,
        { booking_id: bookingId },
      )
    }
    return result
  },

  async cancel(bookingId: string, userId: string) {
    return supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('passenger_id', userId)
  },

  async getMyBookingForTrip(passengerId: string, tripId: string): Promise<Booking | null> {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('passenger_id', passengerId)
      .eq('trip_id', tripId)
      .neq('status', 'cancelled')
      .maybeSingle()
    return data as Booking | null
  },

  async getById(bookingId: string): Promise<Booking | null> {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        passenger:users!passenger_id (
          id, full_name, avatar_url, is_verified, avg_rating_as_passenger
        ),
        trip:trips!trip_id (
          *,
          driver:users!driver_id (
            id, full_name, avatar_url, is_verified, avg_rating_as_driver
          ),
          event:events!event_id (
            id, title, event_date, venue_name, venue_city, image_url
          )
        )
      `)
      .eq('id', bookingId)
      .single()
    return data as Booking | null
  },
}

// =============================================================================
// RATINGS
// =============================================================================

export const ratingsApi = {
  async getRatingsForUser(userId: string, role?: 'driver' | 'passenger'): Promise<Rating[]> {
    let query = supabase
      .from('ratings')
      .select('*')
      .eq('ratee_id', userId)
      .order('created_at', { ascending: false })

    if (role) query = query.eq('ratee_role', role)

    const { data } = await query
    return data ?? []
  },

  async submitRating(
    raterId: string,
    bookingId: string,
    rateeId: string,
    rateeRole: 'driver' | 'passenger',
    scores: RatingScores,
  ) {
    const { data, error } = await supabase
      .from('ratings')
      .insert({
        booking_id: bookingId,
        rater_id:   raterId,
        ratee_id:   rateeId,
        ratee_role: rateeRole,
        score_1:    scores.score_1,
        score_2:    scores.score_2,
        score_3:    scores.score_3,
        score_4:    scores.score_4,
        score_5:    scores.score_5,
        comment:    scores.comment,
      })
      .select()
      .single()

    if (error) throw error
    return data as Rating
  },

  async canRate(bookingId: string, raterId: string): Promise<boolean> {
    const { data } = await supabase
      .from('ratings')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('rater_id', raterId)
      .single()
    return !data  // puede calificar si no existe la calificación todavía
  },
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export const notificationsApi = {
  async getUnread(userId: string): Promise<AppNotification[]> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
    return data ?? []
  },

  async markAllRead(userId: string) {
    return supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
  },

  subscribeToNotifications(userId: string, onNotification: (n: AppNotification) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => onNotification(payload.new as AppNotification),
      )
      .subscribe()
  },
}

// =============================================================================
// MESSAGES (chat por reserva)
// =============================================================================

export const messagesApi = {
  async getMessages(bookingId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async send(
    bookingId: string,
    senderId: string,
    content: string,
    receiverId?: string,
    senderName?: string,
  ): Promise<Message> {
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > 1000) throw new Error('Mensaje inválido')
    const { data, error } = await supabase
      .from('messages')
      .insert({ booking_id: bookingId, sender_id: senderId, content: trimmed })
      .select()
      .single()
    if (error) throw error

    // Push notification al receptor (fire and forget)
    if (receiverId) {
      const preview = trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed
      sendPushNotification(
        receiverId,
        `💬 ${senderName ?? 'Mensaje nuevo'}`,
        preview,
        { bookingId },
      )
    }

    return data as Message
  },

  async markRead(bookingId: string, readerId: string) {
    return supabase
      .from('messages')
      .update({ is_read: true })
      .eq('booking_id', bookingId)
      .eq('is_read', false)
      .neq('sender_id', readerId)
  },

  async getUnreadCounts(userId: string, bookingIds: string[]): Promise<Record<string, number>> {
    if (!bookingIds.length) return {}
    const { data } = await supabase
      .from('messages')
      .select('booking_id')
      .in('booking_id', bookingIds)
      .eq('is_read', false)
      .neq('sender_id', userId)
    if (!data) return {}
    return data.reduce<Record<string, number>>((acc, { booking_id }) => {
      acc[booking_id] = (acc[booking_id] ?? 0) + 1
      return acc
    }, {})
  },

  subscribeToMessages(bookingId: string, onMessage: (m: Message) => void) {
    return supabase
      .channel(`chat:${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => onMessage(payload.new as Message),
      )
      .subscribe()
  },

  subscribeToUserMessages(bookingIds: string[], senderId: string, onNew: (bookingId: string) => void) {
    return supabase
      .channel('user_messages_unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { booking_id: string; sender_id: string }
          if (msg.sender_id !== senderId && bookingIds.includes(msg.booking_id)) {
            onNew(msg.booking_id)
          }
        },
      )
      .subscribe()
  },
}
