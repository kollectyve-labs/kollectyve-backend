-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
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
CREATE TABLE "developer_app_containers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developer_id" uuid NOT NULL,
	"provider_resource_id" uuid NOT NULL,
	"container_id" varchar(200) NOT NULL,
	"app_name" varchar(100) NOT NULL,
	"ram" integer NOT NULL,
	"cpu_cores" integer NOT NULL,
	"storage" integer NOT NULL,
	"status" varchar(50) DEFAULT 'running' NOT NULL,
	"ssh_public_key" text,
	"port" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "developer_app_containers_container_id_key" UNIQUE("container_id")
);
--> statement-breakpoint
ALTER TABLE "provider_resources" ADD CONSTRAINT "provider_resources_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_vms" ADD CONSTRAINT "developer_vms_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_vms" ADD CONSTRAINT "developer_vms_provider_resource_id_fkey" FOREIGN KEY ("provider_resource_id") REFERENCES "public"."provider_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_app_containers" ADD CONSTRAINT "developer_app_containers_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_app_containers" ADD CONSTRAINT "developer_app_containers_provider_resource_id_fkey" FOREIGN KEY ("provider_resource_id") REFERENCES "public"."provider_resources"("id") ON DELETE cascade ON UPDATE no action;
*/