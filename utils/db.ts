import { HealthStatEntity, ProviderEntity } from "./entities.ts";

export const kv = await Deno.openKv();

// Create a provider
export async function createProvider(provider: ProviderEntity) {
  const providerKey = ["providers", provider.address];
  const resp = await kv.set(providerKey, provider);
  if (!resp.ok) throw new Error(`Failed to create provider: ${provider}`);
}

// Get a provider
export async function getProvider(address: string) {
  const providerKey = ["providers", address];
  const resp = await kv.get<ProviderEntity>(providerKey);
  return resp.value;
}

// Update a provider
export async function updateProvider(provider: ProviderEntity) {
  const providerKey = ["providers", provider.address];
  const resp = await kv.set(providerKey, provider);
  if (!resp.ok) throw new Error(`Failed to update provider: ${provider}`);
}

// Delete a provider
export async function deleteProvider(address: string) {
  const providerKey = ["providers", address];
  await kv.delete(providerKey);
}

// List all providers
export async function getProviders() {
  const iter = kv.list<ProviderEntity>({ prefix: ["providers"] });
  const providers = [];
  for await (const { value } of iter) {
    providers.push(value);
  }
  return providers;
}

// Store health stats in provider's history array
export async function storeHealthstats(stats: HealthStatEntity) {
  const historyKey = ["provider_healthstats_history", stats.address];

  // Get current history first
  const currentResp = await kv.get<HealthStatEntity[]>(historyKey);
  const currentHistory = currentResp.value ?? [];
  const newHistory = [...currentHistory, stats];

  // Use atomic operation to ensure consistency
  const resp = await kv.atomic()
    .check(currentResp) // Pass the full response for consistency check
    .set(historyKey, newHistory)
    .commit();

  if (!resp.ok) {
    throw new Error(`Failed to store health stats history: ${stats}`);
  }
}

// Get all historical health stats for a provider
export async function getProviderHealthHistory(address: string) {
  const historyKey = ["provider_healthstats_history", address];
  const resp = await kv.get<HealthStatEntity[]>(historyKey);
  return resp.value ?? [];
}
