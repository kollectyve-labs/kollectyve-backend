import {
  developers as developersSchema
} from "../drizzle/schema.ts";

import { eq } from "drizzle-orm/expressions";

import { db } from "./db.ts";

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