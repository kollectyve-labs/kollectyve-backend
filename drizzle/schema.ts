import { pgTable, unique, uuid, varchar, boolean, integer, timestamp, foreignKey, inet, numeric, bigint, text } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const providers = pgTable("providers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 150 }).notNull(),
	walletAddress: varchar("wallet_address", { length: 200 }).notNull(),
	isActive: boolean("is_active").default(false),
	score: integer().default(50),
	lastLeaseAt: timestamp("last_lease_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
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
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [providers.id],
			name: "provider_resources_provider_id_fkey"
		}).onDelete("cascade"),
]);

export const healthChecks = pgTable("health_checks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	providerId: uuid("provider_id").notNull(),
	cpuUsage: numeric("cpu_usage", { precision: 5, scale:  2 }).notNull(),
	memoryFree: varchar("memory_free", { length: 50 }).notNull(),
	diskFree: varchar("disk_free", { length: 50 }).notNull(),
	dockerStatus: varchar("docker_status", { length: 50 }).notNull(),
	runningContainers: integer("running_containers").notNull(),
	unhealthyContainers: integer("unhealthy_containers").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	timestampUnix: bigint("timestamp_unix", { mode: "number" }).notNull(),
	timestampHuman: timestamp("timestamp_human", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [providers.id],
			name: "health_checks_provider_id_fkey"
		}).onDelete("cascade"),
]);

export const developers = pgTable("developers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 150 }).notNull(),
	walletAddress: varchar("wallet_address", { length: 200 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("developers_email_key").on(table.email),
	unique("developers_wallet_address_key").on(table.walletAddress),
]);

export const developerVms = pgTable("developer_vms", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	developerId: uuid("developer_id").notNull(),
	providerId: uuid("provider_id").notNull(),
	containerId: varchar("container_id", { length: 200 }).notNull(),
	ram: integer().notNull(),
	cpuCores: integer("cpu_cores").notNull(),
	storage: integer().notNull(),
	status: varchar({ length: 50 }).default('running').notNull(),
	sshPublicKey: text("ssh_public_key").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.developerId],
			foreignColumns: [developers.id],
			name: "developer_vms_developer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [providers.id],
			name: "developer_vms_provider_id_fkey"
		}).onDelete("cascade"),
	unique("developer_vms_container_id_key").on(table.containerId),
]);

export const developerAppContainers = pgTable("developer_app_containers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	developerId: uuid("developer_id").notNull(),
	providerId: uuid("provider_id").notNull(),
	containerId: varchar("container_id", { length: 200 }).notNull(),
	appName: varchar("app_name", { length: 100 }).notNull(),
	ram: integer().notNull(),
	cpuCores: integer("cpu_cores").notNull(),
	storage: integer().notNull(),
	status: varchar({ length: 50 }).default('running').notNull(),
	sshPublicKey: text("ssh_public_key"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.developerId],
			foreignColumns: [developers.id],
			name: "developer_app_containers_developer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [providers.id],
			name: "developer_app_containers_provider_id_fkey"
		}).onDelete("cascade"),
	unique("developer_app_containers_container_id_key").on(table.containerId),
]);
