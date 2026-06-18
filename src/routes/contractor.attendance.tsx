import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

// Attendance now lives inside each project workspace (the נוכחות tab), reachable
// from "הפרויקטים שלי". This standalone route is kept only as a redirect so old
// links/bookmarks don't 404.
export const Route = createFileRoute("/contractor/attendance")({
  component: RedirectToProjects,
});

function RedirectToProjects() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/projects", replace: true });
  }, [navigate]);
  return null;
}
