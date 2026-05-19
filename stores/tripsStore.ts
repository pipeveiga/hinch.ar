import { create } from 'zustand'
import { tripsApi, bookingsApi } from '@/lib/supabase'
import type { Trip, Booking, TripSearchFilters, NewTripForm, NewBookingForm } from '@/lib/types'

interface TripsState {
  // Viajes del evento seleccionado
  eventTrips:      Trip[]
  eventTripsLoading: boolean
  eventTripsError: string | null

  // Mis viajes publicados
  myTrips:         Trip[]
  myTripsLoading:  boolean

  // Mis reservas como pasajero
  myBookings:      Booking[]
  myBookingsLoading: boolean

  // Viaje seleccionado (detalle)
  selectedTrip:    Trip | null
  selectedTripLoading: boolean

  // Acciones
  loadEventTrips:  (eventId: string, filters?: TripSearchFilters) => Promise<void>
  loadMyTrips:     (userId: string) => Promise<void>
  loadMyBookings:  (userId: string) => Promise<void>
  loadTrip:        (tripId: string) => Promise<void>
  publishTrip:     (driverId: string, form: NewTripForm) => Promise<Trip>
  cancelTrip:      (tripId: string, driverId: string) => Promise<void>
  bookTrip:        (passengerId: string, tripId: string, form: NewBookingForm, total: number) => Promise<Booking>
  confirmBooking:  (bookingId: string, driverId: string) => Promise<void>
  cancelBooking:   (bookingId: string, userId: string) => Promise<void>
  clearEventTrips: () => void
}

export const useTripsStore = create<TripsState>((set) => ({
  eventTrips:          [],
  eventTripsLoading:   false,
  eventTripsError:     null,
  myTrips:             [],
  myTripsLoading:      false,
  myBookings:          [],
  myBookingsLoading:   false,
  selectedTrip:        null,
  selectedTripLoading: false,

  loadEventTrips: async (eventId, filters) => {
    set({ eventTripsLoading: true, eventTripsError: null })
    try {
      const trips = await tripsApi.listByEvent(eventId, filters)
      set({ eventTrips: trips })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar viajes'
      set({ eventTripsError: msg })
    } finally {
      set({ eventTripsLoading: false })
    }
  },

  loadMyTrips: async (userId) => {
    set({ myTripsLoading: true })
    try {
      const trips = await tripsApi.getMyTrips(userId)
      set({ myTrips: trips })
    } finally {
      set({ myTripsLoading: false })
    }
  },

  loadMyBookings: async (userId) => {
    set({ myBookingsLoading: true })
    try {
      const bookings = await bookingsApi.getMyBookings(userId)
      set({ myBookings: bookings })
    } finally {
      set({ myBookingsLoading: false })
    }
  },

  loadTrip: async (tripId) => {
    set({ selectedTripLoading: true, selectedTrip: null })
    try {
      const trip = await tripsApi.getById(tripId)
      set({ selectedTrip: trip })
    } finally {
      set({ selectedTripLoading: false })
    }
  },

  publishTrip: async (driverId, form) => {
    const trip = await tripsApi.create(driverId, form)
    // Agregar a myTrips localmente
    set((state) => ({ myTrips: [trip, ...state.myTrips] }))
    return trip
  },

  cancelTrip: async (tripId, driverId) => {
    await tripsApi.cancel(tripId, driverId)
    set((state) => ({
      myTrips: state.myTrips.map((t) =>
        t.id === tripId ? { ...t, status: 'cancelled' } : t
      ),
    }))
  },

  bookTrip: async (passengerId, tripId, form, total) => {
    const booking = await bookingsApi.create(passengerId, tripId, form, total)
    set((state) => ({ myBookings: [booking, ...state.myBookings] }))
    return booking
  },

  confirmBooking: async (bookingId, driverId) => {
    await bookingsApi.confirm(bookingId, driverId)
    // Refrescar los bookings del viaje si es necesario
  },

  cancelBooking: async (bookingId, userId) => {
    await bookingsApi.cancel(bookingId, userId)
    set((state) => ({
      myBookings: state.myBookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ),
    }))
  },

  clearEventTrips: () => set({ eventTrips: [], eventTripsError: null }),
}))
