import {
    appDeployments as appDeploymentSchema,  
    deploymentContainers as deploymentContainersSchema,
  } from "../../drizzle/schema.ts";
  import { db } from "../db.ts";
  import { eq } from "drizzle-orm/expressions";

  // Insert App Deployment
  export async function insertAppDeployment(appDeploymentObj: typeof appDeploymentSchema) {
    return await db.insert(appDeploymentSchema).values(appDeploymentObj);
  }

  // Get App Deployment by id
  export async function getAppDeploymentById(id: string) {
    return await db.query.appDeployments.findFirst({
      where: eq(appDeploymentSchema.id, id),
    });
  }
  
  // Get all App Deployments by developer id
  export async function getAppDeploymentsByDeveloperId(developerId: string) {
    return await db.query.appDeployments.findMany({
      where: eq(appDeploymentSchema.developerId, developerId),
    });
  }

  // insert deployment containers
  export async function insertDeploymentContainers(deploymentContainersObj: typeof deploymentContainersSchema) {
    return await db.insert(deploymentContainersSchema).values(deploymentContainersObj);
  }

  // get deployment containers by deployment id
  export async function getDeploymentContainersByDeploymentId(deploymentId: string) {
    return await db.query.deploymentContainers.findMany({
      where: eq(deploymentContainersSchema.deploymentId, deploymentId),
    });
  }

  // update deployment containers status
  export async function updateDeploymentContainersStatus(deploymentId: string, status: string) {
    return await db.update(deploymentContainersSchema).set({ status }).where(eq(deploymentContainersSchema.deploymentId, deploymentId));
  }
  