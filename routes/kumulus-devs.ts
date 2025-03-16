import { Hono } from "@hono/hono";
import { kumulus } from "./kumulus.ts";
import { getProviders, getDeveloperContainers, getAppContainers, getProviderByBestScoreAndLastLeaseTime } from "../drizzle/db.ts";
import { z } from "npm:zod";

const kumulusdevs = new Hono();

kumulusdevs.get("/", (c) => c.text("Kumulus Devs !"));

// Get all providers
kumulusdevs.get("/providers", async (c) => {
  const providers = await getProviders();
  return c.json(providers);
}); 

// Get all developer containers
kumulusdevs.get("/developer-containers", async (c) => {
  const developerContainers = await getDeveloperContainers();
  return c.json(developerContainers);
});

// Get all app containers
kumulusdevs.get("/app-containers", async (c) => {
  const appContainers = await getAppContainers();
  return c.json(appContainers);
});

// Create Ununtu VM
kumulusdevs.post("/create-vm", async (c) => {
  const { ram, cpu, storage, devSSHKey } = c.req.json();

  // Provider Selection 
  const provider = await getProviderByBestScoreAndLastLeaseTime();
  if (!provider) {
    return c.json({ error: "No provider found" }, 404);
  }

  // Create VM passed to Provider agent
  const response = await fetch(`${provider.ip}/create-vm`, {
    method: "POST",
    body: JSON.stringify({ ram, cpu, storage, devSSHKey }),
  });
  const data = await response.json();
  return c.json(data);
});

// Create Product Container (eg: Wordpress, Odoo, LibreOffice)
kumulusdevs.post("/create-container", async (c) => {
  const { containerType, devSSHKey } = c.req.json();

  // Provider Selection 
  const provider = await getProviderByBestScoreAndLastLeaseTime();
  if (!provider) {
    return c.json({ error: "No provider found" }, 404);
  }

  // Create VM passed to Provider agent
  const response = await fetch(`${provider.ip}/create-container`, {
    method: "POST",
    body: JSON.stringify({ containerType }),
  });
  const data = await response.json();
  return c.json(data);
});

export { kumulusdevs };
