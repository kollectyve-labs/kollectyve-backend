import { Hono } from "@hono/hono";
//import { cors } from '@hono/hono/cors'
//app.use(cors({ origin: 'http://localhost:8000' }));

export const app = new Hono();

interface VMRequest {
  username: string;
  sshKey: string;
  cpu: number;
  memory: string;
  disk: string;
}

interface VMControlRequest {
  vmId: string;
}

async function runCommand(
  cmd: string,
  args: string[] = [],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    console.log(`[LOG] Running command: ${cmd} ${args.join(" ")}`);

    const command = new Deno.Command(cmd, {
      args,
      stdout: "piped",
      stderr: "piped",
    });

    const { success, stdout, stderr } = await command.output();

    return {
      code: success ? 0 : 1,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    };
  } catch (error) {
    console.error(`[ERROR] Command execution failed: ${error.message}`);
    return {
      code: 1,
      stdout: "",
      stderr: error.message,
    };
  }
}

// Port ranges for different applications
const PORT_RANGES = {
  odoo: { start: 8069, end: 8169 },
  wordpress: { start: 8080, end: 8180 },
  libreoffice: { start: 9980, end: 10080 },
  nextcloud: { start: 7000, end: 7100 },
} as const;

async function findFreePort(
  startPort: number,
  endPort: number,
): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    try {
      const listener = await Deno.listen({ port });
      listener.close();
      return port;
    } catch (_) {
      continue;
    }
  }
  throw new Error(`No available ports in range ${startPort}-${endPort}`);
}

function generateDockerfile(username: string, sshKey: string): string {
  console.log(`[LOG] Generating Dockerfile for user: ${username}`);

  try {
    const encodedSshKey = btoa(sshKey);
    console.log(`[LOG] SSH Key encoded successfully`);

    return `
      FROM ubuntu:22.04
      
      # Configure apt for faster downloads
      ENV DEBIAN_FRONTEND=noninteractive
      
      # Configure apt to retry and use multiple mirrors
      RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries && \
          echo 'Acquire::http::Pipeline-Depth "5";' >> /etc/apt/apt.conf.d/80-retries && \
          echo 'Acquire::http::Timeout "30";' >> /etc/apt/apt.conf.d/80-retries && \
          echo 'APT::Install-Recommends "false";' >> /etc/apt/apt.conf.d/80-retries && \
          echo "deb mirror://mirrors.ubuntu.com/mirrors.txt jammy main restricted universe multiverse" > /etc/apt/sources.list && \
          echo "deb mirror://mirrors.ubuntu.com/mirrors.txt jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list && \
          echo "deb mirror://mirrors.ubuntu.com/mirrors.txt jammy-security main restricted universe multiverse" >> /etc/apt/sources.list
      
      # Install necessary packages with retries
      RUN apt-get update -y && \
          apt-get install -y --no-install-recommends openssh-server sudo ca-certificates && \
          apt-get clean && \
          rm -rf /var/lib/apt/lists/*
      
      # Ensure privilege separation directory exists for SSH
      RUN mkdir -p /run/sshd && chmod 0755 /run/sshd
      
      # Create a new user with sudo privileges
      RUN useradd -m -s /bin/bash ${username} && \
          usermod -aG sudo ${username} && \
          mkdir -p /home/${username}/.ssh
      
      # Set up SSH key for the user
      RUN echo "${encodedSshKey}" | base64 -d > /home/${username}/.ssh/authorized_keys && \
          chmod 700 /home/${username}/.ssh && \
          chmod 600 /home/${username}/.ssh/authorized_keys && \
          chown -R ${username}:${username} /home/${username}/.ssh
      
      # Configure SSH server
      RUN sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config && \
          sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config && \
          sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config && \
          echo "AllowUsers ${username}" >> /etc/ssh/sshd_config
      
      # Expose SSH port
      EXPOSE 22
      
      # Start SSH service
      CMD ["/usr/sbin/sshd", "-D"]
      `;
  } catch (error) {
    console.error(`[ERROR] Failed to generate Dockerfile: ${error.message}`);
    throw error;
  }
}

interface AppRequest {
  type: "odoo" | "wordpress" | "libreoffice" | "nextcloud";
  cpu: number;
  memory: string;
  deploymentId: string; // Added to track deployment
}

