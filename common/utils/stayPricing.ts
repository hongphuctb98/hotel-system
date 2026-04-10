/**
 * Stay pricing utility — pure functions, no side effects.
 * Importable in both client components and server-side route handlers.
 *
 * booking.baseRate is the unified "Agreed Rate" field on Booking. Its meaning
 * depends on chargeType:
 *
 *   nightly  → price per night     total = agreedRate × nights  (min 1)
 *   daily    → flat day rate        total = agreedRate
 *   hourly   → block price          total = agreedRate + hoursStayed × extraRate
 *
 * There is no nightly cap on hourly stays. baseRate IS the block price for hourly.
 */

// ── Input types ───────────────────────────────────────────────────────────────

export type NightlyInput = {
  chargeType: "nightly";
  /** booking.baseRate — price per night */
  ratePerNight: number;
  /** Calendar days between checkInDate and checkOutDate. Clamped to ≥ 1. */
  nights: number;
};

export type DailyInput = {
  chargeType: "daily";
  /** booking.baseRate — flat rate for the day */
  ratePerNight: number;
};

export type HourlyInput = {
  chargeType: "hourly";
  /**
   * Maps from booking.baseRate.
   * Fixed starting amount charged regardless of duration.
   */
  blockPrice: number;
  /** booking.hourlyRatePerHour — price per hour. */
  ratePerHour: number;
  /** Actual hours derived from checkInDate → checkOutDate. Must be ≥ 0. */
  hoursStayed: number;
};

export type StayPriceInput = NightlyInput | DailyInput | HourlyInput;

// ── Validation results ────────────────────────────────────────────────────────

export type StayPriceValidation = {
  /** true when input is logically valid for the charge type */
  valid: boolean;
  /** User-facing warning messages (never block saving — informational only) */
  warnings: string[];
  /** Hard errors that indicate the input cannot produce a meaningful price */
  errors: string[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

/** Hourly stays beyond this threshold show a warning (but are not blocked). */
const HOURLY_WARNING_THRESHOLD_HOURS = 12;

// ── Core calculation ──────────────────────────────────────────────────────────

/**
 * Calculate the stay price from a discriminated-union input.
 *
 *   nightly  ratePerNight × max(nights, 1)
 *   daily    ratePerNight  (flat; dates have no effect on the multiplier)
 *   hourly   blockPrice + hoursStayed × ratePerHour
 *
 * All numeric inputs are treated as non-negative. Negative values are clamped
 * to 0 rather than throwing, keeping the function safe for live form previews.
 */
export function calculateStayPrice(input: StayPriceInput): number {
  switch (input.chargeType) {
    case "nightly": {
      const nights = Math.max(1, Math.floor(input.nights));
      return input.ratePerNight * nights;
    }

    case "daily": {
      return input.ratePerNight;
    }

    case "hourly": {
      const hoursStayed = Math.max(0, input.hoursStayed);
      const blockPrice  = Math.max(0, input.blockPrice);
      const ratePerHour = Math.max(0, input.ratePerHour);
      return blockPrice + hoursStayed * ratePerHour;
    }
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a stay price input and return warnings/errors.
 * Errors indicate logically broken inputs. Warnings are informational only
 * and never block saving.
 */
export function validateStayPrice(input: StayPriceInput): StayPriceValidation {
  const errors: string[]   = [];
  const warnings: string[] = [];

  switch (input.chargeType) {
    case "nightly": {
      if (input.ratePerNight <= 0)
        errors.push("Nightly rate must be greater than zero.");
      if (input.nights < 1)
        errors.push("Nightly stays must be at least 1 night (check-out must be after check-in).");
      break;
    }

    case "daily": {
      if (input.ratePerNight <= 0)
        errors.push("Daily rate must be greater than zero.");
      break;
    }

    case "hourly": {
      if (input.blockPrice < 0)  errors.push("Block price cannot be negative.");
      if (input.ratePerHour < 0) errors.push("Hourly rate cannot be negative.");
      if (input.hoursStayed < 0) errors.push("Hours stayed cannot be negative.");

      if (errors.length === 0 && input.hoursStayed > HOURLY_WARNING_THRESHOLD_HOURS) {
        warnings.push(
          `Stay duration (${input.hoursStayed} hrs) exceeds ${HOURLY_WARNING_THRESHOLD_HOURS} hours. ` +
          `Consider switching to a nightly charge type.`
        );
      }
      break;
    }
  }

  return { valid: errors.length === 0, warnings, errors };
}

// ── Night count helper ────────────────────────────────────────────────────────

/**
 * Derive the number of nights from two date strings (YYYY-MM-DD) or Date objects.
 * Returns at least 1 — a same-day check-in/out is treated as 1 night for nightly
 * billing. Returns 0 for daily/hourly callers (they ignore the return value).
 */
export function countNights(checkIn: string | Date, checkOut: string | Date): number {
  const inMs  = new Date(checkIn).setHours(0, 0, 0, 0);
  const outMs = new Date(checkOut).setHours(0, 0, 0, 0);
  const diff  = Math.round((outMs - inMs) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

// ── buildStayPriceInput ───────────────────────────────────────────────────────

type BookingPricingFields = {
  chargeType: string;
  /** Unified agreed rate — semantics depend on chargeType (see module doc). */
  baseRate: number;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  hourlyBlockHours?: number | null;
  hourlyRatePerHour?: number | null;
};

/**
 * Build a StayPriceInput from a booking's stored pricing fields.
 * This is the canonical bridge between the Booking data model and calculateStayPrice.
 *
 * Mapping:
 *   nightly  → { ratePerNight: booking.baseRate, nights: countNights(checkIn, checkOut) }
 *   daily    → { ratePerNight: booking.baseRate }
 *   hourly   → { blockPrice: booking.baseRate, ratePerHour, hoursStayed }
 *
 * @param booking  The booking record's pricing fields (from DB or form values).
 * @param hoursStayed  Required for hourly charge type; estimated or actual hours.
 */
export function buildStayPriceInput(
  booking: BookingPricingFields,
  hoursStayed = 0,
): StayPriceInput {
  switch (booking.chargeType) {
    case "nightly":
      return {
        chargeType:   "nightly",
        ratePerNight: booking.baseRate,
        nights:       countNights(booking.checkInDate, booking.checkOutDate),
      };

    case "daily":
      return {
        chargeType:   "daily",
        ratePerNight: booking.baseRate,
      };

    case "hourly":
    default:
      return {
        chargeType:  "hourly",
        blockPrice:  booking.baseRate,       // baseRate = fixed starting amount for hourly
        ratePerHour: booking.hourlyRatePerHour ?? 0,
        hoursStayed,
      };
  }
}
