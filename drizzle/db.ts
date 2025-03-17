import { drizzle } from "drizzle-orm/node-postgres";
import {
  developerAppContainers as AppContainersSchema,
  developers as developersSchema,
  developerVms as vmSchema,
  providers as providersSchema,
  providerResources as ProviderResourcesSchema,
} from "./schema.ts";
import {
  developerAppContainersRelations,
  developerVmsRelations,
  providersRelations,
} from "./relations.ts";
import { desc, eq, like } from "drizzle-orm/expressions";
import pg from "pg";
import { integer } from "drizzle-orm/pg-core";

const { Pool } = pg;

// Instantiate Drizzle client.
export const db = drizzle({
  client: new Pool({
    connectionString: Deno.env.get("DATABASE_URL"),
  }),
  schema: { providersSchema, vmSchema, AppContainersSchema, ProviderResourcesSchema },
});

// PROVIDERS
// Insert Provider.
export async function insertProvider(providerObj: typeof providersSchema) {
  return await db.insert(providersSchema).values(providerObj);
}

// Get all Providers
export async function getProviders() {
  return await db.query.providers.findMany();
}

// Update Provider
export async function updateProvider(providerObj: typeof providersSchema) {
  return await db.update(providersSchema).set(providerObj).where(
    eq(providersSchema.id, providerObj.id),
  );
}

// Delete Provider
export async function deleteProvider(providerObj: typeof providersSchema) {
  return await db.delete(providersSchema).where(
    eq(providersSchema.id, providerObj.id),
  );
}

// Get provider by best score and last lease time
export async function getProviderByBestScoreAndLastLeaseTime() {
  return await db.query.providers.findFirst({
    where: eq(providersSchema.isActive, true),
    orderBy: [desc(providersSchema.score), desc(providersSchema.lastLeaseAt)],
    limit: 1,
  });
}

// DEVELOPERS
// Insert Developer
export async function insertDeveloper(developerObj: typeof developersSchema) {
  return await db.insert(developersSchema).values(developerObj);
}

// Get Developer by wallet address
export async function getDeveloperByWalletAddress(walletAddress: string) {
  return await db.query.developers.findFirst({
    where: eq(developersSchema.walletAddress, walletAddress),
  });
}

// Get developer by id
export async function getDeveloperById(id: string) {
  return await db.query.developers.findFirst({
    where: eq(developersSchema.id, id),
  });
}

// VM
// Insert VM
export async function insertDeveloperVm(vmObj: typeof vmSchema) {
  return await db.insert(vmSchema).values(vmObj);
}

// Get VM by id
export async function getDeveloperVmById(id: string) {
  return await db.query.developerVms.findFirst({
    where: eq(vmSchema.id, id),
  });
}

// Get all VMs by developer id
export async function getDeveloperVmsByDeveloperId(developerId: string) {
  return await db.query.developerVms.findMany({
    where: eq(vmSchema.developerId, developerId),
  });
}

// VM Status Updates
export async function updateVmStatus(containerId: string, status: string) {
  return await db.update(vmSchema)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(vmSchema.containerId, containerId));
}

// App Status Updates
export async function updateAppStatus(containerId: string, status: string) {
  return await db.update(AppContainersSchema)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(AppContainersSchema.containerId, containerId));
}

// Delete VM Record
export async function deleteVmRecord(containerId: string) {
  return await db.delete(vmSchema)
    .where(eq(vmSchema.containerId, containerId));
}

// Delete App Record
export async function deleteAppRecord(containerId: string) {
  return await db.delete(AppContainersSchema)
    .where(eq(AppContainersSchema.containerId, containerId));
}

// Insert App Container
export async function insertAppContainer(appObj: typeof AppContainersSchema) {
  return await db.insert(AppContainersSchema).values(appObj);
}

// Get App Containers by Developer ID
export async function getAppContainersByDeveloperId(developerId: string) {
  return await db.query.developerAppContainers.findMany({
    where: eq(AppContainersSchema.developerId, developerId),
  });
}

// Get Container ip address and port by container id
export async function getContainerIpAddressAndPort(containerId: string) {

     // We need to make a join between AppContainersSchema and providerResourcesSchema
     const result = await db.select({
      ip: ProviderResourcesSchema.ip,
      port: AppContainersSchema.port,
     }).from(AppContainersSchema).leftJoin(ProviderResourcesSchema, eq(AppContainersSchema.providerResourceId, ProviderResourcesSchema.id))
     .where(eq(AppContainersSchema.containerId, containerId));
     return result[0] || null;
}

// Get VM ip address and port by container id
export async function getVmIpAddressAndPort2(containerId: string) {
   
   const result = await db.select({
    ip: ProviderResourcesSchema.ip,
    port: vmSchema.sshPort,
   }).from(vmSchema).leftJoin(ProviderResourcesSchema, eq(vmSchema.providerResourceId, ProviderResourcesSchema.id))
   .where(eq(vmSchema.containerId, containerId));
   return result[0] || { ip: null, port: null };

}

export async function getVmIpAddressAndPort(containerId: string) {
  console.log("[LOG] Schemas loaded:", { 
    vmSchema: !!vmSchema, 
    providerSchema: !!ProviderResourcesSchema 
  });
  
  if (!vmSchema || !ProviderResourcesSchema) {
    throw new Error("Database schemas not properly loaded");
  }
  
  try {
    console.log("[LOG] Querying for containerId:", containerId);
    
    const result = await db
      .select({
        ip: ProviderResourcesSchema.ip,
        port: vmSchema.sshPort,
        status: vmSchema.status,
      })
      .from(vmSchema)
      .leftJoin(
        ProviderResourcesSchema,
        eq(vmSchema.providerResourceId, ProviderResourcesSchema.id)
      )
      .where(eq(vmSchema.containerId, containerId));

    console.log("[LOG] Query result:", result);

    // Return with default values if no result found
    return result[0] || { ip: null, port: null, status: null };
  } catch (error) {
    console.error("[ERROR] Database query failed:", error);
    throw error;
  }
}