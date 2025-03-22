import {
  providers as providersSchema
} from "../drizzle/schema.ts";
import { eq } from "drizzle-orm/expressions";
import { db } from "./db.ts";


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