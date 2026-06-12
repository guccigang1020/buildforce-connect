import * as React from "react";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";

/**
 * AuthShell — the framing for the auth pages, adapted from the 21st.dev
 * "modern stunning sign-in" glass aesthetic into the BuildForce system:
 * ambient indigo glow on a token background (works in both themes), a theme
 * toggle, and a centred RTL column. The page supplies its own brand mark + card.
 */
export function AuthShell({
  children,
  size = "sm",
}: {
  children: React.ReactNode;
  size?: "sm" | "lg";
}) {
  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4"
      dir="rtl"
    >
      {/* ambient indigo / violet glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-primary-glow/15 blur-[120px]" />
      </div>

      {/* theme toggle */}
      <div className="absolute left-4 top-4 z-20">
        <ThemeSwitch />
      </div>

      <div className={cn("relative z-10 w-full", size === "lg" ? "max-w-lg" : "max-w-sm")}>
        {children}
      </div>
    </div>
  );
}
