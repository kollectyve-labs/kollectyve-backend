import { providers as providersSchema } from "../../drizzle/schema.ts";  
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db.ts";
import { providers, providerResources, appDeployments, developerVms } from "../../drizzle/schema.ts";


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

// Simple Provider Selection Algorithm based on the score and deployment count
export async function selectProvider() {
  try {
    // Get active providers with their deployment counts
    const providersWithLoad = await db
      .select({
        providerId: providers.id,
        resourceId: providerResources.id,
        ipAddress: providerResources.ipAddress,
        score: providers.score,
        deploymentCount: sql<number>`
          COUNT(DISTINCT CASE WHEN ${appDeployments.status} != 'deleted' THEN ${appDeployments.id} END) +
          COUNT(DISTINCT CASE WHEN ${developerVms.status} != 'deleted' THEN ${developerVms.id} END)
        `.as('deployment_count')
      })
      .from(providers)
      .innerJoin(providerResources, eq(providers.id, providerResources.providerId))
      .leftJoin(appDeployments, eq(providerResources.id, appDeployments.providerResourceId))
      .leftJoin(developerVms, eq(providerResources.id, developerVms.providerResourceId))
      .where(
        and(
          eq(providers.isActive, true)
        )
      )
      .groupBy(providers.id, providerResources.id)
      .orderBy(sql`${providers.score} DESC`)
      .execute();

    // Find the first provider with less than 5 deployments
    const selectedProvider = providersWithLoad.find(p => p.deploymentCount < 5);

    if (!selectedProvider) {
      console.log("[LOG] No providers available with capacity < 5 deployments");
      return null;
    }

    console.log(`[LOG] Selected provider ${selectedProvider.providerId} with ${selectedProvider.deploymentCount} deployments`);

    return {
      id: selectedProvider.providerId,
      resourceId: selectedProvider.resourceId,
      ip: selectedProvider.ipAddress
    };

  } catch (error) {
    console.error("[ERROR] Provider selection failed:", error);
    return null;
  }
}