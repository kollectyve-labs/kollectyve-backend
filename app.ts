import { Hono } from "@hono/hono";
import { auth, faucet, kumulus } from "./routes/routes.ts";

const app = new Hono();

app.route("/auth", auth);
app.route("/faucet", faucet);
app.route("/kumulus", kumulus);

Deno.serve(app.fetch);
