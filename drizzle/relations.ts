import { relations } from "drizzle-orm/relations";
import {
  appDeployments,
  deploymentContainers,
  developers,
  developerVms,
  healthChecks,
  providerResources,
  providers,
} from "./schema";

export const providerResourcesRelations = relations(
  providerResources,
  ({ one, many }) => ({
    provider: one(providers, {
      fields: [providerResources.providerId],
      references: [providers.id],
    }),
    developerVms: many(developerVms),
    appDeployments: many(appDeployments),
  }),
);

export const providersRelations = relations(providers, ({ many }) => ({
  providerResources: many(providerResources),
  healthChecks: many(healthChecks),
}));

export const healthChecksRelations = relations(healthChecks, ({ one }) => ({
  provider: one(providers, {
    fields: [healthChecks.providerId],
    references: [providers.id],
  }),
}));

export const developerVmsRelations = relations(developerVms, ({ one }) => ({
  developer: one(developers, {
    fields: [developerVms.developerId],
    references: [developers.id],
  }),
  providerResource: one(providerResources, {
    fields: [developerVms.providerResourceId],
    references: [providerResources.id],
  }),
}));

export const developersRelations = relations(developers, ({ many }) => ({
  developerVms: many(developerVms),
  appDeployments: many(appDeployments),
}));

export const appDeploymentsRelations = relations(
  appDeployments,
  ({ one, many }) => ({
    developer: one(developers, {
      fields: [appDeployments.developerId],
      references: [developers.id],
    }),
    providerResource: one(providerResources, {
      fields: [appDeployments.providerResourceId],
      references: [providerResources.id],
    }),
    deploymentContainers: many(deploymentContainers),
  }),
);

export const deploymentContainersRelations = relations(
  deploymentContainers,
  ({ one }) => ({
    appDeployment: one(appDeployments, {
      fields: [deploymentContainers.deploymentId],
      references: [appDeployments.id],
    }),
  }),
);
