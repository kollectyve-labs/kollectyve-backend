// deno-lint-ignore-file verbatim-module-syntax
import { Hono } from "@hono/hono";
import { HealthStat } from "../utils/models.ts";
import {
  getProvider,
  getProviderByEmail,
  getProviderHealthHistory,
  storeHealthstats,
  storeIpAddress,
  updateProvider,
} from "../drizzle/db.ts";
import { verifySignature } from "../utils/signature.ts";
import { appIdMiddleware } from "../utils/auth-helpers.ts";
import { APP_ID_HEAD } from "../utils/constants.ts";

const kumulus = new Hono();

// Get a provider by address (callers: kumulus-agent)
kumulus.get("/providers/:address", appIdMiddleware(), async (c) => {
  try {
    const address = c.req.param("address");
    const provider = await getProvider(address);

    if (!provider) {
      return c.json({ message: "Provider not found" }, 404);
    }

    return c.json(provider, 200);
  } catch (err) {
    console.error("Error fetching provider:", err);
    return c.json({ message: "Failed to fetch provider" }, 500);
  }
});

// Get a provider by email
kumulus.get("/providers/email/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const provider = await getProviderByEmail(email);

    if (!provider) {
      return c.json({ message: "Provider not found" }, 404);
    }

    return c.json(provider, 200);
  } catch (err) {
    console.error("Error fetching provider:", err);
    return c.json({ message: "Failed to fetch provider" }, 500);
  }
});

// Update a provider
kumulus.put("/providers", appIdMiddleware(), async (c) => {
  try {
    const appId = c.get(APP_ID_HEAD);

    if (!(appId === Deno.env.get("PROVIDERS_APP_ID"))) {
      return c.json({ error: "Not a Provider" }, 403);
    }

    // Check if email owner

    const { email, ...providerData } = await c.req.json();

    const resp = await updateProvider(email, providerData);

    if (!resp) {
      return c.json({ message: "Failed to update provider" }, 500);
    }

    return c.json({ message: "Provider updated successfully" }, 200);
  } catch (err) {
    console.error("Error updating provider:", err);
    return c.json({ message: "Failed to update provider" }, 500);
  }
});

// // Update a user
kumulus.put("/user", appIdMiddleware(), async (c) => {
  try {
    // Get user data and from the body params and update the others fields that he pass to go on the metadata field
    // TODO: Implement User Update

    return c.json({ message: "User updated successfully" }, 200);
  } catch (err) {
    console.error("Error updating user:", err);
    return c.json({ message: "Failed to update user" }, 500);
  }
});

// Store a healthstat
kumulus.post("/healthstats", appIdMiddleware(), async (c) => {
  try {
    const { address, message, signature } = await c.req.json();

    if (!address || !message || !signature) {
      return c.json({ message: "Missing required fields" }, 400);
    }

    const provider = await getProvider(address);
    if (!provider) {
      console.log("PROVIDER NOT FOUND");
      return c.json({ message: "Provider not found" }, 404);
    }

    const isValidSignature = await verifySignature(message, signature, address);
    if (!isValidSignature) {
      return c.json({ message: "Invalid signature" }, 401);
    }

    const healthstat: HealthStat = {
      address,
      message,
      signature,
      verified_at: Date.now().toString(),
    };

    await storeHealthstats(healthstat);
    return c.json({ message: "Healthstats stored successfully" }, 201);
  } catch (err) {
    console.error("Error storing healthstats:", err);
    return c.json({ message: "Failed to store healthstats" }, 500);
  }
});

// Retrieve healthstats of a provider
kumulus.get("/:address/healthstats", appIdMiddleware(), async (c) => {
  const address = c.req.param("address");
  // Check if provider exists
  const provider = await getProvider(address);
  if (!provider) {
    return c.json({ message: "Provider not found" }, 404);
  }

  const healthHistory = await getProviderHealthHistory(address);
  return c.json(healthHistory, 200);
});

// Store a provider public ip address
kumulus.post("/store-ip", async (c) => {
  try {
    const { address, ipAddress, signature } = await c.req.json();

    if (!ipAddress || !ipAddress || !signature) {
      return c.json({ message: "Missing required fields" }, 400);
    }

    const provider = await getProvider(address);
    if (!provider) {
      console.log("PROVIDER NOT FOUND");
      return c.json({ message: "Provider not found" }, 404);
    }

    const isValidSignature = await verifySignature(
      ipAddress,
      signature,
      ipAddress,
    );
    if (!isValidSignature) {
      return c.json({ message: "Invalid signature" }, 401);
    }

    await storeIpAddress(address, ipAddress);
    return c.json({ message: "IpAddress stored successfully" }, 201);
  } catch (err) {
    console.error("Error storing Provider Ip Address:", err);
    return c.json({ message: "Failed to store Provider Ip Address" }, 500);
  }
});

export { kumulus };
