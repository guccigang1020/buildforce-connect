import { useSyncExternalStore } from "react";
import { redactMessage } from "./anonymize";

export type ChatMessage = {
  id: string;
  threadKey: string; // requestId__corpId
  from: "customer" | "corporation" | "system";
  text: string; // already-redacted text shown to all
  rawFlagged: boolean; // whether redaction triggered
  reasons: string[];
  at: string; // ISO
};

const KEY = "bf_chat_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

function read(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}
function write(msgs: ChatMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(msgs));
}

let snapshot: ChatMessage[] = read();
function notify() {
  snapshot = read();
  for (const l of listeners) l();
}

export function threadKey(requestId: string, corpId: string) {
  return `${requestId}__${corpId}`;
}

export function useThread(requestId: string, corpId: string): ChatMessage[] {
  const all = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => [],
  );
  const k = threadKey(requestId, corpId);
  return all.filter((m) => m.threadKey === k);
}

export function sendMessage(
  requestId: string,
  corpId: string,
  from: ChatMessage["from"],
  rawText: string,
): ChatMessage {
  const r = redactMessage(rawText);
  const msg: ChatMessage = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    threadKey: threadKey(requestId, corpId),
    from,
    text: r.clean,
    rawFlagged: r.flagged,
    reasons: r.reasons,
    at: new Date().toISOString(),
  };
  const all = read();
  all.push(msg);
  write(all);
  notify();
  return msg;
}