app.get("/", (c) => c.text("Provision Agent Running !"));

app.post("/create-vm", async (c) => {
  try {
    const body: VMRequest = await c.req.json();
    console.log(
      `[LOG] Received VM creation request for user: ${body.username}`,
    );

    // Validate all required parameters
    const requiredParams: (keyof VMRequest)[] = [
      "username",
      "sshKey",
      "cpu",
      "memory",
      "disk",
    ];
    for (const param of requiredParams) {
      if (!body[param]) {
        console.error(`[ERROR] Missing required parameter: ${param}`);
        return c.json({ error: `Missing required parameter: ${param}` }, 400);
      }
    }

    const vmId = crypto.randomUUID();
    const dockerfilePath = `/tmp/Dockerfile-${vmId}`;
    const imageName = `ubuntu-vm-${vmId}`;

    console.log(`[LOG] Generated VM ID: ${vmId}`);
    console.log(`[LOG] Dockerfile path: ${dockerfilePath}`);
    console.log(`[LOG] Image name: ${imageName}`);

    const dockerfileContent = generateDockerfile(body.username, body.sshKey);
    await Deno.writeTextFile(dockerfilePath, dockerfileContent);
    console.log(`[LOG] Dockerfile written successfully`);

    const sshPort = await findFreePort(2222, 2322);
    console.log(`[LOG] Selected SSH port: ${sshPort}`);

    const buildResult = await runCommand("docker", [
      "build",
      "--no-cache",
      "--progress=plain",
      "--network=host",
      "-t",
      imageName,
      "-f",
      dockerfilePath,
      ".",
    ]);

    console.log(`[LOG] Build command exit code: ${buildResult.code}`);

    if (buildResult.code !== 0) {
      console.error(`[ERROR] Docker build failed`);
      console.error(`[ERROR] Build stderr: ${buildResult.stderr}`);
      console.error(`[ERROR] Build stdout: ${buildResult.stdout}`);

      return c.json({
        error: "Failed to build Docker image",
        details: {
          stderr: buildResult.stderr,
          stdout: buildResult.stdout,
        },
      }, 500);
    }

    const runResult = await runCommand("docker", [
      "run",
      "-d",
      "--dns",
      "8.8.8.8",
      "--dns",
      "8.8.4.4",
      `--cpus=${body.cpu}`,
      `--memory=${body.memory}`,
      `-p`,
      `${sshPort}:22`,
      `--name`,
      vmId,
      imageName,
    ]);

    console.log(`[LOG] Run command exit code: ${runResult.code}`);

    if (runResult.code !== 0) {
      console.error(`[ERROR] Docker run failed`);
      console.error(`[ERROR] Run stderr: ${runResult.stderr}`);
      console.error(`[ERROR] Run stdout: ${runResult.stdout}`);

      return c.json({
        error: "Failed to start Docker container",
        details: {
          stderr: runResult.stderr,
          stdout: runResult.stdout,
        },
      }, 500);
    }

    await Deno.remove(dockerfilePath);
    console.log(`[LOG] Temporary Dockerfile removed`);

    return c.json({
      vmId,
      sshPort,
      username: body.username,
      status: "Running",
    }, 201);
  } catch (error) {
    console.error(
      `[FATAL ERROR] VM creation completely failed: ${error.message}`,
    );
    console.error(`[FATAL ERROR] Error stack: ${error.stack}`);

    return c.json({
      error: "VM creation failed",
      details: error.message,
    }, 500);
  }
});

// Helper function to check if container exists
async function containerExists(containerId: string): Promise<boolean> {
  const inspectResult = await runCommand("docker", ["inspect", containerId]);
  return inspectResult.code === 0;
}

