import {
  developerVms as vmSchema,
} from "../../drizzle/schema.ts";
import { db } from "../db.ts";
import { eq } from "drizzle-orm/expressions";

// Insert VM
export async function insertDeveloperVm(vmObj: typeof vmSchema) {
  return await db.insert(vmSchema).values(vmObj);
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

// Get VM by container id
export async function getDeveloperVmByContainerId(containerId: string) {
  return await db.query.vmSchema.findFirst({
    where: eq(vmSchema.containerId, containerId),
  } );
}


