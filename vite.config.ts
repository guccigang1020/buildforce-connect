// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import path from "node:path";

// Load all env vars (no prefix) into process.env so server routes can read
// non-VITE_ secrets like SUPABASE_SERVICE_ROLE_KEY.
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    optimizeDeps: {
      include: [
        "prop-types",
        "cssjanus",
        "@babel/runtime/helpers/esm/extends",
        "@babel/runtime/helpers/extends",
      ],
      exclude: ["react-is", "hoist-non-react-statics", "zod"],
    },
    resolve: {
      alias: [
        {
          find: "entities/lib/decode.js",
          replacement: path.resolve(process.cwd(), "node_modules/entities/lib/decode.js"),
        },
        {
          find: "entities/lib/encode.js",
          replacement: path.resolve(process.cwd(), "node_modules/entities/lib/encode.js"),
        },
        {
          find: "entities",
          replacement: path.resolve(process.cwd(), "node_modules/entities"),
        },
        {
          find: /^react-is$/,
          replacement: path.resolve(process.cwd(), "src/shims/react-is.mjs"),
        },
        {
          find: /^react-is\/cjs\/react-is\.(development|production)\.js$/,
          replacement: path.resolve(process.cwd(), "src/shims/react-is.mjs"),
        },
        {
          find: /^hoist-non-react-statics$/,
          replacement: path.resolve(process.cwd(), "src/shims/hoist-non-react-statics.mjs"),
        },
      ],
    },
    // MUI + emotion ship CJS that breaks Node's ESM directory imports during
    // SSR (react-transition-group). Bundling them into the SSR build fixes it.
    ssr: {
      noExternal: [
        /^@mui\//,
        /^@emotion\//,
        "react-transition-group",
        "stylis-plugin-rtl",
        "stylis",
        "react-is",
        "hoist-non-react-statics",
      ],
    },
  },
});
