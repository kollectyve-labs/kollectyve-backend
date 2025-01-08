import {
  cryptoWaitReady,
  decodeAddress,
  signatureVerify,
} from "https://deno.land/x/polkadot@0.2.45/util-crypto/mod.ts";
import {
  stringToU8a,
  u8aToHex,
} from "https://deno.land/x/polkadot@0.2.45/util/mod.ts";
import { Hono } from "@hono/hono";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const db = new Client({
  hostname: Deno.env.get("PG_HOSTNAME"),
  user: Deno.env.get("PG_USER"),
  password: Deno.env.get("PG_PASSWORD"),
  database: Deno.env.get("PG_DATABASE"),
  port: Deno.env.get("PG_PORT"),
});

await db.connect().then(() => {
  console.log("✅ Connexion to Postgres Successful");
}).catch((e) => {
  console.error(`❌ERROR When Connecting to Postgres ${e.message}`);
});

const providers = new Hono();

// Retrieve all providers
providers.get("/", async (c) => {
  try {
    const result = await db.queryArray("SELECT * from providers");
    return c.json({ providers: result.rows }, 200);
  } catch (err) {
    console.error(err);
    return c.json({ message: "Server Error" }, 500);
  }
});

export { providers };
