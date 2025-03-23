import { app } from "./provisioner.ts";

Deno.serve({ port: 8800, hostname: "0.0.0.0" }, app.fetch);

// Run cleanup every 24 hours
// Deno.cron("Unused Resources Cleanup Cron","0 0 * * *", cleanupUnusedResources);
