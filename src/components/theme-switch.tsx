import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

/**
 * Clean pill theme toggle. Forced to `dir="ltr"` and using absolute thumb
 * positioning so it lays out identically inside the app's RTL shells (a flex
 * thumb + translate-x overflowed the track under `dir=rtl`). A single sliding
 * thumb carries the current-mode glyph.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      dir="ltr"
      aria-checked={isDark}
      aria-label="החלף בין מצב כהה לבהיר"
      title={isDark ? "עבור למצב בהיר" : "עבור למצב כהה"}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-8 w-[3.25rem] shrink-0 cursor-pointer rounded-full border border-border bg-muted transition-colors hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-[left] duration-200 ease-out",
          isDark ? "left-[calc(100%-1.625rem)]" : "left-1",
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
