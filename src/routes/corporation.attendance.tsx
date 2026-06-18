import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

// Attendance + chat now live inside each project workspace, reachable from
// "הפרויקטים שלי". This standalone route is kept only as a redirect.
export const Route = createFileRoute("/corporation/attendance")({
  component: RedirectToProjects,
});

function RedirectToProjects() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/projects", replace: true });
  }, [navigate]);
  return null;
}
