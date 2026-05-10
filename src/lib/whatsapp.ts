export type RequestDetails = {
  id: string;
  role: string;
  count: number;
  location: string;
  duration: string;
  startDate: string;
};

export function buildWhatsAppUrl(
  phone: string,
  supplierName: string,
  r: RequestDetails,
) {
  const msg =
    `שלום ${supplierName}, פנייה דרך BuildForce 👷\n\n` +
    `מספר בקשה: ${r.id}\n` +
    `תחום: ${r.role}\n` +
    `כמות עובדים: ${r.count}\n` +
    `מיקום: ${r.location}\n` +
    `משך: ${r.duration}\n` +
    `תאריך התחלה: ${r.startDate}\n\n` +
    `אשמח לקבל פרטים והצעת מחיר. תודה!`;
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}