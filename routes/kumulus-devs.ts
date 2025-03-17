import { Hono } from "@hono/hono";
import {
  getProviders,
  getProviderByBestScoreAndLastLeaseTime,
  insertDeveloperVm,
  getDeveloperVmsByDeveloperId,
  updateVmStatus,
  updateAppStatus,
  deleteVmRecord,
  deleteAppRecord,
  insertAppContainer,
  getContainerIpAddressAndPort,
  getVmIpAddressAndPort
} from "../drizzle/db.ts";
import { z } from "npm:zod";
import { APP_TYPES } from "../utils/constants.ts";

// Request/Response Types
interface CreateVMRequest {
  username: string;
  sshKey: string;
  cpu: number;
  memory: string;
  disk: string;
}

interface CreateAppRequest {
  appType: typeof APP_TYPES[number];
  cpu: number;
  memory: string;
  devSSHKey?: string;
}

interface ContainerControlRequest {
  containerId: string;
  type: 'vm' | 'app';
}

// Validation Schemas
const createVMSchema = z.object({
  username: z.string().min(1),
  sshKey: z.string().min(1),
  cpu: z.number().min(1).max(8),
  memory: z.string().regex(/^\d+[mg]$/),
  disk: z.string().regex(/^\d+[mg]$/)
});

const createAppSchema = z.object({
  appType: z.enum(APP_TYPES as [string, ...string[]]),
  cpu: z.number().min(1).max(4),
  memory: z.string().regex(/^\d+[mg]$/),
  devSSHKey: z.string().optional()
});

const containerControlSchema = z.object({
  containerId: z.string().min(1),
  type: z.enum(['vm', 'app'])
});

const kumulusdevs = new Hono();

kumulusdevs.get("/", (c) => c.text("Kumulus Devs !"));

// Get all providers
kumulusdevs.get("/providers", async (c) => {
  const providers = await getProviders();
  return c.json(providers);
});

// Create Ubuntu VM
kumulusdevs.post("/create-vm", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createVMSchema.parse(body);

    /*
    const provider = await getProviderByBestScoreAndLastLeaseTime();
    if (!provider) {
      return c.json({ error: "No provider found" }, 404);
    }
    */
    // const response = await fetch(`${provider.ip}/create-vm`, {
    const response = await fetch("http://localhost:8800/create-vm", {

      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedData),
    });

    const data = await response.json();
    console.log("[LOG] VM creation response:", data);


    if (response.ok) {
      await insertDeveloperVm({
        //developerId: validatedData.username,
        // providerId: provider.id,
        developerId: "42115ec2-376a-489c-8300-94984aba72fa",
        //providerId: "localprovider",
        providerResourceId: "a6ae7e2f-e89a-4477-b3ac-ea4607c4599f",
        containerId: data.vmId,
        ram: parseInt(validatedData.memory),
        cpuCores: validatedData.cpu,
        storage: parseInt(validatedData.disk),
        status: data.status,
        sshPublicKey: validatedData.sshKey,
        sshPort: data.sshPort

      });
    }

    return c.json(data, response.status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});


// Create App Container
kumulusdevs.post("/create-app", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createAppSchema.parse(body);

   // const provider = await getProviderByBestScoreAndLastLeaseTime();

   const provider = "Provider1";
    if (!provider) {
      return c.json({ error: "No provider found" }, 404);
    }

    const response = await fetch("http://localhost:8800/create-app", {
    //const response = await fetch(`${provider.ip}/create-app`, {

      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: validatedData.appType,
        cpu: validatedData.cpu,
        memory: validatedData.memory
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("[LOG] App creation response:", data);
      await insertAppContainer({
        developerId: "42115ec2-376a-489c-8300-94984aba72fa",
        providerResourceId: "a6ae7e2f-e89a-4477-b3ac-ea4607c4599f",
        containerId: data.id,
        appName: validatedData.appType,
        ram: parseInt(validatedData.memory),
        cpuCores: validatedData.cpu,
        storage: 1024,
        status: data.status,
        port: data.port,
      });
    }

    return c.json(data, response.status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// Start Container
kumulusdevs.post("/start-container", async (c) => {
  
});

// Stop Container by Container ID 
kumulusdevs.post("/stop-container", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = containerControlSchema.parse(body);

    console.log("[LOG] Request body:", body);
    console.log("[LOG] Validated data:", validatedData);

    // Get container details based on type
    /*let containerDetails;
    try {
      if (validatedData.type === 'vm') {
        containerDetails = await getVmIpAddressAndPort(validatedData.containerId);
        console.log("[LOG] VM details:", containerDetails);
      } else {
        containerDetails = await getContainerIpAddressAndPort(validatedData.containerId);
        console.log("[LOG] Container details:", containerDetails);
      }
    } catch (dbError) {
      console.error("[ERROR] Database query failed:", dbError);
      return c.json({ 
        error: "Database query failed", 
        message: dbError.message 
      }, 500);
    }

    if (!containerDetails) {
      return c.json({ 
        error: "Container not found", 
        containerId: validatedData.containerId,
        type: validatedData.type
      }, 404);
    }
*/
    // Call provisioner to stop the container
    const response = await fetch("http://localhost:8800/stop-container", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        id: validatedData.containerId 
      }),
    });

    const data = await response.json();

    if (response.ok) {
      try {
        await updateContainerStatus(
          validatedData.containerId,
          validatedData.type,
          "stopped"
        );
      } catch (updateError) {
        console.error("[ERROR] Failed to update container status:", updateError);
      }

      return c.json({ 
        message: `${validatedData.type === 'vm' ? 'VM' : 'App'} stopped successfully`,
        containerId: validatedData.containerId,
        status: "stopped",
        ...data
      });
    }

    return c.json(data, response.status);
  } catch (error) {
    console.error("[ERROR] Stop container failed:", error);
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: "Validation error", 
        details: error.errors 
      }, 400);
    }
    return c.json({ 
      error: "Internal server error", 
      message: error.message 
    }, 500);
  }
});

// Delete Container
kumulusdevs.post("/delete-container", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = containerControlSchema.parse(body);

    const provider = await getProviderByBestScoreAndLastLeaseTime();
    if (!provider) {
      return c.json({ error: "No provider found" }, 404);
    }

    const response = await fetch(`${provider.ip}/delete-container`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: validatedData.containerId }),
    });

    const data = await response.json();

    if (response.ok) {
      if (validatedData.type === 'vm') {
        await deleteVmRecord(validatedData.containerId);
      } else {
        await deleteAppRecord(validatedData.containerId);
      }
    }

    return c.json(data, response.status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// List Containers
kumulusdevs.get("/containers", async (c) => {
  try {
    const provider = await getProviderByBestScoreAndLastLeaseTime();
    if (!provider) {
      return c.json({ error: "No provider found" }, 404);
    }

    const response = await fetch(`${provider.ip}/containers`, {
      method: "GET",
    });

    const data = await response.json();
    return c.json(data, response.status);
  } catch (error) {
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// Helper function to update container status
async function updateContainerStatus(
  containerId: string,
  type: 'vm' | 'app',
  status: string
) {
  if (type === 'vm') {
    await updateVmStatus(containerId, status);
  } else {
    await updateAppStatus(containerId, status);
  }
}

export { kumulusdevs };
