// The two "sides" of every project, with one consistent color each.
//   Color 1 — corporation side: the corporation (תאגיד) + operations manager (מנהל תפעול)
//   Color 2 — contractor side:  the contractor (קבלן) + site foreman (מנהל עבודה)
export type Side = "corp" | "contractor";

export function roleSide(role: string | null | undefined): Side {
  return role === "contractor" || role === "site_manager" ? "contractor" : "corp";
}

export const SIDE_LABEL: Record<Side, string> = {
  corp: "צד התאגיד",
  contractor: "צד הקבלן",
};

// Chat bubble background per side (sky = corporation, amber = contractor).
export const SIDE_BUBBLE: Record<Side, string> = {
  corp: "bg-sky-500/15 border border-sky-500/40",
  contractor: "bg-amber-500/15 border border-amber-500/40",
};

// Small colored dot / accent per side.
export const SIDE_DOT: Record<Side, string> = {
  corp: "bg-sky-500",
  contractor: "bg-amber-500",
};

export const SIDE_TEXT: Record<Side, string> = {
  corp: "text-sky-600 dark:text-sky-400",
  contractor: "text-amber-600 dark:text-amber-400",
};
