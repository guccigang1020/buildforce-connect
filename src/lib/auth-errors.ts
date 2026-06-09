// Maps Supabase Auth error messages (English, server-side) to Hebrew copy.
// Supabase returns messages like "Password is too weak", "User already
// registered", "Invalid login credentials", etc. We surface these inline in
// Hebrew instead of dumping the raw English string on the user.

export type AuthErrorTarget = "email" | "password" | "form";

export type MappedAuthError = {
  /** Which field the message belongs to (for inline display). */
  target: AuthErrorTarget;
  /** Hebrew message to show. */
  message: string;
};

export function mapAuthError(raw: string | undefined | null): MappedAuthError {
  const msg = (raw ?? "").toLowerCase();

  // Already-registered email
  if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
    return { target: "email", message: "אימייל זה כבר רשום במערכת — התחבר/י במקום זאת" };
  }

  // Weak / simple / leaked password
  if (
    msg.includes("password is too weak") ||
    msg.includes("password is too simple") ||
    msg.includes("password should") ||
    msg.includes("pwned") ||
    msg.includes("weak password") ||
    msg.includes("found in a known data breach") ||
    msg.includes("compromised")
  ) {
    return {
      target: "password",
      message: "הסיסמה חלשה מדי. בחר/י סיסמה ארוכה יותר עם שילוב של אותיות, ספרות ותווים מיוחדים",
    };
  }

  if (msg.includes("password") && msg.includes("at least")) {
    return { target: "password", message: "הסיסמה קצרה מדי" };
  }

  // Invalid credentials (login)
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return { target: "form", message: "אימייל או סיסמה שגויים" };
  }

  // Unconfirmed email
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return { target: "form", message: "החשבון עדיין לא אומת. בדוק/י את תיבת האימייל לאישור" };
  }

  // Invalid email format (server-side)
  if (msg.includes("invalid email") || (msg.includes("email") && msg.includes("valid"))) {
    return { target: "email", message: "כתובת אימייל לא תקינה" };
  }

  // Rate limiting
  if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("after")) {
    return { target: "form", message: "יותר מדי ניסיונות. נסה/י שוב בעוד מספר דקות" };
  }

  // Fallback — show the raw message if we have one, else a generic Hebrew error.
  return { target: "form", message: raw?.trim() || "אירעה שגיאה. נסה/י שוב" };
}
