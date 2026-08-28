// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { readFileSync } from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { ProxyOptions } from "vite";

// --- dev-only settings, read from .env.local ---------------------------------
// Deliberately NOT read through import.meta.env: these configure the dev server,
// and the Basic Auth credential must never be compiled into a client bundle.
function localEnv(): Record<string, string> {
  try {
    const text = readFileSync(new URL(".env.local", import.meta.url), "utf-8");
    return Object.fromEntries(
      text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const eq = line.indexOf("=");
          return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...localEnv(), ...process.env } as Record<string, string>;
const upstream = env["CF_UPSTREAM"];
const basicAuth =
  env["CF_BASIC_USER"] && env["CF_BASIC_PASS"]
    ? Buffer.from(`${env["CF_BASIC_USER"]}:${env["CF_BASIC_PASS"]}`).toString("base64")
    : null;

// Develop against the REAL backend. The app requests the relative path /api,
// exactly as it will in production; this forwards those requests to the
// CloudFront distribution and adds the Basic Auth header its edge function
// requires. Everything downstream — OAC signing, the payload hash, SSE streaming
// — then behaves identically to production, because it IS production.
const apiProxy: Record<string, ProxyOptions> | null =
  upstream && basicAuth
    ? {
        "/api": {
          target: upstream,
          changeOrigin: true, // CloudFront routes on Host; it must be the CF domain
          secure: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("authorization", `Basic ${basicAuth}`);
              // A turn can run 90s with long silent gaps. Don't time out.
              proxyReq.setTimeout(15 * 60 * 1000);
            });
          },
        },
      }
    : null;

export default defineConfig({
  nitro: false,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },

    // SPA mode. This app deploys to an S3 bucket behind CloudFront, which serves
    // static files only — it cannot run the SSR worker the default build
    // produces. SPA mode prerenders a static HTML shell at build time and lets
    // the router take over in the browser, which is the shape the existing
    // distribution already serves.
    spa: { enabled: true },
  },

  vite: {
    ...(apiProxy ? { server: { proxy: apiProxy } } : {}),

    // The shell prerender starts a preview server and fetches "/". Pinning to
    // IPv4 avoids EAFNOSUPPORT on hosts without IPv6.
    preview: { host: "127.0.0.1", strictPort: false },
  },
});
