import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/cookie-consent";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <div className="text-7xl font-black text-primary/30">404</div>
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">הדף לא נמצא</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          הדף שחיפשת אינו קיים או שהוא הועבר למקום אחר.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-all hover:opacity-90"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          אירעה שגיאה בטעינת הדף
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          משהו השתבש אצלנו. ניתן לנסות לרענן את הדף או לחזור לדף הבית.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-all hover:opacity-90"
          >
            נסה שוב
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            דף הבית
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BuildForce — שוק כוח האדם החכם לענף הבנייה" },
      {
        name: "description",
        content:
          "פלטפורמה פרימיום למכרזי כוח אדם בבנייה. קבלנים ויזמים מקבלים הצעות מתאגידי כוח אדם מאומתים תוך שעות.",
      },
      { name: "author", content: "BuildForce" },
      { property: "og:title", content: "BuildForce — שוק כוח האדם החכם לענף הבנייה" },
      {
        property: "og:description",
        content:
          "פלטפורמה פרימיום למכרזי כוח אדם בבנייה. קבלנים ויזמים מקבלים הצעות מתאגידי כוח אדם מאומתים תוך שעות.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@BuildForce" },
      { name: "twitter:title", content: "BuildForce — שוק כוח האדם החכם לענף הבנייה" },
      {
        name: "twitter:description",
        content:
          "פלטפורמה פרימיום למכרזי כוח אדם בבנייה. קבלנים ויזמים מקבלים הצעות מתאגידי כוח אדם מאומתים תוך שעות.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4589d039-f74a-49cf-9d8b-4411e7a10939/id-preview-d8f52fa4--2bcb68ec-eafd-47db-806c-3c3a3144f33e.lovable.app-1778699461679.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4589d039-f74a-49cf-9d8b-4411e7a10939/id-preview-d8f52fa4--2bcb68ec-eafd-47db-806c-3c3a3144f33e.lovable.app-1778699461679.png",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%232563eb'/%3E%3Cg fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 13l5-5 4 4-5 5z'/%3E%3Cpath d='M16.5 12.5l3 3'/%3E%3Cpath d='M11 21h9'/%3E%3C/g%3E%3C/svg%3E",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&family=Heebo:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const PUBLIC_COOKIE_PATHS = new Set(["/", "/login", "/signup", "/privacy", "/terms"]);

function ConditionalCookieConsent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!PUBLIC_COOKIE_PATHS.has(pathname)) return null;
  return <CookieConsent />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
        <ConditionalCookieConsent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
