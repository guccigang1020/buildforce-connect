import { Fragment } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import HomeIcon from "@mui/icons-material/Home";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { maskedRequestId } from "@/lib/anonymize";
import { cn } from "@/lib/utils";

/**
 * AppBreadcrumbs — auto-derives an RTL Hebrew breadcrumb trail from the current
 * route, built on the project's shadcn `breadcrumb` primitive (its separator is
 * already RTL-aware via `rtl:rotate-180`) and TanStack `Link`.
 *
 * Renders nothing on top-level/root pages (a single crumb adds no value) — it
 * only appears on deeper detail pages, per the breadcrumb-for-hierarchy rule.
 */

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "לוח בקרה",
  "corporation-dashboard": "לוח תאגיד",
  admin: "ניהול מערכת",
  "team-leader": "ראש צוות",
  "new-request": "בקשה חדשה",
  "my-requests": "הבקשות שלי",
  requests: "מכרזים",
  contractor: "ביצוע",
  corporation: "ביצוע",
  projects: "פרויקטים",
  attendance: "נוכחות",
  accounts: "חשבונות",
};

/** Full paths that are safe to render as links (real, navigable routes). */
const LINKABLE_PATHS = new Set([
  "/dashboard",
  "/corporation-dashboard",
  "/admin",
  "/team-leader",
  "/new-request",
  "/contractor/projects",
  "/contractor/attendance",
  "/contractor/accounts",
  "/corporation/attendance",
  "/corporation/accounts",
]);

function homeTarget(hasRole: (r: AppRole) => boolean): string {
  if (hasRole("corporation") && !hasRole("contractor")) return "/corporation-dashboard";
  if (hasRole("admin") && !hasRole("contractor") && !hasRole("corporation")) return "/admin";
  if (
    hasRole("team_leader") &&
    !hasRole("contractor") &&
    !hasRole("corporation") &&
    !hasRole("admin")
  )
    return "/team-leader";
  return "/dashboard";
}

type Crumb = { label: string; href?: string };

export function AppBreadcrumbs({ className }: { className?: string }) {
  const { hasRole } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const home = homeTarget(hasRole);
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = [{ label: "בית", href: home }];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    // Skip the segment that is the role home — the "בית" crumb already covers it.
    if (acc === home) return;

    const parent = segments[i - 1];
    let label = SEGMENT_LABELS[seg];
    if (!label) {
      // Unknown segment: treat ids under requests/my-requests as masked ids.
      label = parent === "my-requests" || parent === "requests" ? maskedRequestId(seg) : seg;
    }
    // "הבקשות שלי" / "מכרזים" have no index route of their own — point them at
    // the role home (which is the list of requests/tenders for that role).
    const href =
      seg === "my-requests" || seg === "requests"
        ? home
        : LINKABLE_PATHS.has(acc)
          ? acc
          : undefined;
    crumbs.push({ label, href });
  });

  // Nothing meaningful beyond the home crumb → don't render.
  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumb className={cn(className)}>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          const isHome = i === 0;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              <BreadcrumbItem>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    {isHome && <HomeIcon sx={{ fontSize: 14 }} />}
                    {isHome ? <span className="sr-only">{crumb.label}</span> : crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href} className="flex items-center gap-1.5">
                      {isHome && <HomeIcon sx={{ fontSize: 14 }} />}
                      {isHome ? <span className="sr-only">{crumb.label}</span> : crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
