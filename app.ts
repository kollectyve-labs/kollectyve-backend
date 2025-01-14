import { Hono } from "@hono/hono";
import { faucet, providers } from "./routes/routes.ts";

const app = new Hono();

app.route("/faucet", faucet);
app.route("/providers", providers);

Deno.serve(app.fetch);
