import { Hono } from "@hono/hono";

export const app = new Hono();

interface VMRequest {
    username: string;
    sshKey: string;
    cpu: number;
    memory: string;
    disk: string;
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
    nextcloud: { start: 7000, end: 7100 }
} as const;


async function findFreePort(startPort: number, endPort: number): Promise<number> {
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
    FROM ubuntu:jammy
    
    # Install necessary packages
    RUN apt-get update && apt-get install -y openssh-server sudo
    
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


interface VMRequest {
    username: string;
    sshKey: string;
    cpu: number; // in cores (e.g., 1, 2)
    memory: string; // e.g., 512m, 1g
    disk: string; 
}

interface AppRequest {
    type: "odoo" | "wordpress" | "libreoffice" | "nextcloud";
    cpu: number;
    memory: string;
}

interface ContainerControlRequest {
    id: string;
}

app.get("/", (c) => c.text("Provision Agent Running !"));


app.post("/create-vm", async (c) => {
    try {
        const body: VMRequest = await c.req.json();
        console.log(
            `[LOG] Received VM creation request for user: ${body.username}`,
        );

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
            `--cpus=${body.cpu}`,
            `--memory=${body.memory}`,
            `-p`,
            `0.0.0.0:${sshPort}:22`, // This binds to all interfaces
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


// Define configurations for different app types
interface AppConfig {
    image: string;
    containerPort: number;
    requiresDB?: boolean;
    dbImage?: string;
    envVars?: Record<string, string>;
    volumes?: string[];
    dbEnvVars?: Record<string, string>;
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
            DB_NAME: "postgres"
        },
        dbEnvVars: {
            POSTGRES_DB: "postgres",
            POSTGRES_PASSWORD: "myodoo",
            POSTGRES_USER: "odoo"
        }
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
            WORDPRESS_DB_NAME: "wordpress"
        },
        dbEnvVars: {
            MYSQL_DATABASE: "wordpress",
            MYSQL_USER: "wordpress",
            MYSQL_PASSWORD: "wordpress",
            MYSQL_ROOT_PASSWORD: "somewordpress"
        }
    },
    libreoffice: {
        image: "collabora/code:latest",
        containerPort: 9980,
        envVars: {
            "domain": "localhost",
            "username": "admin",
            "password": "S3cret",
            "extra_params": "--o:ssl.enable=false",
            "DONT_GEN_SSL_CERT": "1"
        },
        volumes: [
            "/opt/cool/systemplate:/opt/cool/systemplate",
            "/opt/cool/child-roots:/opt/cool/child-roots"
        ]
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
            NEXTCLOUD_TRUSTED_DOMAINS: "*"
        },
        dbEnvVars: {
            MYSQL_ROOT_PASSWORD: "nextcloud_root",
            MYSQL_DATABASE: "nextcloud",
            MYSQL_USER: "nextcloud",
            MYSQL_PASSWORD: "nextcloud"
        }
    }
} as const;

async function createAppWithDB(
    appId: string,
    networkName: string,
    config: AppConfig,
    hostPort: number,
    resources: { cpu: number; memory: string }
): Promise<void> {
    // Create network
    await runCommand("docker", ["network", "create", networkName]);

    // Start DB container
    if (config.requiresDB && config.dbImage) {
        const dbContainerId = `${appId}-db`;
        await runCommand("docker", [
            "run", "-d",
            "--network", networkName,
            "--network-alias", "db",
            "--name", dbContainerId,
            ...Object.entries(config.dbEnvVars || {}).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
            config.dbImage
        ]);

        // Wait for database initialization
        await new Promise(resolve => setTimeout(resolve, 15000));
    }

    // Start app container
    const appArgs = [
        "run", "-d",
        "--network", networkName,
        `--cpus=${resources.cpu}`,
        `--memory=${resources.memory}`,
        "-p", `${hostPort}:${config.containerPort}`,
        "--name", appId,
    ];

    // Add environment variables
    if (config.envVars) {
        Object.entries(config.envVars).forEach(([key, value]) => {
            appArgs.push("-e", `${key}=${value}`);
        });
    }

    appArgs.push(config.image);
    await runCommand("docker", appArgs);
}

