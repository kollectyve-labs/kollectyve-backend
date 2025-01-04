import { Hono } from "jsr:@hono/hono";
import { faucet, sigverif, providers } from "./routes/routes.ts";

const app = new Hono();

app.route("/faucet", faucet); 
app.route("/providers", providers); 
app.route("/sigverif", sigverif); 

Deno.serve(app.fetch);
