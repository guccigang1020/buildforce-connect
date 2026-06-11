// Catalog / reference data for request forms (real options, not mock content).
// The marketplace itself is driven entirely by live Supabase data; this file
// only holds the static pick-lists shown in the new-request and workforce forms.

export type RequestItem = {
  id: string;
  role: string;
  nationality: string;
  count: number;
};

export const ROLES = [
  "טפסנים",
  "ברזלנים",
  "רצפים",
  "טייחים",
  "עובדי גמר",
  "חשמלאים",
  "אינסטלטורים",
  "מסגרים",
];

export const NATIONALITIES = [
  "הודים",
  "תאילנדים",
  "סרי לנקים",
  "מולדובים",
  "אוזבקים",
  "נפאלים",
  "אוקראינים",
  "סינים",
  "רומנים",
  "פיליפינים",
  "ללא העדפה",
] as const;

export const CITIES = [
  "תל אביב",
  "ירושלים",
  "חיפה",
  "באר שבע",
  "ראשון לציון",
  "פתח תקווה",
  "נתניה",
  "אשדוד",
  "חולון",
  "רמת גן",
  "אשקלון",
  "רחובות",
  "הרצליה",
  "כפר סבא",
  "מודיעין",
];
