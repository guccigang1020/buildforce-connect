import { Link } from "@tanstack/react-router";
import { HardHat } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold">
              Build<span className="text-primary">Force</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            שוק כוח האדם החכם של ענף הבנייה בישראל. מחבר קבלנים ויזמים עם תאגידי כוח אדם מאומתים.
          </p>
        </div>
        <div>
          <div className="text-sm font-bold">הפלטפורמה</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/new-request" className="hover:text-foreground">
                פרסום בקשה
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                לוח בקרה
              </Link>
            </li>
            <li>
              <Link to="/" hash="corps" className="hover:text-foreground">
                תאגידים
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-bold">צור קשר</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>support@buildforce.co.il</li>
            <li>03-000-0000</li>
            <li>תל אביב, ישראל</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BuildForce. כל הזכויות שמורות.
      </div>
    </footer>
  );
}
