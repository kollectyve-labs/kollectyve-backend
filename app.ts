import { Hono } from "@hono/hono";
import {
  auth,
  faucet,
  kallama,
  kleapai,
  kumulus,
  kumulusdevs,
} from "./routes/routes.ts";

const app = new Hono();

//app.route("/auth", auth);
app.route("/faucet", faucet);
app.route("/kumulus", kumulus);
app.route("/kumulus-dev", kumulusdevs);
app.route("/kallama", kallama);
//app.route("/kleapai", kleapai);

Deno.serve(app.fetch);
