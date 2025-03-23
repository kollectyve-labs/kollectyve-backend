import { providers as providersSchema } from "../../drizzle/schema.ts";  
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db.ts";
import { providers, providerResources, appDeployments, developerVms } from "../../drizzle/schema.ts";

const MODE: keyof typeof CONFIG = Deno.env.get("KUMULUS_MODE") === "production" ? "production" : "test";


// Configuration for different environments
interface ProviderConfig {
  baseUrl: string;
  developerId: string;
  providerResourceId: string;
}

const CONFIG = {
  test: {
    baseUrl: "http://localhost:8800",
    developerId: "42115ec2-376a-489c-8300-94984aba72fa",
    providerResourceId: "a6ae7e2f-e89a-4477-b3ac-ea4607c4599f"
  },
  production: {
    developerId: "42115ec2-376a-489c-8300-94984aba72fa"
  }
} as const;


export interface SelectedProvider {
  id: string;
  resourceId: string;
  ip: string;
}


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

// Modified provider selection function
export async function selectProvider(): Promise<SelectedProvider> {
  if (MODE === "test") {
    return {
      id: CONFIG.test.providerResourceId,
      resourceId: CONFIG.test.providerResourceId,
      ip: CONFIG.test.baseUrl
    };
  }

  // Your existing provider selection logic for production
  try {
    const provider = await db
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
      .where(eq(providers.isActive, true))
      .groupBy(providers.id, providerResources.id)
      .orderBy(sql`${providers.score} DESC`)
      .execute();

    const selectedProvider = provider.find(p => p.deploymentCount < 5);
    
    if (!selectedProvider) {
      throw new Error("No providers available with capacity");
    }

    return {
      id: selectedProvider.providerId,
      resourceId: selectedProvider.resourceId,
      ip: `http://${selectedProvider.ipAddress}`
    };
  } catch (error) {
    if (MODE === "test") {
      // Fallback to test config if production fails
      console.warn("[WARN] Production provider selection failed, falling back to test mode");
      return {
        id: CONFIG.test.providerResourceId,
        resourceId: CONFIG.test.providerResourceId,
        ip: CONFIG.test.baseUrl
      };
    }
    throw error;
  }
}

// Helper function to get developer ID consistently
export function getCurrentDeveloperId(): string {
  return CONFIG[MODE].developerId;
}