// Updated create-app endpoint
app.post("/create-app", async (c) => {
    try {
        const body: AppRequest = await c.req.json();
        const { type, cpu, memory } = body;

        // Validate required parameters
        if (!type || !cpu || !memory) {
            return c.json({ 
                error: "Missing required parameters", 
                details: "type, cpu, and memory are required" 
            }, 400);
        }

        const config = APP_CONFIGS[type];
        if (!config) {
            return c.json({ error: "Unsupported app type" }, 400);
        }

        const appId = `${type}-${crypto.randomUUID()}`;
        const networkName = `${appId}-network`;

        // Find an available port
        const hostPort = await findFreePort(
            PORT_RANGES[type].start,
            PORT_RANGES[type].end
        ).catch(error => {
            console.error(`[ERROR] Failed to find free port: ${error.message}`);
            throw new Error(`No available ports for ${type} container`);
        });

        try {
            await createAppWithDB(appId, networkName, config, hostPort, { cpu, memory });

            return c.json({ 
                id: appId, 
                type, 
                status: "running",
                port: hostPort,
                networkName
            });
        } catch (error) {
            // Cleanup on failure
            await runCommand("docker", ["network", "rm", networkName]).catch(() => {});
            await runCommand("docker", ["rm", "-f", appId]).catch(() => {});
            await runCommand("docker", ["rm", "-f", `${appId}-db`]).catch(() => {});
            throw error;
        }
    } catch (error) {
        console.error(`[ERROR] Create app failed: ${error.message}`);
        return c.json({ 
            error: "Failed to create application", 
            details: error.message 
        }, 500);
    }
});

// Start container
app.post("/start-container", async (c) => {
    try {
        const body: ContainerControlRequest = await c.req.json();
        
        if (!body.id) {
            return c.json({ error: "Container ID is required" }, 400);
        }

        const start = await runCommand("docker", ["start", body.id]);

        if (start.code !== 0) {
            console.error(`[ERROR] Failed to start container ${body.id}: ${start.stderr}`);
            return c.json({ error: "Failed to start container", details: start.stderr }, 500);
        }

        return c.json({ id: body.id, status: "started" });
    } catch (error) {
        console.error(`[ERROR] Start container failed: ${error.message}`);
        return c.json({ 
            error: "Failed to start container", 
            details: error.message 
        }, 500);
    }
});

// Stop container
app.post("/stop-container", async (c) => {
    try {
        const body: ContainerControlRequest = await c.req.json();

        if (!body.id) {
            return c.json({ error: "Container ID is required" }, 400);
        }

        const stop = await runCommand("docker", ["stop", body.id]);

        if (stop.code !== 0) {
            console.error(`[ERROR] Failed to stop container ${body.id}: ${stop.stderr}`);
            return c.json({ error: "Failed to stop container", details: stop.stderr }, 500);
        }

        return c.json({ id: body.id, status: "stopped" });
    } catch (error) {
        console.error(`[ERROR] Stop container failed: ${error.message}`);
        return c.json({ 
            error: "Failed to stop container", 
            details: error.message 
        }, 500);
    }
});

// Delete container
app.post("/delete-container", async (c) => {
    try {
        const body: ContainerControlRequest = await c.req.json();

        if (!body.id) {
            return c.json({ error: "Container ID is required" }, 400);
        }

        // Stop first to make sure it's not running
        await runCommand("docker", ["stop", body.id]);
        const rm = await runCommand("docker", ["rm", body.id]);

        if (rm.code !== 0) {
            console.error(`[ERROR] Failed to delete container ${body.id}: ${rm.stderr}`);
            return c.json({ error: "Failed to delete container", details: rm.stderr }, 500);
        }

        return c.json({ id: body.id, status: "deleted" });
    } catch (error) {
        console.error(`[ERROR] Delete container failed: ${error.message}`);
        return c.json({ 
            error: "Failed to delete container", 
            details: error.message 
        }, 500);
    }
});

// List containers
app.get("/containers", async (c) => {
    try {
        const ps = await runCommand("docker", ["ps", "-a", "--format", "{{json .}}"]);

        if (ps.code !== 0) {
            console.error(`[ERROR] Failed to list containers: ${ps.stderr}`);
            return c.json({ error: "Failed to list containers", details: ps.stderr }, 500);
        }

        const containers = ps.stdout.trim().split('\n')
            .filter(line => line) // Handle empty lines
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.error(`[ERROR] Failed to parse container data: ${e.message}`);
                    return null;
                }
            })
            .filter(container => container !== null);

        return c.json({ containers });
    } catch (error) {
        console.error(`[ERROR] List containers failed: ${error.message}`);
        return c.json({ 
            error: "Failed to list containers", 
            details: error.message 
        }, 500);
    }
});

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
            "container", "prune", 
            "-f", 
            "--filter", "until=24h"
        ]);
        
        if (containerPrune.code === 0) {
            console.log("[LOG] Successfully cleaned up old containers");
        }

        // Remove unused images
        const imagePrune = await runCommand("docker", [
            "image", "prune",
            "-f"
        ]);

        if (imagePrune.code === 0) {
            console.log("[LOG] Successfully cleaned up unused images");
        }

        await cleanupNetworks();
    } catch (error) {
        console.error("[ERROR] Cleanup failed:", error.message);
    }
}


