import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// No ISR / Server Actions are used. Prerendered pages (e.g. the SSG'd
// evidence detail pages) are served read-only through the static assets
// cache, so the Worker still needs no KV / R2 / D1 / Durable Object
// bindings and stays portable.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
