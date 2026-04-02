/**
 * Exchange rates used for display-side currency conversion.
 * All prices are stored in VND in the database.
 * These rates are applied at render time when the UI locale differs from the base currency.
 *
 * Update periodically or replace with a live rate feed when available.
 * Last updated: 2026-04-02
 */
export const BASE_CURRENCY = "VND" as const;

export const EXCHANGE_RATES: Record<string, number> = {
  USD_TO_VND: 25415,
  VND_TO_USD: 1 / 25415,
  // Extend with additional pairs as needed:
  // EUR_TO_VND: 27500,
  // VND_TO_EUR: 1 / 27500,
};
