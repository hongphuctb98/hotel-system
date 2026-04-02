export const ROUTES = {
  DASHBOARD: "/dashboard",
  ROOM_MAP: "/room-map",
  ROOMS: "/rooms",
  RESERVATIONS: "/reservations",
  GUESTS: "/guests",
  HOUSEKEEPING: "/housekeeping",
  BILLING: "/billing",
  MASTER: {
    FLOORS: "/master-data/floors",
    ROOM_TYPES: "/master-data/room-types",
    ROOM_STATUSES: "/master-data/room-statuses",
    BOOKING_STATUSES: "/master-data/booking-statuses",
    PAYMENT_METHODS: "/master-data/payment-methods",
    SERVICE_ITEMS: "/master-data/service-items",
    GUEST_TYPES: "/master-data/guest-types",
    AMENITIES: "/master-data/amenities",
  },
} as const;
