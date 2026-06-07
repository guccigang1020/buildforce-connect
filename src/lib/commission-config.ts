/**
 * Platform commission model.
 *
 * MVP: flat fee per worker-hour, paid by the corporation on top of the
 * contractor-facing rate. Transparent: contractor sees ₪74 — corporation
 * pays ₪74 + ₪PLATFORM_FEE_PER_HOUR.
 *
 * Stored centrally so we can tier later without hunting through the codebase.
 */
export const PLATFORM_FEE_PER_HOUR = 2; // ₪ per worker-hour
export const FEE_CURRENCY = "₪";

/** Standard work-month assumption (8h × 22d) used for monthly estimates. */
export const HOURS_PER_MONTH = 8 * 22;

export function totalCorporationPays(pricePerHour: number): number {
  return pricePerHour + PLATFORM_FEE_PER_HOUR;
}

export function feePercent(pricePerHour: number): number {
  if (pricePerHour <= 0) return 0;
  return (PLATFORM_FEE_PER_HOUR / pricePerHour) * 100;
}

export function monthlyFeeRevenue(workers: number): number {
  return workers * HOURS_PER_MONTH * PLATFORM_FEE_PER_HOUR;
}

export function monthlyContractorPay(workers: number, pricePerHour: number): number {
  return workers * HOURS_PER_MONTH * pricePerHour;
}

export function commitmentFeeRevenue(workers: number, months: number): number {
  return monthlyFeeRevenue(workers) * Math.max(1, months);
}

/** Penalty multiplier on circumvention: 12× monthly fee. */
export const CIRCUMVENTION_PENALTY_MONTHS = 12;

export function circumventionPenalty(workers: number): number {
  return monthlyFeeRevenue(workers) * CIRCUMVENTION_PENALTY_MONTHS;
}
