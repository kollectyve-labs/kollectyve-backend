// deno-lint-ignore-file verbatim-module-syntax
import { Hono } from "@hono/hono";
import { HealthStat } from "../utils/models.ts";

import { verifySignature } from "../utils/signature.ts";
import { appIdMiddleware } from "../utils/auth-helpers.ts";
import { APP_ID_HEAD } from "../utils/constants.ts";

const kumulus = new Hono();

kumulus.get("/", (c) => c.text("Kumulus Providers!"));
export { kumulus };
