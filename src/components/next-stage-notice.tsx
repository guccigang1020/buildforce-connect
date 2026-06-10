import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

/**
 * A clear, honest "this activates in the next stage" panel for screens whose
 * data only exists once on-site attendance is recorded (a real-device, pilot
 * step). Doubles as a roadmap explainer for demo viewers instead of showing a
 * confusing empty/error page.
 */
export function NextStageNotice({
  icon: Icon,
  badge = "בפיתוח · נכנס לפעולה בפיילוט",
  title,
  description,
  steps,
}: {
  icon: LucideIcon;
  badge?: string;
  title: string;
  description: string;
  steps?: string[];
}) {
  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <div className="enterprise-card p-8 text-center md:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
          <Icon className="h-6 w-6" />
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> {badge}
        </div>
        <h2 className="mt-3 text-xl font-extrabold">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {steps && steps.length > 0 && (
          <ol className="mx-auto mt-6 max-w-md space-y-2.5 text-right">
            {steps.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3 text-sm"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-muted-foreground">{s}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
