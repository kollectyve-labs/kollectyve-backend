import type { HealthStat, Provider, UserData } from "./models.ts";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
} from "@firebase/auth";
import { FirebaseError, initializeApp } from "@firebase/app";
import "jsr:@std/dotenv/load";
import {
  KV_PROV_HIST_KEY,
  KV_PROVIDERS_KEY,
  KV_USERS_KEY,
  KV_WALLET_KEY,
} from "./constants.ts";
import { ProviderData } from "../utils/models.ts";


const kv = await Deno.openKv();

const firebaseConfig = {
  apiKey: Deno.env.get("FB_API_KEY"),
  authDomain: Deno.env.get("FB_AUTH_DOMAIN"),
  projectId: Deno.env.get("FB_PROJECT_ID"),
  appId: Deno.env.get("FB_APP_ID"),
};

const firebaseApp = initializeApp(firebaseConfig);

export const fbAuth = getAuth(firebaseApp);

// Register a User
export async function registerUser(
  email: string,
  password: string,
) {
  const userCredential = await createUserWithEmailAndPassword(
    fbAuth,
    email,
    password,
  );
  await sendEmailVerification(userCredential.user);
  return userCredential.user.uid;
}

// Set User data
export async function setUserData(
  email: string,
  userData: UserData,
): Promise<boolean> {
  const resp = await kv.set([KV_USERS_KEY, email], userData);
  return resp.ok;
}

// Get User data
export async function getUserData(email: string) {
  const res = await kv.get([KV_USERS_KEY, email]);
  return res;
}

export async function checkWallet(walletAddress: string) {
  return await kv.get([KV_WALLET_KEY, walletAddress]);
}

export async function setWallet(walletAddress: string, email: string) {
  return await kv.set([KV_WALLET_KEY, walletAddress], email);
}


export async function updateProvider(email: string, updates: Partial<ProviderData>) {
  const providerKey = [KV_USERS_KEY, email];

  // Fetch the existing provider data
  const existingEntry = await kv.get<ProviderData>(providerKey);

  if (!existingEntry.value) {
    throw new Error("Provider not found");
  }

  // Merge updates with existing provider data
  const updatedProvider: ProviderData = {
    ...existingEntry.value, // Keep existing fields
    ...updates, // Apply new updates
  };

  // Save the updated provider data
  const resp = await kv.set(providerKey, updatedProvider);
  return resp.ok;
}

// Delete a provider
export async function deleteProvider(address: string) {
  //TODO
}

// List all providers
export async function getProvider(address: string) {
  //TODO: return an object containing the address field
  return "TestProvider";
}

// Get Provider By Email
export async function getProviderByEmail(email: string): Promise<UserData> {
  const providers = [ KV_USERS_KEY, email];
  const resp = await kv.get<UserData>(providers);
  return resp.value;
}


// List all providers
export async function getProviders() {
  // TODO
}

// List all providers
export async function getActiveProviders(): Promise<[]> {
  // TODO
    return []
}

// Store health stats in provider's history array
export async function storeHealthstats(stats: HealthStat) {
  const historyKey = [KV_PROV_HIST_KEY, stats.address];

  // Get current history first
  const currentResp = await kv.get<HealthStat[]>(historyKey);
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

// Store Provider Ip Address
export async function storeIpAddress(address: string, ipAddress: string) {
  // TODO
}

// Get all historical health stats for a provider
export async function getProviderHealthHistory(address: string) {
  const historyKey = ["provider_healthstats_history", address];
  const resp = await kv.get<HealthStat[]>(historyKey);
  return resp.value ?? [];
}


export async function pickProvider(){
  // TODO
  // Retrieve the list of active providers
  const activeProviders = await getActiveProviders();
  // Pass the list to the a provider slection Algorithm
  const providerData = providerSelection(activeProviders);
  return providerData;

}

function providerSelection(providerList: []): {} {
  return {}
}