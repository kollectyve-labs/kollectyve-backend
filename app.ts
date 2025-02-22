import { Hono } from "@hono/hono";
import { auth, faucet, kumulus, kumulusdevs } from "./routes/routes.ts";

const app = new Hono();

app.route("/auth", auth);
app.route("/faucet", faucet);
app.route("/kumulus", kumulus);
app.route("/kumulus-dev", kumulusdevs);


Deno.serve(app.fetch);
