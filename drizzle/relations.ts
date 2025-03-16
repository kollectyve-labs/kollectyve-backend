import { relations } from "drizzle-orm/relations";
import { providers, providerResources, healthChecks, developers, developerVms, developerAppContainers } from "./schema";

export const providerResourcesRelations = relations(providerResources, ({one}) => ({
	provider: one(providers, {
		fields: [providerResources.providerId],
		references: [providers.id]
	}),
}));

export const providersRelations = relations(providers, ({many}) => ({
	providerResources: many(providerResources),
	healthChecks: many(healthChecks),
	developerVms: many(developerVms),
	developerAppContainers: many(developerAppContainers),
}));

export const healthChecksRelations = relations(healthChecks, ({one}) => ({
	provider: one(providers, {
		fields: [healthChecks.providerId],
		references: [providers.id]
	}),
}));

export const developerVmsRelations = relations(developerVms, ({one}) => ({
	developer: one(developers, {
		fields: [developerVms.developerId],
		references: [developers.id]
	}),
	provider: one(providers, {
		fields: [developerVms.providerId],
		references: [providers.id]
	}),
}));

export const developersRelations = relations(developers, ({many}) => ({
	developerVms: many(developerVms),
	developerAppContainers: many(developerAppContainers),
}));

export const developerAppContainersRelations = relations(developerAppContainers, ({one}) => ({
	developer: one(developers, {
		fields: [developerAppContainers.developerId],
		references: [developers.id]
	}),
	provider: one(providers, {
		fields: [developerAppContainers.providerId],
		references: [providers.id]
	}),
}));