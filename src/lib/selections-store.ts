import { useSyncExternalStore } from "react";
import type { SelectionRecord, Notification } from "./mock-data";
import {
  PLATFORM_FEE_PER_HOUR,
  HOURS_PER_MONTH,
  commitmentFeeRevenue,
  circumventionPenalty,
} from "./commission-config";

const SEL_KEY = "bf_selections_v1";
const NOTIF_KEY = "bf_notifications_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

function readSelections(): SelectionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEL_KEY);
    return raw ? (JSON.parse(raw) as SelectionRecord[]) : [];
  } catch {
    return [];
  }
}

function writeSelections(sels: SelectionRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEL_KEY, JSON.stringify(sels));
}

function readExtraNotifs(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIF_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : [];
  } catch {
    return [];
  }
}

function writeExtraNotifs(notifs: Notification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Cached snapshots so useSyncExternalStore doesn't loop. */
let selectionsSnapshot: SelectionRecord[] = readSelections();
let notifsSnapshot: Notification[] = readExtraNotifs();

function refreshSnapshots() {
  selectionsSnapshot = readSelections();
  notifsSnapshot = readExtraNotifs();
}

export function useSelections(): SelectionRecord[] {
  return useSyncExternalStore(
    subscribe,
    () => selectionsSnapshot,
    () => [],
  );
}

export function useExtraNotifications(): Notification[] {
  return useSyncExternalStore(
    subscribe,
    () => notifsSnapshot,
    () => [],
  );
}

export function getSelectionForRequest(requestId: string): SelectionRecord | undefined {
  return selectionsSnapshot.find((s) => s.requestId === requestId);
}

export function useSelectionForRequest(requestId: string): SelectionRecord | undefined {
  const all = useSelections();
  return all.find((s) => s.requestId === requestId);
}

export type AddSelectionInput = {
  requestId: string;
  requestTitle: string;
  corporationId: string;
  corporationName: string;
  pricePerHour: number;
  count: number;
  startDate: string;
  duration: string;
  commitmentMonths?: number;
  contractSignedBy?: string;
};

export function addSelection(input: AddSelectionInput): SelectionRecord {
  const months = Math.max(1, input.commitmentMonths ?? 1);
  const totalEstimate = input.pricePerHour * input.count * HOURS_PER_MONTH * months;
  const platformFeeTotal = commitmentFeeRevenue(input.count, months);
  const record: SelectionRecord = {
    id: `s-${Date.now()}`,
    requestId: input.requestId,
    requestTitle: input.requestTitle,
    corporationId: input.corporationId,
    pricePerHour: input.pricePerHour,
    count: input.count,
    startDate: input.startDate,
    duration: input.duration,
    totalEstimate,
    status: "in-progress",
    selectedAt: new Date().toLocaleDateString("he-IL", { day: "numeric", month: "long" }),
    commitmentMonths: months,
    platformFeePerHour: PLATFORM_FEE_PER_HOUR,
    platformFeeTotal,
    contract: input.contractSignedBy
      ? {
          signedBy: input.contractSignedBy,
          signedAt: new Date().toISOString(),
          commitmentMonths: months,
          penaltyAmount: circumventionPenalty(input.count),
        }
      : undefined,
  };

  const existing = readSelections().filter((s) => s.requestId !== input.requestId);
  const next = [record, ...existing];
  writeSelections(next);

  const notif: Notification = {
    id: `n-${Date.now()}`,
    type: "offer_accepted",
    title: input.contractSignedBy ? "חוזה נחתם וספק נבחר" : "ספק נבחר ואושר",
    body: `${input.corporationName} · בקשה #${input.requestId} — ₪${input.pricePerHour}/שעה + ₪${PLATFORM_FEE_PER_HOUR} עמלה`,
    requestId: input.requestId,
    corporationId: input.corporationId,
    read: false,
    timeAgo: "כעת",
  };
  writeExtraNotifs([notif, ...readExtraNotifs()]);

  refreshSnapshots();
  notify();
  return record;
}

export function clearSelection(requestId: string) {
  writeSelections(readSelections().filter((s) => s.requestId !== requestId));
  refreshSnapshots();
  notify();
}