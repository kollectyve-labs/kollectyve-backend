import { Hono } from "@hono/hono";
import { updateVmStatus, insertDeveloperVm, getDeveloperVmByContainerId } from "../database/kumulus/vms.ts";
import { 
  insertAppDeployment, 
  insertDeploymentContainers, 
  updateDeploymentContainersStatus } 
  from "../database/kumulus/app-deployments.ts";
import { z } from "npm:zod";
import { APP_TYPES } from "../utils/constants.ts";
import { selectProvider } from "../database/kumulus/providers.ts";

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

interface DeploymentControlRequest {
  deploymentId: string;
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

const deploymentControlSchema = z.object({
  deploymentId: z.string().min(1)
});

const kumulusdevs = new Hono();

kumulusdevs.get("/", (c) => c.text("Kumulus Devs !"));

// Test Provider Selection Algorithm
kumulusdevs.get("/test-provider", async (c) => {
  const provider = await selectProvider();
  return c.json(provider);
});

// Create Ubuntu VM
kumulusdevs.post("/create-vm", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createVMSchema.parse(body);

    const provider = await selectProvider();
    if (!provider) {
      return c.json({ error: "No provider available with capacity" }, 503);
    } else {
      console.log("[LOG] Provider selected:", provider);
    }
    
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

// Start VM by containerId
kumulusdevs.post("/start-vm", async (c) => {
  try {
    const body = await c.req.json();
    const vmId = body.vmId;

    // Check VM status in database first
    const vm = await getDeveloperVmByContainerId(vmId);
    if (!vm) {
      return c.json({ error: "VM not found" }, 404);
    }
    if (vm.status === "deleted") {
      return c.json({ error: "Cannot start a deleted VM" }, 400);
    }
    if (vm.status === "running") {
      return c.json({ error: "VM is already running" }, 400);
    }

    const response = await fetch("http://localhost:8800/start-vm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vmId }),
    });

    const data = await response.json();

    if (response.ok) {
      await updateVmStatus(vmId, "running");
      return c.json(data, response.status);
    } else if (response.status === 404) {
      // If VM not found, update status to deleted
      await updateVmStatus(vmId, "deleted");
      return c.json(data, response.status);
    } else {
      return c.json(data, response.status);
    }
  } catch (error) {
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// Stop VM by containerId
kumulusdevs.post("/stop-vm", async (c) => {
  try {
    const body = await c.req.json();
    const vmId = body.vmId;

    // Check VM status in database first
    const vm = await getDeveloperVmByContainerId(vmId);
    if (!vm) {
      return c.json({ error: "VM not found" }, 404);
    }
    if (vm.status === "deleted") {
      return c.json({ error: "Cannot stop a deleted VM" }, 400);
    }
    if (vm.status === "stopped") {
      return c.json({ error: "VM is already stopped" }, 400);
    }

    const response = await fetch("http://localhost:8800/stop-vm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vmId }),
    });

    const data = await response.json();

    if (response.ok) {
      await updateVmStatus(vmId, "stopped");
      return c.json(data, response.status);
    } else if (response.status === 404) {
      // If VM not found, update status to deleted
      await updateVmStatus(vmId, "deleted");
      return c.json(data, response.status);
    } else {
      return c.json(data, response.status);
    }
  } catch (error) {
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// Delete VM by containerId
kumulusdevs.post("/delete-vm", async (c) => {
  try {
    const body = await c.req.json();
    const vmId = body.vmId;

    // Check VM status in database first
    const vm = await getDeveloperVmByContainerId(vmId);
    if (!vm) {
      return c.json({ error: "VM not found" }, 404);
    }
    if (vm.status === "deleted") {
      return c.json({ error: "VM is already deleted" }, 400);
    }

    const response = await fetch("http://localhost:8800/delete-vm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vmId }),
    });

    const data = await response.json();

    if (response.ok || response.status === 404) {
      // Update status to deleted regardless of whether the container exists
      await updateVmStatus(vmId, "deleted");
      return c.json(data, response.status);
    } else {
      return c.json(data, response.status);
    }
  } catch (error) {
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// Create App Container
kumulusdevs.post("/create-app", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createAppSchema.parse(body);

    const provider = await selectProvider();
    if (!provider) {
      return c.json({ error: "No provider available with capacity" }, 503);
    } else {
      console.log("[LOG] Provider selected:", provider);
    }

    // Generate a deploymentId if not provided
    const deploymentId = crypto.randomUUID();

    const provisionerRequest = {
      type: validatedData.appType,
      cpu: validatedData.cpu,
      memory: validatedData.memory,
      deploymentId: deploymentId
    };

    // Call provisioner to create app
    const response = await fetch("http://localhost:8800/create-app", {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(provisionerRequest),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("[LOG] App creation response:", data);
      // Insert App Deployment
      await insertAppDeployment({
        id: deploymentId,
        developerId: "42115ec2-376a-489c-8300-94984aba72fa",
        providerResourceId: provider.resourceId,
        appType: validatedData.appType, 
        networkName: `${deploymentId}-network`,
        totalCpu: validatedData.cpu,
        totalMemory: parseInt(validatedData.memory),
        status: 'creating'
      });

      // Insert Container Records
      for (const container of data.containers) {
        await insertDeploymentContainers({
          deploymentId: deploymentId,
          containerId: container.id,
          containerType: container.type,
          name: container.id,
          image: container.type,
          cpuCores: container.type === 'main' ? validatedData.cpu : 1,
          ram: parseInt(validatedData.memory),  
          storage: 12,
          port: container.port,
          status: container.status
        });
      }

      // Update Deployment Status
      await updateDeploymentContainersStatus(deploymentId, 'running');
    }

    return c.json(data, response.status);
  } catch (error) {
    console.error("[ERROR] Create app failed:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// Start Deployment
kumulusdevs.post("/start-app", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = deploymentControlSchema.parse(body);

    // Call provisioner to start deployment
    const response = await fetch("http://localhost:8800/start-deployment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deploymentId: validatedData.deploymentId }),
    });

    const data = await response.json();

    if (response.ok) {
      // Update Deployment Status
      await updateDeploymentContainersStatus(validatedData.deploymentId, 'running');
    }

    return c.json(data, response.status);
  } catch (error) {
    console.error("[ERROR] Start deployment failed:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// Stop Deployment
kumulusdevs.post("/stop-app", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = deploymentControlSchema.parse(body);

 
    // Call provisioner to stop deployment
    const response = await fetch("http://localhost:8800/stop-deployment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deploymentId: validatedData.deploymentId }),
    });

    const data = await response.json();

    if (response.ok) {
      // Update Deployment Status
      await updateDeploymentContainersStatus(validatedData.deploymentId, 'stopped');
    }

    return c.json(data, response.status);
  } catch (error) {
    console.error("[ERROR] Stop deployment failed:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

// Delete Deployment
kumulusdevs.post("/delete-app", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = deploymentControlSchema.parse(body);

    // Call provisioner to delete deployment
    const response = await fetch("http://localhost:8800/delete-deployment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deploymentId: validatedData.deploymentId }),
    });

    const data = await response.json();

    if (response.ok) {
      // Update Deployment Status
      await updateDeploymentContainersStatus(validatedData.deploymentId, 'deleted');
    }

    return c.json(data, response.status);
  } catch (error) {
    console.error("[ERROR] Delete deployment failed:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    return c.json({ error: "Internal server error", message: error.message }, 500);
  }
});

export { kumulusdevs };
