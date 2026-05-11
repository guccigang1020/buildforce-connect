// ============= Reverse-auction state (mock, deterministic per request) =============
// Synthesizes a live-feeling competitive auction from existing offers data,
// so contractors feel corporations actively competing for their request.

import type { WorkforceRequest, Offer } from "./mock-data";
import { maskedCorpId } from "./anonymize";

const AUCTION_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h
// Deterministic anchor — pretend each request was posted at a stable epoch
// derived from its id, so the countdown is consistent per-request per-client.
function seed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function auctionAnchorMs(reqId: string): number {
  // Anchor postedAt = today minus (seed % 36)h, ensures most are still active
  const hoursAgo = (seed(reqId) % 36) + 2;
  return Date.now() - hoursAgo * 3600 * 1000;
}

export function auctionEndMs(reqId: string): number {
  return auctionAnchorMs(reqId) + AUCTION_WINDOW_MS;
}

export function timeRemaining(endMs: number) {
  const ms = Math.max(0, endMs - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s, ms, ended: ms === 0 };
}

export type AuctionEvent = {
  id: string;
  ts: number; // ms timestamp
  corpMaskedId: string;
  type: "joined" | "drop" | "raised";
  pricePerHour: number;
  delta: number; // negative for drops
};

/** Build a synthetic, deterministic event feed from the offers list. */
export function buildActivityFeed(req: WorkforceRequest): AuctionEvent[] {
  const anchor = auctionAnchorMs(req.id);
  const events: AuctionEvent[] = [];
  // Pretend offers came in over the auction window in seed-shuffled order.
  const ordered = [...req.offers]
    .map((o, i) => ({ o, k: (seed(req.id + o.corporationId) + i * 7) % 1000 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.o);

  ordered.forEach((o, idx) => {
    const baseTs = anchor + (idx + 1) * (1.6 * 3600 * 1000) + (seed(o.corporationId) % 1800) * 1000;
    const initialBid = o.pricePerHour + 4 + (seed(o.corporationId + "i") % 6); // pretended opening
    events.push({
      id: `j-${o.corporationId}`,
      ts: baseTs,
      corpMaskedId: maskedCorpId(o.corporationId),
      type: "joined",
      pricePerHour: initialBid,
      delta: 0,
    });
    // 1-2 progressive drops
    const drops = 1 + (seed(o.corporationId + "d") % 2);
    let prev = initialBid;
    for (let d = 1; d <= drops; d++) {
      const target = d === drops ? o.pricePerHour : Math.max(o.pricePerHour, prev - 2);
      events.push({
        id: `d-${o.corporationId}-${d}`,
        ts: baseTs + d * (35 * 60 * 1000) + (seed(o.corporationId + d) % 600) * 1000,
        corpMaskedId: maskedCorpId(o.corporationId),
        type: "drop",
        pricePerHour: target,
        delta: target - prev,
      });
      prev = target;
    }
  });
  // Newest first
  return events.filter((e) => e.ts <= Date.now()).sort((a, b) => b.ts - a.ts);
}

/** Time-series (oldest → newest) of the running lowest price for a sparkline. */
export function lowestPriceSeries(req: WorkforceRequest): { t: number; price: number }[] {
  const feed = [...buildActivityFeed(req)].sort((a, b) => a.ts - b.ts);
  let lowest = Infinity;
  const series: { t: number; price: number }[] = [];
  for (const e of feed) {
    lowest = Math.min(lowest, e.pricePerHour);
    series.push({ t: e.ts, price: lowest });
  }
  return series;
}

/** Simulated concurrent viewers — pulses based on time. */
export function viewersNow(reqId: string): number {
  const base = 2 + (seed(reqId) % 5); // 2-6
  const wave = Math.floor(((Date.now() / 1000) % 60) / 12); // 0..4 cycling
  return base + wave;
}

/** Estimated savings vs. opening offer level. */
export function savingsSoFar(req: WorkforceRequest, hoursPerMonth = 176): number {
  const offers: Offer[] = req.offers;
  if (offers.length === 0) return 0;
  const opening = Math.max(...offers.map((o) => o.pricePerHour)) + 4;
  const current = Math.min(...offers.map((o) => o.pricePerHour));
  const monthlyDelta = (opening - current) * req.count * hoursPerMonth;
  return Math.max(0, Math.round(monthlyDelta));
}

export function relTime(ts: number): string {
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `לפני ${sec} שניות`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  return `לפני ${h} שעות`;
}
