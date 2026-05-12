import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://buildforceprime.com";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /my-requests\nDisallow: /corporation-dashboard\nDisallow: /admin\nDisallow: /new-request\n\nSitemap: ${SITE}/sitemap.xml\n`,
          { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
        ),
    },
  },
});