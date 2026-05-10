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
};

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
      { corporationId: "daniel", pricePerHour: 185, startDate: "1 ביוני" },
      { corporationId: "electra", pricePerHour: 192, startDate: "3 ביוני" },
      { corporationId: "metzada", pricePerHour: 198, startDate: "5 ביוני" },
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
      { corporationId: "electra", pricePerHour: 178, startDate: "15 ביוני" },
      { corporationId: "daniel", pricePerHour: 182, startDate: "16 ביוני" },
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