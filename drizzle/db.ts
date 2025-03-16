import { drizzle } from "drizzle-orm/node-postgres";
import { providers as providersSchema,
  developerContainers as developerContainersSchema, 
  appContainers as appContainersSchema } from "./schema.ts";
import { providersRelations, developerContainersRelations, appContainersRelations } from "./relations.ts";
import { eq, like, desc } from "drizzle-orm/expressions";
import pg from "pg";
import { integer } from "drizzle-orm/pg-core";

const { Pool } = pg;

// Instantiate Drizzle client.
export const db = drizzle({
  client: new Pool({
    connectionString: Deno.env.get("DATABASE_URL"),
  }),
  schema: { providersSchema, developerContainersSchema, appContainersSchema },
});

// PROVIDERS
// Insert Provider.
export async function insertProvider(providerObj: typeof providersSchema) {
  return await db.insert(providersSchema).values(providerObj);
}

// Get Provider by email
export async function getProviderByEmail(email: string) {
  return await db.query.providers.findFirst({
    where: eq(providersSchema.email, email),
  });
}

// Get all Providers
export async function getProviders() {
  return await db.query.providers.findMany();
}

// Get all Active Providers
export async function getActiveProviders() {
  return await db.query.providers.findMany({
    where: eq(providersSchema.isActive, true),
  });
}

// Get Provider by wallet address
export async function getProviderByWalletAddress(walletAddress: string) {
  return await db.query.providers.findFirst({
    where: eq(providersSchema.walletAddress, walletAddress),
  });
}

// Update Provider
export async function updateProvider(providerObj: typeof providersSchema) {
  return await db.update(providersSchema).set(providerObj).where(eq(providersSchema.id, providerObj.id));
}

// Delete Provider
export async function deleteProvider(providerObj: typeof providersSchema) {
  return await db.delete(providersSchema).where(eq(providersSchema.id, providerObj.id));
} 

// DEVELOPER CONTAINERS
// Insert Developer Container
export async function insertDeveloperContainer(developerContainerObj: typeof developerContainersSchema) {
  return await db.insert(developerContainersSchema).values(developerContainerObj);
}

// Get Developer Container by id
export async function getDeveloperContainerById(id: string) {
  return await db.query.developerContainers.findFirst({
    where: eq(developerContainersSchema.id, id),
  });
}

// Get Developer Container by developer id
export async function getDeveloperContainerByDeveloperId(developerId: string) {
  return await db.query.developerContainers.findFirst({
    where: eq(developerContainersSchema.developerId, developerId),
  });
}

// Get Developer Container by provider id
export async function getDeveloperContainerByProviderId(providerId: string) {
  return await db.query.developerContainers.findFirst({
    where: eq(developerContainersSchema.providerId, providerId),
  });
}

// Get all Developer Containers
export async function getDeveloperContainers() {
  return await db.query.developerContainers.findMany();
} 

// APP CONTAINERS
// Insert App Container
export async function insertAppContainer(appContainerObj: typeof appContainersSchema) {
  return await db.insert(appContainersSchema).values(appContainerObj);
} 

// Get App Container by id
export async function getAppContainerById(id: string) {
  return await db.query.appContainers.findFirst({
    where: eq(appContainersSchema.id, id),
  });
}

// Get App Container by developer id
export async function getAppContainerByDeveloperId(developerId: string) {
  return await db.query.appContainers.findFirst({
    where: eq(appContainersSchema.developerId, developerId),
  });
}

// Get App Container by provider id
export async function getAppContainerByProviderId(providerId: string) {
  return await db.query.appContainers.findFirst({
    where: eq(appContainersSchema.providerId, providerId),
  });
}

// Get all App Containers
export async function getAppContainers() {
  return await db.query.appContainers.findMany();
}

// Get all App Containers by provider id
export async function getAppContainersByProviderId(providerId: string) {
  return await db.query.appContainers.findMany({
    where: eq(appContainersSchema.providerId, providerId),
  });
}

// Get provider by best score and last lease time
export async function getProviderByBestScoreAndLastLeaseTime(): Promise<typeof providersSchema | null> {
  return await db.query.providers.findFirst({
    where: eq(providersSchema.isActive, true), 
    orderBy: [desc(providersSchema.score), desc(providersSchema.lastLeaseAt)],
    limit: 1,
  });
}






















