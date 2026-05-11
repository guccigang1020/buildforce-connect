export type Corporation = {
  id: string;
  name: string;
  workers: string;
  rating: number;
  reviews: number;
  regions: string;
  phone: string;
  verified: boolean;
  specialties: string[];
  founded: number;
  description: string;
  available: "this-week" | "this-month" | "available";
};

export const CORPORATIONS: Corporation[] = [
  {
    id: "daniel",
    name: "כוח אדם דניאל בע״מ",
    workers: "1,240",
    rating: 4.9,
    reviews: 312,
    regions: "מרכז · שפלה",
    phone: "972541234567",
    verified: true,
    specialties: ["טפסנים", "ברזלנים", "עובדי גמר"],
    founded: 2009,
    description:
      "תאגיד כוח אדם מוביל בישראל המתמחה באספקת עובדי בנייה זרים מאומתים. ניסיון של מעל 15 שנה בפרויקטים בקנה מידה גדול.",
    available: "this-week",
  },
  {
    id: "electra",
    name: "אלקטרה מנפאואר",
    workers: "2,100",
    rating: 4.8,
    reviews: 528,
    regions: "ארצי",
    phone: "972542345678",
    verified: true,
    specialties: ["טפסנים", "ברזלנים", "רצפים", "טייחים", "עובדי גמר"],
    founded: 2003,
    description:
      "אחד התאגידים הגדולים בישראל, פריסה ארצית מלאה. עובדים מאומתים, ביטוח מלא ותקני בטיחות מהמחמירים בענף.",
    available: "this-week",
  },
  {
    id: "metzada",
    name: "מצדה כוח אדם",
    workers: "890",
    rating: 4.7,
    reviews: 187,
    regions: "צפון · חיפה",
    phone: "972543456789",
    verified: false,
    specialties: ["טפסנים", "ברזלנים", "רצפים"],
    founded: 2014,
    description:
      "מתמחים בפרויקטים בצפון הארץ. צוותים מנוסים שעובדים יחד שנים, עם דגש על איכות ועמידה בלוחות זמנים.",
    available: "this-month",
  },
  {
    id: "ort",
    name: "אורט בנייה",
    workers: "650",
    rating: 4.8,
    reviews: 142,
    regions: "ירושלים · דרום",
    phone: "972544567890",
    verified: true,
    specialties: ["טייחים", "רצפים", "עובדי גמר"],
    founded: 2011,
    description:
      "בית לעובדי גמר וטיח מהמובילים באזור ירושלים. דגש על עבודות איכות לפרויקטי יוקרה.",
    available: "available",
  },
];

export function getCorporation(id: string): Corporation | undefined {
  return CORPORATIONS.find((c) => c.id === id);
}

export type Offer = {
  corporationId: string;
  pricePerHour: number;
  startDate: string;
  availableWorkers: number;
  responseTimeHours: number;
  warrantyDays: number;
  insurance: boolean;
  note?: string;
};

export type WorkforceRequest = {
  id: string;
  role: string;
  count: number;
  location: string;
  duration: string;
  startDate: string;
  status: "active" | "closed" | "draft";
  postedAt: string;
  budget?: string;
  description?: string;
  offers: Offer[];
  items?: RequestItem[];
  commitmentMonths?: number;
};

export type RequestItem = {
  id: string;
  role: string;
  nationality: string;
  count: number;
};

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

export const REQUESTS: WorkforceRequest[] = [
  {
    id: "BF-2847",
    role: "טפסנים",
    count: 7,
    location: "תל אביב",
    duration: "3 חודשים",
    startDate: "1 ביוני",
    status: "active",
    postedAt: "לפני 4 שעות",
    budget: "₪180-210 לשעה",
    description:
      "פרויקט מגדל מגורים 28 קומות. נדרש צוות מנוסה בטפסנות מודולרית ויציקות בקנה מידה גדול.",
    offers: [
      { corporationId: "daniel", pricePerHour: 185, startDate: "1 ביוני", availableWorkers: 7, responseTimeHours: 2, warrantyDays: 30, insurance: true, note: "צוות שעבד יחד 4 שנים. ניסיון מוכח במגדלי מגורים." },
      { corporationId: "electra", pricePerHour: 192, startDate: "3 ביוני", availableWorkers: 7, responseTimeHours: 1, warrantyDays: 60, insurance: true, note: "אפשרות לתגבור עד 12 עובדים בשבוע השני." },
      { corporationId: "metzada", pricePerHour: 198, startDate: "5 ביוני", availableWorkers: 5, responseTimeHours: 4, warrantyDays: 30, insurance: false, note: "צוות חלקי בלבד, יושלם תוך שבוע." },
      { corporationId: "ort", pricePerHour: 205, startDate: "1 ביוני", availableWorkers: 7, responseTimeHours: 3, warrantyDays: 45, insurance: true, note: "צוות בכיר עם מנהל עבודה צמוד." },
    ],
  },
  {
    id: "BF-2851",
    role: "ברזלנים",
    count: 4,
    location: "פתח תקווה",
    duration: "6 שבועות",
    startDate: "15 ביוני",
    status: "active",
    postedAt: "אתמול",
    budget: "₪170-200 לשעה",
    description: "עבודות ברזל לפודיום של בניין מסחרי.",
    offers: [
      { corporationId: "electra", pricePerHour: 178, startDate: "15 ביוני", availableWorkers: 4, responseTimeHours: 2, warrantyDays: 30, insurance: true },
      { corporationId: "daniel", pricePerHour: 182, startDate: "16 ביוני", availableWorkers: 4, responseTimeHours: 3, warrantyDays: 30, insurance: true },
    ],
  },
  {
    id: "BF-2855",
    role: "רצפים",
    count: 3,
    location: "חיפה",
    duration: "חודש",
    startDate: "20 ביוני",
    status: "active",
    postedAt: "לפני 2 ימים",
    budget: "₪160-185 לשעה",
    offers: [],
  },
  {
    id: "BF-2810",
    role: "טייחים",
    count: 5,
    location: "ירושלים",
    duration: "2 חודשים",
    startDate: "1 במאי",
    status: "closed",
    postedAt: "לפני 3 שבועות",
    budget: "₪165 לשעה",
    offers: [],
  },
];