// Stop VM
app.post("/stop-vm", async (c) => {
  try {
    const body: VMControlRequest = await c.req.json();
    console.log(`[LOG] Received VM stop request for : ${body.vmId}`);

    // Check if container exists
    const exists = await containerExists(body.vmId);
    if (!exists) {
      return c.json({
        error: "VM not found",
        details: `Container ${body.vmId} does not exist`,
      }, 404);
    }

    const stopResult = await runCommand("docker", ["stop", body.vmId]);

    if (stopResult.code !== 0) {
      console.error(`[ERROR] Docker stop failed`);
      console.error(`[ERROR] Stop stderr: ${stopResult.stderr}`);
      console.error(`[ERROR] Stop stdout: ${stopResult.stdout}`);
      return c.json({
        error: "Failed to stop VM",
        details: stopResult.stderr,
      }, 500);
    }

    return c.json({
      message: "VM stopped successfully",
    }, 200);
  } catch (error) {
    console.error(`[ERROR] VM stop failed: ${error.message}`);
    return c.json({ error: "VM stop failed", details: error.message }, 500);
  }
});

// Start VM
app.post("/start-vm", async (c) => {
  try {
    const body: VMControlRequest = await c.req.json();
    console.log(`[LOG] Received VM start request for : ${body.vmId}`);

    // Check if container exists
    const exists = await containerExists(body.vmId);
    if (!exists) {
      return c.json({
        error: "VM not found",
        details: `Container ${body.vmId} does not exist`,
      }, 404);
    }

    const startResult = await runCommand("docker", ["start", body.vmId]);

    if (startResult.code !== 0) {
      console.error(`[ERROR] Docker start failed`);
      console.error(`[ERROR] Start stderr: ${startResult.stderr}`);
      console.error(`[ERROR] Start stdout: ${startResult.stdout}`);
      return c.json({
        error: "Failed to start VM",
        details: startResult.stderr,
      }, 500);
    }

    return c.json({
      message: "VM started successfully",
    }, 200);
  } catch (error) {
    console.error(`[ERROR] VM start failed: ${error.message}`);
    return c.json({ error: "VM start failed", details: error.message }, 500);
  }
});

// Delete VM
app.post("/delete-vm", async (c) => {
  try {
    const body: VMControlRequest = await c.req.json();
    console.log(`[LOG] Received VM delete request for : ${body.vmId}`);

    // Check if container exists
    const exists = await containerExists(body.vmId);
    if (!exists) {
      return c.json({
        error: "VM not found",
        details: `Container ${body.vmId} does not exist`,
      }, 404);
    }

    const deleteResult = await runCommand("docker", ["rm", "-f", body.vmId]);

    if (deleteResult.code !== 0) {
      console.error(`[ERROR] Docker delete failed`);
      console.error(`[ERROR] Delete stderr: ${deleteResult.stderr}`);
      console.error(`[ERROR] Delete stdout: ${deleteResult.stdout}`);
      return c.json({
        error: "Failed to delete VM",
        details: deleteResult.stderr,
      }, 500);
    }

    return c.json({
      message: "VM deleted successfully",
    }, 200);
  } catch (error) {
    console.error(`[ERROR] VM delete failed: ${error.message}`);
    return c.json({ error: "VM delete failed", details: error.message }, 500);
  }
});

// Configurations for different app types
interface AppConfig {
  image: string;
  containerPort: number;
  requiresDB?: boolean;
  dbImage?: string;
  envVars?: Record<string, string>;
  volumes?: string[];
  dbEnvVars?: Record<string, string>;
  main: {
    cpu: number;
    memory: string;
  };
  database?: {
    cpu: number;
    memory: string;
  };
}

