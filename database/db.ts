import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import { 
  providers as providersSchema, 
  developerVms as vmSchema, 
  providerResources as ProviderResourcesSchema, 
  appDeployments as appDeploymentsSchema,
  deploymentContainers as deploymentContainersSchema
} from "../drizzle/schema.ts";  

class Database {
  private static instance: Database;
  private db: ReturnType<typeof drizzle>;

  private constructor() {
    const pool = new Pool({
      connectionString: Deno.env.get("DATABASE_URL"),
    });

    this.db = drizzle(pool, {
        schema: { providersSchema, vmSchema, appDeploymentsSchema, ProviderResourcesSchema, deploymentContainersSchema },
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getConnection() {
    return this.db;
  }
}

export const db = Database.getInstance().getConnection();
