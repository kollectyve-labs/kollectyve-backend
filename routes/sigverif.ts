import {
  cryptoWaitReady,
  decodeAddress,
  signatureVerify,
} from "https://deno.land/x/polkadot@0.2.45/util-crypto/mod.ts";
import {
  stringToU8a,
  u8aToHex,
} from "https://deno.land/x/polkadot@0.2.45/util/mod.ts";
import { Hono } from "jsr:@hono/hono";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// Create database client
const db = new Client({
  hostname: Deno.env.get("PG_HOSTNAME"),
  user: Deno.env.get("PG_USER"),
  password: Deno.env.get("PG_PASSWORD"),
  database: Deno.env.get("PG_DATABASE"),
  port: Deno.env.get("PG_PORT"),
});

await db.connect();

const sigverif = new Hono();

const verifySignature = async (
  message: string,
  signature: string,
  address: string,
): Promise<boolean> => {
  await cryptoWaitReady();
  const publicKey = decodeAddress(address);
  const hexPublicKey = u8aToHex(publicKey);

  try {
    const result = await signatureVerify(
      stringToU8a(message),
      signature,
      hexPublicKey,
    );
    return result.isValid;
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
};

sigverif.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { message, signature, address } = body;

    if (!message || !signature || !address) {
      return c.json({
        status: "error",
        message: "Missing required fields: message, signature, or address",
      }, 400);
    }

    console.log("Received verification request:", {
      message,
      signature,
      address,
    });

    const isValid = await verifySignature(message, signature, address);

    if (isValid) {
      console.log("✅ Signature is valid. Performing actions...");

      // Store the status of the verification on a DB starting from address
      await db.queryObject({
        text: "INSERT INTO healthstats (address, message, signature, verified_at) VALUES ($1, $2, $3, NOW())",
        args: [address, message, signature],
      });

      return c.json({
        status: "success",
        message: "Signature verified successfully",
      });
    } else {
      console.log("❌ Invalid signature");
      return c.json({
        status: "error",
        message: "Invalid signature",
      }, 401);
    }
  } catch (error) {
    console.error("❌ Error processing request:", error);
    return c.json({
      status: "error",
      message: "An error occurred while processing the request",
    }, 500);
  }
});

export { sigverif };