const APP_CONFIGS: Record<string, AppConfig> = {
  odoo: {
    image: "odoo:16",
    containerPort: 8069,
    requiresDB: true,
    dbImage: "postgres:13",
    envVars: {
      HOST: "db",
      USER: "odoo",
      PASSWORD: "myodoo",
      DB_HOST: "db",
      DB_PORT: "5432",
      DB_USER: "odoo",
      DB_PASSWORD: "myodoo",
      DB_NAME: "postgres",
    },
    dbEnvVars: {
      POSTGRES_DB: "postgres",
      POSTGRES_PASSWORD: "myodoo",
      POSTGRES_USER: "odoo",
    },
    main: {
      cpu: 1,
      memory: "1g",
    },
  },
  wordpress: {
    image: "wordpress:latest",
    containerPort: 80,
    requiresDB: true,
    dbImage: "mysql:5.7",
    envVars: {
      WORDPRESS_DB_HOST: "db",
      WORDPRESS_DB_USER: "wordpress",
      WORDPRESS_DB_PASSWORD: "wordpress",
      WORDPRESS_DB_NAME: "wordpress",
      WORDPRESS_TABLE_PREFIX: "wp_",
    },
    dbEnvVars: {
      MYSQL_DATABASE: "wordpress",
      MYSQL_USER: "wordpress",
      MYSQL_PASSWORD: "wordpress",
      MYSQL_ROOT_PASSWORD: "somewordpress",
      MYSQL_INITDB_SKIP_TZINFO: "1", // Speed up initialization
    },
    main: {
      cpu: 1,
      memory: "512m",
    },
    database: {
      cpu: 1,
      memory: "512m",
    },
  },
  libreoffice: {
    image: "collabora/code:latest",
    containerPort: 9980,
    envVars: {
      "domain": "localhost",
      "username": "admin",
      "password": "S3cret",
      "extra_params": "--o:ssl.enable=false",
      "DONT_GEN_SSL_CERT": "1",
    },
    volumes: [
      "/opt/cool/systemplate:/opt/cool/systemplate",
      "/opt/cool/child-roots:/opt/cool/child-roots",
    ],
    main: {
      cpu: 1,
      memory: "512m",
    },
  },
  nextcloud: {
    image: "nextcloud:latest",
    containerPort: 80,
    requiresDB: true,
    dbImage: "mariadb:10.6",
    envVars: {
      MYSQL_HOST: "db",
      MYSQL_DATABASE: "nextcloud",
      MYSQL_USER: "nextcloud",
      MYSQL_PASSWORD: "nextcloud",
      NEXTCLOUD_ADMIN_USER: "admin",
      NEXTCLOUD_ADMIN_PASSWORD: "admin123",
      NEXTCLOUD_TRUSTED_DOMAINS: "*",
    },
    dbEnvVars: {
      MYSQL_ROOT_PASSWORD: "nextcloud_root",
      MYSQL_DATABASE: "nextcloud",
      MYSQL_USER: "nextcloud",
      MYSQL_PASSWORD: "nextcloud",
    },
    main: {
      cpu: 1,
      memory: "1g",
    },
  },
} as const;

// Create AppDeployment function
async function createAppDeployment(
  deploymentId: string,
  appType: string,
  networkName: string,
  config: AppConfig,
): Promise<{ containers: any[] }> {
  try {
    console.log(`[LOG] Creating deployment ${deploymentId}`);

    // Create network
    const networkResult = await runCommand("docker", [
      "network",
      "create",
      networkName,
    ]);

    if (networkResult.code !== 0) {
      throw new Error(`Failed to create network: ${networkResult.stderr}`);
    }

    const containers: any[] = [];

    // Start database container if needed
    if (config.requiresDB && config.dbImage) {
      const dbContainerId = `${deploymentId}-db`;
      console.log(`[LOG] Starting database container ${dbContainerId}`);

      const dbResult = await runCommand("docker", [
        "run",
        "-d",
        "--network",
        networkName,
        "--network-alias",
        "db",
        "--name",
        dbContainerId,
        ...Object.entries(config.dbEnvVars || {}).flatMap((
          [k, v],
        ) => ["-e", `${k}=${v}`]),
        `--cpus=${config.database?.cpu || 1}`,
        `--memory=${config.database?.memory || "512m"}`,
        config.dbImage,
      ]);

      if (dbResult.code !== 0) {
        throw new Error(
          `Failed to start database container: ${dbResult.stderr}`,
        );
      }

      containers.push({
        id: dbContainerId,
        type: "database",
        port: null,
      });
    }

    // Start main application container
    const mainContainerId = `${deploymentId}-main`;
    const mainPort = await findFreePort(
      PORT_RANGES[appType].start,
      PORT_RANGES[appType].end,
    );

    console.log(
      `[LOG] Starting main container ${mainContainerId} on port ${mainPort}`,
    );

    const mainResult = await runCommand("docker", [
      "run",
      "-d",
      "--network",
      networkName,
      "--name",
      mainContainerId,
      ...Object.entries(config.envVars || {}).flatMap((
        [k, v],
      ) => ["-e", `${k}=${v}`]),
      "-p",
      `${mainPort}:${config.containerPort}`,
      `--cpus=${config.main.cpu}`,
      `--memory=${config.main.memory}`,
      config.image,
    ]);

    if (mainResult.code !== 0) {
      throw new Error(`Failed to start main container: ${mainResult.stderr}`);
    }

    containers.push({
      id: mainContainerId,
      type: "main",
      port: mainPort,
    });

    return { containers };
  } catch (error) {
    console.error(`[ERROR] Deployment failed: ${error.message}`);
    await cleanupDeployment(deploymentId, networkName);
    throw error;
  }
}

