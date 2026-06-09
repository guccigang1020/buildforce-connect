import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Don't hammer the API when a request fails for a reason that won't change on
// retry (auth/permission/validation). React Query's default is 3 retries with
// exponential backoff, which turns a hard 401/403 into a ~7s spinner before it
// finally shows empty data. Only retry what looks transient, and only once.
function shouldRetry(failureCount: number, error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const isPermanent =
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("permission") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("not found") ||
    msg.includes("404");
  if (isPermanent) return false;
  return failureCount < 1;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
