import {
  bigint,
  boolean,
  foreignKey,
  index,
  inet,
  integer,
  json,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  pgView,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appType = pgEnum("app_type", [
  "odoo",
  "wordpress",
  "libreoffice",
  "nextcloud",
]);
export const containerType = pgEnum("container_type", [
  "main",
  "database",
  "cache",
  "proxy",
]);
export const deploymentStatus = pgEnum("deployment_status", [
  "creating",
  "running",
  "stopped",
  "failed",
  "deleted",
]);

export const providers = pgTable("providers", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  email: varchar({ length: 150 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 200 }).notNull(),
  isActive: boolean("is_active").default(false),
  score: integer().default(50),
  lastLeaseAt: timestamp("last_lease_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("providers_email_key").on(table.email),
  unique("providers_wallet_address_key").on(table.walletAddress),
]);

export const providerResources = pgTable("provider_resources", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  providerId: uuid("provider_id").notNull(),
  ipAddress: inet("ip_address").notNull(),
  cpuCores: integer("cpu_cores").notNull(),
  ram: integer().notNull(),
  storage: integer().notNull(),
  bandwidth: integer().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.providerId],
    foreignColumns: [providers.id],
    name: "provider_resources_provider_id_fkey",
  }).onDelete("cascade"),
]);

export const healthChecks = pgTable("health_checks", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  providerId: uuid("provider_id").notNull(),
  cpuUsage: numeric("cpu_usage", { precision: 5, scale: 2 }).notNull(),
  memoryFree: varchar("memory_free", { length: 50 }).notNull(),
  diskFree: varchar("disk_free", { length: 50 }).notNull(),
  dockerStatus: varchar("docker_status", { length: 50 }).notNull(),
  runningContainers: integer("running_containers").notNull(),
  unhealthyContainers: integer("unhealthy_containers").notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  timestampUnix: bigint("timestamp_unix", { mode: "number" }).notNull(),
  timestampHuman: timestamp("timestamp_human", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.providerId],
    foreignColumns: [providers.id],
    name: "health_checks_provider_id_fkey",
  }).onDelete("cascade"),
]);

export const developers = pgTable("developers", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  email: varchar({ length: 150 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  unique("developers_email_key").on(table.email),
  unique("developers_wallet_address_key").on(table.walletAddress),
]);

export const developerVms = pgTable("developer_vms", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  developerId: uuid("developer_id").notNull(),
  providerResourceId: uuid("provider_resource_id").notNull(),
  containerId: varchar("container_id", { length: 200 }).notNull(),
  ram: integer().notNull(),
  cpuCores: integer("cpu_cores").notNull(),
  storage: integer().notNull(),
  status: varchar({ length: 50 }).default("running").notNull(),
  sshPublicKey: text("ssh_public_key").notNull(),
  sshPort: integer("ssh_port").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.developerId],
    foreignColumns: [developers.id],
    name: "developer_vms_developer_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.providerResourceId],
    foreignColumns: [providerResources.id],
    name: "developer_vms_provider_resource_id_fkey",
  }).onDelete("cascade"),
  unique("developer_vms_container_id_key").on(table.containerId),
]);

export const appDeployments = pgTable("app_deployments", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  developerId: uuid("developer_id").notNull(),
  providerResourceId: uuid("provider_resource_id").notNull(),
  appType: appType("app_type").notNull(),
  networkName: varchar("network_name", { length: 100 }).notNull(),
  status: deploymentStatus().default("creating").notNull(),
  totalCpu: integer("total_cpu").notNull(),
  totalMemory: integer("total_memory").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_deployment_developer").using(
    "btree",
    table.developerId.asc().nullsLast().op("uuid_ops"),
  ),
  index("idx_deployment_provider").using(
    "btree",
    table.providerResourceId.asc().nullsLast().op("uuid_ops"),
  ),
  index("idx_deployment_status").using(
    "btree",
    table.status.asc().nullsLast().op("enum_ops"),
  ),
  foreignKey({
    columns: [table.developerId],
    foreignColumns: [developers.id],
    name: "app_deployments_developer_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.providerResourceId],
    foreignColumns: [providerResources.id],
    name: "app_deployments_provider_resource_id_fkey",
  }),
]);

export const deploymentContainers = pgTable("deployment_containers", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  deploymentId: uuid("deployment_id").notNull(),
  containerId: varchar("container_id", { length: 200 }).notNull(),
  containerType: containerType("container_type").notNull(),
  name: varchar({ length: 100 }).notNull(),
  image: varchar({ length: 200 }).notNull(),
  cpuCores: integer("cpu_cores").notNull(),
  ram: integer().notNull(),
  storage: integer().notNull(),
  port: integer(),
  internalPort: integer("internal_port"),
  status: varchar({ length: 50 }).default("creating").notNull(),
  environmentVars: jsonb("environment_vars"),
  volumes: jsonb(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("idx_container_deployment").using(
    "btree",
    table.deploymentId.asc().nullsLast().op("uuid_ops"),
  ),
  index("idx_container_status").using(
    "btree",
    table.status.asc().nullsLast().op("text_ops"),
  ),
  foreignKey({
    columns: [table.deploymentId],
    foreignColumns: [appDeployments.id],
    name: "deployment_containers_deployment_id_fkey",
  }).onDelete("cascade"),
  unique("deployment_containers_container_id_key").on(table.containerId),
]);
export const deploymentOverview = pgView("deployment_overview", {
  deploymentId: uuid("deployment_id"),
  appType: appType("app_type"),
  deploymentStatus: deploymentStatus("deployment_status"),
  networkName: varchar("network_name", { length: 100 }),
  totalCpu: integer("total_cpu"),
  totalMemory: integer("total_memory"),
  containers: json(),
}).as(
  sql`SELECT d.id AS deployment_id, d.app_type, d.status AS deployment_status, d.network_name, d.total_cpu, d.total_memory, json_agg(json_build_object('container_id', c.container_id, 'container_type', c.container_type, 'status', c.status, 'port', c.port)) AS containers FROM app_deployments d LEFT JOIN deployment_containers c ON d.id = c.deployment_id GROUP BY d.id`,
);
