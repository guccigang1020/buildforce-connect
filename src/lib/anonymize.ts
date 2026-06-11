// ============= Anti-circumvention helpers =============
// Until a contract is signed, corporations are shown anonymously.
// This prevents customers from identifying the corporation and
// contacting them directly outside the platform.

export function maskedCorpId(corpId: string): string {
  // deterministic short hash so the same corp = same code in UI
  let h = 0;
  for (let i = 0; i < corpId.length; i++) h = (h * 31 + corpId.charCodeAt(i)) | 0;
  const code = (Math.abs(h) % 9000) + 1000;
  return `BF-${code}`;
}

export function maskedCorpName(corpId: string): string {
  return `ספק מאומת #${maskedCorpId(corpId)}`;
}

export function maskedInitial(corpId: string): string {
  return maskedCorpId(corpId).slice(-2);
}

// Clean, platform-branded tender id (e.g. "BF-3947") instead of a raw UUID,
// matching the business-plan branding.
export function maskedRequestId(requestId: string): string {
  let h = 0;
  for (let i = 0; i < requestId.length; i++) h = (h * 33 + requestId.charCodeAt(i)) | 0;
  const code = (Math.abs(h) % 9000) + 1000;
  return `BF-${code}`;
}

export function maskedRegions(_regions: string): string {
  return "אזור פעילות נחשף לאחר חתימה";
}

// Redact phone / email / URL / @handle patterns from free text
// so corporations and customers can't share contact info via chat.
const PHONE_RE = /(\+?\d[\d\s().+-]{6,}\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const HANDLE_RE = /@[\w.]{3,}/g;
const WHATSAPP_HINT_RE = /\b(whats?app|וואטסאפ|ווצאפ|טלגרם|telegram|signal|סיגנל)\b/gi;

export type RedactionResult = {
  clean: string;
  flagged: boolean;
  reasons: string[];
};

export function redactMessage(input: string): RedactionResult {
  const reasons: string[] = [];
  let out = input;

  if (PHONE_RE.test(out)) reasons.push("מספר טלפון");
  out = out.replace(PHONE_RE, "███-מספר-נחסם███");

  if (EMAIL_RE.test(out)) reasons.push("אימייל");
  out = out.replace(EMAIL_RE, "███-אימייל-נחסם███");

  if (URL_RE.test(out)) reasons.push("קישור חיצוני");
  out = out.replace(URL_RE, "███-קישור-נחסם███");

  if (HANDLE_RE.test(out)) reasons.push("שם משתמש");
  out = out.replace(HANDLE_RE, "███-יוזר-נחסם███");

  if (WHATSAPP_HINT_RE.test(out)) reasons.push("הפניה לאפליקציה חיצונית");

  return {
    clean: out,
    flagged: reasons.length > 0,
    reasons: Array.from(new Set(reasons)),
  };
}
