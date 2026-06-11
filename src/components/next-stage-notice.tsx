import ScheduleIcon from "@mui/icons-material/Schedule";

/**
 * Canonical "coming-soon" card. Used on screens whose features activate once
 * on-site attendance is in use (pilot step). Shows a calm, informative card
 * with no dead buttons.
 */
export function NextStageNotice({
  icon: Icon,
  badge: _badge, // kept for API compat — always shows "בקרוב"
  title,
  description,
  steps,
}: {
  icon: React.ComponentType<{ className?: string; sx?: object }>;
  badge?: string;
  title: string;
  description: string;
  steps?: string[];
}) {
  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <div className="coming-soon-card">
        {/* Icon — neutral, calm; no primary gradient (not a primary action) */}
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Icon sx={{ fontSize: 28 }} />
        </div>

        {/* "בקרוב" chip */}
        <div className="mt-4">
          <span className="status-chip-muted">
            <ScheduleIcon sx={{ fontSize: 12 }} />
            בקרוב
          </span>
        </div>

        <h2 className="mt-3 text-lg font-bold text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {steps && steps.length > 0 && (
          <ol className="mx-auto mt-5 max-w-md space-y-2 text-right">
            {steps.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 text-sm"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold text-foreground">
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