// Create App Deployment with it other releated containers
app.post("/create-app", async (c) => {
  try {
    const body: AppRequest = await c.req.json();
    const { type, deploymentId } = body;

    console.log(
      `[LOG] Creating application of type ${type} with ID ${deploymentId}`,
    );

    const config = APP_CONFIGS[type];
    if (!config) {
      return c.json({ error: "Unsupported app type" }, 400);
    }

    const networkName = `${deploymentId}-network`;

    // Create the deployment
    const result = await createAppDeployment(
      deploymentId,
      type,
      networkName,
      config,
    );

    return c.json({
      deploymentId,
      networkName,
      containers: result.containers,
    });
  } catch (error) {
    console.error(`[ERROR] Create-app failed: ${error.message}`);
    return c.json({
      error: "Failed to create application",
      details: error.message,
    }, 500);
  }
});

// Start Deployment containers
app.post("/start-deployment", async (c) => {
  try {
    const { deploymentId } = await c.req.json();

    // Check if network exists
    const networkExists = await checkDeploymentNetwork(deploymentId);
    if (!networkExists) {
      return c.json({
        error: "Deployment network not found",
        details: `Network ${deploymentId}-network does not exist`,
      }, 404);
    }

    // Get containers and verify they exist
    let containers;
    try {
      containers = await getDeploymentContainers(deploymentId);
    } catch (error) {
      return c.json({
        error: "Deployment not found",
        details: error.message,
      }, 404);
    }

    // Start containers in correct order (database first)
    for (const container of containers) {
      const startResult = await runCommand("docker", ["start", container.id]);
      if (startResult.code !== 0) {
        return c.json({
          error: "Failed to start container",
          details: `Failed to start ${container.id}: ${startResult.stderr}`,
        }, 500);
      }
      console.log(`[LOG] Started container ${container.id}`);
    }

    return c.json({
      status: "started",
      deploymentId,
      containers: containers.map((c) => ({
        id: c.id,
        type: c.type,
        status: "running",
      })),
    });
  } catch (error) {
    return c.json({
      error: "Failed to start deployment",
      details: error.message,
    }, 500);
  }
});

// Stop Deployment containers
app.post("/stop-deployment", async (c) => {
  try {
    const { deploymentId } = await c.req.json();

    let containers;
    try {
      containers = await getDeploymentContainers(deploymentId);
    } catch (error) {
      return c.json({
        error: "Deployment not found",
        details: error.message,
      }, 404);
    }

    // Stop in reverse order (main container first, then dependencies)
    for (const container of containers.reverse()) {
      const stopResult = await runCommand("docker", ["stop", container.id]);
      if (stopResult.code !== 0) {
        return c.json({
          error: "Failed to stop container",
          details: `Failed to stop ${container.id}: ${stopResult.stderr}`,
        }, 500);
      }
      console.log(`[LOG] Stopped container ${container.id}`);
    }

    return c.json({
      status: "stopped",
      deploymentId,
      containers: containers.map((c) => ({
        id: c.id,
        type: c.type,
        status: "stopped",
      })),
    });
  } catch (error) {
    return c.json({
      error: "Failed to stop deployment",
      details: error.message,
    }, 500);
  }
});

