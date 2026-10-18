import type { Express } from "express";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@shared/subscriptions";
import type { RouteDependencies } from "./deps";
import { getOrganizationContext } from "../clerkAuth";

export async function registerSubscriptionRoutes(app: Express, deps: RouteDependencies) {
  const { storage, logError } = deps;

  // Explicitly retire payment actions without modifying stored subscriptions.
  for (const path of ["/api/subscriptions/create-checkout", "/api/subscriptions/create-portal", "/api/webhooks/stripe"]) {
    app.post(path, (_req, res) => {
      res.status(410).json({ error: "Online billing has been removed from this application." });
    });
  }

  // Plans, permissions, and usage remain available without a payment provider.
  app.get("/api/subscriptions/usage", async (req, res) => {
    try {
      const orgContext = await getOrganizationContext(req);
      if (!orgContext) return res.status(401).json({ error: "Unauthorized" });
      const organization = await storage.getOrganization(orgContext.organizationId);
      if (!organization) return res.status(404).json({ error: "Organization not found" });
      const tier = organization.subscriptionTier as SubscriptionTier;
      const tierConfig = SUBSCRIPTION_TIERS[tier];
      if (!tierConfig) throw new Error("Organization plan is not recognized");
      const [projects, memberships] = await Promise.all([
        storage.getProjects(organization.id),
        storage.getOrganizationMemberships(organization.id),
      ]);
      res.json({
        tier,
        status: organization.subscriptionStatus,
        usage: {
          projects: {
            current: projects.length,
            limit: tierConfig.features.projectLimit,
            percentage: tierConfig.features.projectLimit
              ? Math.round((projects.length / tierConfig.features.projectLimit) * 100) : 0,
          },
          users: {
            current: memberships.length,
            limit: tierConfig.features.userLimit,
            percentage: tierConfig.features.userLimit
              ? Math.round((memberships.length / tierConfig.features.userLimit) * 100) : 0,
          },
        },
        features: {
          customCatalogs: tierConfig.features.customCatalogs,
          apiAccess: tierConfig.features.apiAccess,
          prioritySupport: tierConfig.features.prioritySupport,
          advancedReporting: tierConfig.features.advancedReporting,
        },
      });
    } catch (error: any) {
      logError(error, { context: "plan-usage-stats" });
      res.status(500).json({ error: "Failed to load plan usage" });
    }
  });
}
