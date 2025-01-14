import { Hono } from "@hono/hono";
import { HealthStatEntity, ProviderEntity } from "../utils/entities.ts";
import {
  createProvider,
  deleteProvider,
  getProvider,
  getProviderHealthHistory,
  getProviders,
  storeHealthstats,
  updateProvider,
} from "../utils/db.ts";
import { verifySignature } from "../utils/signature.ts";
const providers = new Hono();

// Create a provider
providers.post("/", async (c) => {
  try {
    const { account, name, website, email } = await c.req.json();

    if (!account || !name || !website || !email) {
      return c.json({ message: "Missing required fields" }, 400);
    }

    const provider: ProviderEntity = {
      address: account,
      name,
      website,
      total_resources: 0,
      reputation_score: 0,
      email,
      status: "pending",
    };

    await createProvider(provider);
    return c.json({ message: "Provider created successfully" }, 201);
  } catch (err) {
    console.error("Error creating provider:", err);
    return c.json({ message: "Failed to create provider" }, 500);
  }
});

// Get list of providers
providers.get("/", async (c) => {
  try {
    const providerList = await getProviders();
    return c.json(providerList, 200);
  } catch (err) {
    console.error("Error fetching providers:", err);
    return c.json({ message: "Failed to fetch providers" }, 500);
  }
});

// Get a provider
providers.get("/:address", async (c) => {
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

// Update a provider
providers.put("/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const { name, website, email } = await c.req.json();

    if (!name && !website && !email) {
      return c.json({ message: "No fields to update" }, 400);
    }

    const existingProvider = await getProvider(address);
    if (!existingProvider) {
      return c.json({ message: "Provider not found" }, 404);
    }

    const provider: ProviderEntity = {
      address,
      name: name || existingProvider.name,
      website: website || existingProvider.website,
      email: email || existingProvider.email,
      total_resources: existingProvider.total_resources,
      reputation_score: existingProvider.reputation_score,
      registration_block: existingProvider.registration_block,
      last_updated: Date.now(),
      status: existingProvider.status,
    };

    await updateProvider(provider);
    return c.json({ message: "Provider updated successfully" }, 200);
  } catch (err) {
    console.error("Error updating provider:", err);
    return c.json({ message: "Failed to update provider" }, 500);
  }
});

// Delete a provider
providers.delete("/:address", async (c) => {
  try {
    const address = c.req.param("address");

    const existingProvider = await getProvider(address);
    if (!existingProvider) {
      return c.json({ message: "Provider not found" }, 404);
    }

    await deleteProvider(address);
    return c.json({ message: "Provider deleted successfully" }, 200);
  } catch (err) {
    console.error("Error deleteing provider:", err);
    return c.json({ message: "Failed to delete provider" }, 500);
  }
});

// Store a healthstat
providers.post("/healthstats", async (c) => {
  try {
    const { address, message, signature } = await c.req.json();

    if (!address || !message || !signature) {
      return c.json({ message: "Missing required fields" }, 400);
    }

    const provider = await getProvider(address);
    if (!provider) {
      console.log("PROVIDER NOT FOUND MATE");
      return c.json({ message: "Provider not found" }, 404);
    }

    const isValidSignature = await verifySignature(message, signature, address);
    if (!isValidSignature) {
      return c.json({ message: "Invalid signature" }, 401);
    }

    const healthstat: HealthStatEntity = {
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

// Retrieve healthstats list of a provider
providers.get("/:address/healthstats", async (c) => {
  const address = c.req.param("address");
  // Check if provider exists
  const provider = await getProvider(address);
  if (!provider) {
    return c.json({ message: "Provider not found" }, 404);
  }

  const healthHistory = await getProviderHealthHistory(address);
  return c.json(healthHistory, 200);
});

export { providers };