export function getRequest(id: string): WorkforceRequest | undefined {
  return REQUESTS.find((r) => r.id === id);
}

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

/* ---------- Notifications ---------- */
export type Notification = {
  id: string;
  type: "new_offer" | "offer_accepted" | "message" | "request_closing" | "system";
  title: string;
  body: string;
  requestId?: string;
  corporationId?: string;
  read: boolean;
  timeAgo: string;
};

export const NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "new_offer",
    title: "הצעה חדשה התקבלה",
    body: "אורט בנייה הגישו הצעה לבקשה #BF-2847 — ₪205 לשעה",
    requestId: "BF-2847",
    corporationId: "ort",
    read: false,
    timeAgo: "לפני 12 דק׳",
  },
  {
    id: "n2",
    type: "new_offer",
    title: "הצעה חדשה התקבלה",
    body: "מצדה כוח אדם הגישו הצעה לבקשה #BF-2847 — ₪198 לשעה",
    requestId: "BF-2847",
    corporationId: "metzada",
    read: false,
    timeAgo: "לפני שעה",
  },
  {
    id: "n3",
    type: "message",
    title: "הודעה חדשה ב-WhatsApp",
    body: "אלקטרה מנפאואר שלחו הבהרה לגבי בקשה #BF-2851",
    requestId: "BF-2851",
    corporationId: "electra",
    read: false,
    timeAgo: "לפני 3 שעות",
  },
  {
    id: "n4",
    type: "request_closing",
    title: "בקשה נסגרת בקרוב",
    body: "בקשה #BF-2855 לא קיבלה הצעות. הארך את התקציב או הוסף פרטים.",
    requestId: "BF-2855",
    read: true,
    timeAgo: "אתמול",
  },
  {
    id: "n5",
    type: "offer_accepted",
    title: "הספק אישר את הבחירה",
    body: "כוח אדם דניאל אישרו ויחלו עבודה ב-1 במאי לבקשה #BF-2810",
    requestId: "BF-2810",
    corporationId: "daniel",
    read: true,
    timeAgo: "לפני 3 שבועות",
  },
  {
    id: "n6",
    type: "system",
    title: "ברוך הבא ל-BuildForce",
    body: "פתחנו לך חשבון. כדאי להשלים את הפרופיל לקבלת הצעות מדויקות יותר.",
    read: true,
    timeAgo: "לפני חודש",
  },
];

/* ---------- Selection History ---------- */
export type SelectionRecord = {
  id: string;
  requestId: string;
  requestTitle: string;
  corporationId: string;
  pricePerHour: number;
  count: number;
  startDate: string;
  duration: string;
  totalEstimate: number;
  status: "in-progress" | "completed" | "cancelled";
  selectedAt: string;
  rating?: number;
  commitmentMonths?: number;
  platformFeePerHour?: number;
  platformFeeTotal?: number;
  contract?: {
    signedBy: string;
    signedAt: string;
    commitmentMonths: number;
    penaltyAmount: number;
    userAgent?: string;
    timezone?: string;
  };
};

export const SELECTION_HISTORY: SelectionRecord[] = [
  {
    id: "s1",
    requestId: "BF-2810",
    requestTitle: "5 טייחים · ירושלים",
    corporationId: "daniel",
    pricePerHour: 165,
    count: 5,
    startDate: "1 במאי",
    duration: "2 חודשים",
    totalEstimate: 290400,
    status: "completed",
    selectedAt: "10 באפריל",
    rating: 5,
  },
  {
    id: "s2",
    requestId: "BF-2780",
    requestTitle: "3 ברזלנים · ראשון לציון",
    corporationId: "electra",
    pricePerHour: 175,
    count: 3,
    startDate: "15 במרץ",
    duration: "חודש",
    totalEstimate: 92400,
    status: "completed",
    selectedAt: "5 במרץ",
    rating: 4,
  },
  {
    id: "s3",
    requestId: "BF-2750",
    requestTitle: "8 טפסנים · נתניה",
    corporationId: "ort",
    pricePerHour: 188,
    count: 8,
    startDate: "1 בפברואר",
    duration: "4 חודשים",
    totalEstimate: 529408,
    status: "in-progress",
    selectedAt: "20 בינואר",
  },
  {
    id: "s4",
    requestId: "BF-2700",
    requestTitle: "2 רצפים · חולון",
    corporationId: "metzada",
    pricePerHour: 170,
    count: 2,
    startDate: "—",
    duration: "3 שבועות",
    totalEstimate: 0,
    status: "cancelled",
    selectedAt: "3 בינואר",
  },
];