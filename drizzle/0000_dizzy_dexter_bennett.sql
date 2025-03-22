-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."app_type" AS ENUM('odoo', 'wordpress', 'libreoffice', 'nextcloud');--> statement-breakpoint
CREATE TYPE "public"."container_type" AS ENUM('main', 'database', 'cache', 'proxy');--> statement-breakpoint
CREATE TYPE "public"."deployment_status" AS ENUM('creating', 'running', 'stopped', 'failed', 'deleted');--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"wallet_address" varchar(200) NOT NULL,
	"is_active" boolean DEFAULT false,
	"score" integer DEFAULT 50,
	"last_lease_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "providers_email_key" UNIQUE("email"),
	CONSTRAINT "providers_wallet_address_key" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "provider_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"ip_address" "inet" NOT NULL,
	"cpu_cores" integer NOT NULL,
	"ram" integer NOT NULL,
	"storage" integer NOT NULL,
	"bandwidth" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"cpu_usage" numeric(5, 2) NOT NULL,
	"memory_free" varchar(50) NOT NULL,
	"disk_free" varchar(50) NOT NULL,
	"docker_status" varchar(50) NOT NULL,
	"running_containers" integer NOT NULL,
	"unhealthy_containers" integer NOT NULL,
	"timestamp_unix" bigint NOT NULL,
	"timestamp_human" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "developers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"wallet_address" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "developers_email_key" UNIQUE("email"),
	CONSTRAINT "developers_wallet_address_key" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "developer_vms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developer_id" uuid NOT NULL,
	"provider_resource_id" uuid NOT NULL,
	"container_id" varchar(200) NOT NULL,
	"ram" integer NOT NULL,
	"cpu_cores" integer NOT NULL,
	"storage" integer NOT NULL,
	"status" varchar(50) DEFAULT 'running' NOT NULL,
	"ssh_public_key" text NOT NULL,
	"ssh_port" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "developer_vms_container_id_key" UNIQUE("container_id")
);
--> statement-breakpoint
CREATE TABLE "app_deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developer_id" uuid NOT NULL,
	"provider_resource_id" uuid NOT NULL,
	"app_type" "app_type" NOT NULL,
	"network_name" varchar(100) NOT NULL,
	"status" "deployment_status" DEFAULT 'creating' NOT NULL,
	"total_cpu" integer NOT NULL,
	"total_memory" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployment_containers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" uuid NOT NULL,
	"container_id" varchar(200) NOT NULL,
	"container_type" "container_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"image" varchar(200) NOT NULL,
	"cpu_cores" integer NOT NULL,
	"ram" integer NOT NULL,
	"storage" integer NOT NULL,
	"port" integer,
	"internal_port" integer,
	"status" varchar(50) DEFAULT 'creating' NOT NULL,
	"environment_vars" jsonb,
	"volumes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deployment_containers_container_id_key" UNIQUE("container_id")
);
--> statement-breakpoint
ALTER TABLE "provider_resources" ADD CONSTRAINT "provider_resources_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_vms" ADD CONSTRAINT "developer_vms_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_vms" ADD CONSTRAINT "developer_vms_provider_resource_id_fkey" FOREIGN KEY ("provider_resource_id") REFERENCES "public"."provider_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_deployments" ADD CONSTRAINT "app_deployments_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_deployments" ADD CONSTRAINT "app_deployments_provider_resource_id_fkey" FOREIGN KEY ("provider_resource_id") REFERENCES "public"."provider_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_containers" ADD CONSTRAINT "deployment_containers_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "public"."app_deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deployment_developer" ON "app_deployments" USING btree ("developer_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_deployment_provider" ON "app_deployments" USING btree ("provider_resource_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_deployment_status" ON "app_deployments" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_container_deployment" ON "deployment_containers" USING btree ("deployment_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_container_status" ON "deployment_containers" USING btree ("status" text_ops);--> statement-breakpoint
CREATE VIEW "public"."deployment_overview" AS (SELECT d.id AS deployment_id, d.app_type, d.status AS deployment_status, d.network_name, d.total_cpu, d.total_memory, json_agg(json_build_object('container_id', c.container_id, 'container_type', c.container_type, 'status', c.status, 'port', c.port)) AS containers FROM app_deployments d LEFT JOIN deployment_containers c ON d.id = c.deployment_id GROUP BY d.id);
*/