// Delete Deployment containers
app.post("/delete-deployment", async (c) => {
  try {
    const { deploymentId } = await c.req.json();
    const networkName = `${deploymentId}-network`;

    let containers;
    try {
      containers = await getDeploymentContainers(deploymentId);
    } catch (error) {
      // If no containers found, just try to remove network
      await runCommand("docker", ["network", "rm", networkName]).catch(
        () => {},
      );
      return c.json({
        error: "Deployment not found",
        details: error.message,
      }, 404);
    }

    // Stop and remove containers
    for (const container of containers) {
      await runCommand("docker", ["stop", container.id]).catch(() => {});
      await runCommand("docker", ["rm", container.id]).catch(() => {});
      console.log(`[LOG] Removed container ${container.id}`);
    }

    // Remove network
    await runCommand("docker", ["network", "rm", networkName]).catch(() => {});
    console.log(`[LOG] Removed network ${networkName}`);

    return c.json({
      status: "deleted",
      deploymentId,
      details: "Deployment and all associated resources have been removed",
    });
  } catch (error) {
    return c.json({
      error: "Failed to delete deployment",
      details: error.message,
    }, 500);
  }
});

// Helper function for deployment cleanup
async function cleanupDeployment(
  deploymentId: string,
  networkName: string,
): Promise<void> {
  const containers = await getDeploymentContainers(deploymentId);

  // Stop and remove containers
  for (const container of containers) {
    await runCommand("docker", ["stop", container.id]).catch(() => {});
    await runCommand("docker", ["rm", container.id]).catch(() => {});
  }

  // Remove network
  await runCommand("docker", ["network", "rm", networkName]).catch(() => {});
}

// Cleanup unused networks
async function cleanupNetworks() {
  try {
    const result = await runCommand("docker", ["network", "prune", "-f"]);
    if (result.code === 0) {
      console.log("[LOG] Successfully cleaned up unused networks");
    }
  } catch (error) {
    console.error("[ERROR] Network cleanup failed:", error.message);
  }
}

// Cleanup Unused Resources
export async function cleanupUnusedResources() {
  try {
    console.log("[LOG] Starting cleanup of unused resources");

    // Remove stopped containers older than 24h
    const containerPrune = await runCommand("docker", [
      "container",
      "prune",
      "-f",
      "--filter",
      "until=24h",
    ]);

    if (containerPrune.code === 0) {
      console.log("[LOG] Successfully cleaned up old containers");
    }

    // Remove unused images
    const imagePrune = await runCommand("docker", [
      "image",
      "prune",
      "-f",
    ]);

    if (imagePrune.code === 0) {
      console.log("[LOG] Successfully cleaned up unused images");
    }

    await cleanupNetworks();
  } catch (error) {
    console.error("[ERROR] Cleanup failed:", error.message);
  }
}

// Add this function near the other helper functions
async function getDeploymentContainers(
  deploymentId: string,
): Promise<Array<{ id: string; type: string }>> {
  try {
    // First check if any containers exist with this deployment ID
    const ps = await runCommand("docker", [
      "ps",
      "-a",
      "--filter",
      `name=${deploymentId}`,
      "--format",
      "{{.Names}}",
    ]);

    if (ps.code !== 0) {
      throw new Error(`Failed to list containers: ${ps.stderr}`);
    }

    const containerNames = ps.stdout.trim().split("\n").filter((name) => name);

    if (containerNames.length === 0) {
      throw new Error(`No containers found for deployment: ${deploymentId}`);
    }

    // Verify each container actually exists
    const containers = [];
    for (const name of containerNames) {
      const inspect = await runCommand("docker", ["inspect", name]);
      if (inspect.code !== 0) {
        console.error(`[ERROR] Container ${name} not found`);
        continue;
      }

      containers.push({
        id: name,
        type: name.endsWith("-db") ? "database" : "main",
      });
    }

    if (containers.length === 0) {
      throw new Error(
        `No valid containers found for deployment: ${deploymentId}`,
      );
    }

    // Sort containers so database is handled appropriately
    return containers.sort((a, b) => {
      if (a.type === "database") return -1;
      if (b.type === "database") return 1;
      return 0;
    });
  } catch (error) {
    console.error(
      `[ERROR] Failed to get deployment containers: ${error.message}`,
    );
    throw error;
  }
}

// Also check if network exists
async function checkDeploymentNetwork(deploymentId: string): Promise<boolean> {
  const networkName = `${deploymentId}-network`;
  const result = await runCommand("docker", [
    "network",
    "inspect",
    networkName,
  ]);
  return result.code === 0;
}
