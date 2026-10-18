/**
 * Feature Flags System
 * Enables gradual rollouts, A/B testing, and feature toggles
 * 
 * Future Enhancement: Integrate with LaunchDarkly or Unleash for advanced targeting
 */

import { logger } from "../logger";

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  enabledForUsers?: string[]; // User IDs
  enabledForOrganizations?: string[]; // Organization IDs
  enabledForTiers?: string[]; // Subscription tiers
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagContext {
  userId?: string;
  organizationId?: string;
  tier?: string;
  email?: string;
  properties?: Record<string, any>;
}

/**
 * Feature Flags Store
 * In production, replace with database storage or external service
 */
class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags() {
    this.createFlag({
      key: 'ai-photo-analysis',
      name: 'AI Photo Analysis',
      description: 'Enable AI-powered photo analysis for hardware identification',
      enabled: true,
      rolloutPercentage: 100,
    });

    this.createFlag({
      key: 'lidar-scanning',
      name: 'LiDAR 3D Scanning',
      description: 'Enable LiDAR point cloud processing for automated measurements',
      enabled: true,
      rolloutPercentage: 100,
    });

    this.createFlag({
      key: 'advanced-compliance',
      name: 'Advanced Compliance Checking',
      description: 'Enable AI-powered compliance explanations and recommendations',
      enabled: true,
      rolloutPercentage: 80,
      enabledForTiers: ['pro', 'enterprise', 'master'],
    });

    this.createFlag({
      key: 'hubspot-integration',
      name: 'HubSpot CRM Integration',
      description: 'Sync leads, contacts, and deals with HubSpot CRM',
      enabled: false,
      rolloutPercentage: 0,
      enabledForTiers: ['enterprise', 'master'],
    });

    this.createFlag({
      key: 'partner-pricing',
      name: 'Partner Pricing Comparison',
      description: 'Compare pricing across multiple vendors and partners',
      enabled: true,
      rolloutPercentage: 100,
    });

    this.createFlag({
      key: 'two-factor-auth',
      name: 'Two-Factor Authentication',
      description: 'Require 2FA for enhanced security',
      enabled: false,
      rolloutPercentage: 0,
    });

    this.createFlag({
      key: 'background-jobs',
      name: 'Background Job Processing',
      description: 'Process PDF/Excel generation in background queue',
      enabled: true,
      rolloutPercentage: 50,
    });

    this.createFlag({
      key: 'advanced-analytics',
      name: 'Advanced Analytics',
      description: 'Track user behavior and funnel metrics',
      enabled: false,
      rolloutPercentage: 0,
    });

    logger.info('Feature flags initialized');
  }

  /**
   * Create or update a feature flag
   */
  createFlag(config: Partial<FeatureFlag> & { key: string; name: string; description: string }) {
    const existing = this.flags.get(config.key);
    
    const flag: FeatureFlag = {
      key: config.key,
      name: config.name,
      description: config.description,
      enabled: config.enabled ?? false,
      rolloutPercentage: config.rolloutPercentage ?? 0,
      enabledForUsers: config.enabledForUsers,
      enabledForOrganizations: config.enabledForOrganizations,
      enabledForTiers: config.enabledForTiers,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.flags.set(flag.key, flag);
    
    logger.info(`Feature flag ${flag.key} ${existing ? 'updated' : 'created'}`);
    
    return flag;
  }

  /**
   * Check if feature is enabled for given context
   */
  isEnabled(key: string, context?: FeatureFlagContext): boolean {
    const flag = this.flags.get(key);
    
    if (!flag) {
      logger.warn(`Feature flag ${key} not found, defaulting to disabled`);
      return false;
    }

    // Flag is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check user-specific override
    if (context?.userId && flag.enabledForUsers?.includes(context.userId)) {
      return true;
    }

    // Check organization-specific override
    if (context?.organizationId && flag.enabledForOrganizations?.includes(context.organizationId)) {
      return true;
    }

    // Check tier-specific enablement
    if (context?.tier && flag.enabledForTiers && !flag.enabledForTiers.includes(context.tier)) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      // Use consistent hashing for stable rollouts
      const hash = this.hashContext(key, context);
      const bucket = hash % 100;
      
      if (bucket >= flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all enabled features for a context
   */
  getEnabledFeatures(context?: FeatureFlagContext): string[] {
    const enabled: string[] = [];
    
    for (const [key] of this.flags) {
      if (this.isEnabled(key, context)) {
        enabled.push(key);
      }
    }
    
    return enabled;
  }

  /**
   * Get all feature flags (for admin UI)
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific flag
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Update flag status
   */
  updateFlag(key: string, updates: Partial<FeatureFlag>) {
    const flag = this.flags.get(key);
    
    if (!flag) {
      throw new Error(`Feature flag ${key} not found`);
    }

    const updated = {
      ...flag,
      ...updates,
      updatedAt: new Date(),
    };

    this.flags.set(key, updated);
    
    logger.info(`Feature flag ${key} updated`, { updates });
    
    return updated;
  }

  /**
   * Delete a flag
   */
  deleteFlag(key: string): boolean {
    const deleted = this.flags.delete(key);
    
    if (deleted) {
      logger.info(`Feature flag ${key} deleted`);
    }
    
    return deleted;
  }

  /**
   * Hash context for consistent rollout bucketing
   */
  private hashContext(key: string, context?: FeatureFlagContext): number {
    const input = `${key}:${context?.userId || context?.organizationId || 'anonymous'}`;
    
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash);
  }

  /**
   * Get feature flag statistics
   */
  getStats() {
    const flags = Array.from(this.flags.values());
    
    return {
      total: flags.length,
      enabled: flags.filter(f => f.enabled).length,
      disabled: flags.filter(f => !f.enabled).length,
      fullRollout: flags.filter(f => f.enabled && f.rolloutPercentage === 100).length,
      partialRollout: flags.filter(f => f.enabled && f.rolloutPercentage < 100).length,
    };
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagsService();

/**
 * Express middleware to inject feature flags into request
 */
export function featureFlagsMiddleware(req: any, res: any, next: any) {
  const user = req.dbUser as any;
  
  const context: FeatureFlagContext = {
    userId: user?.id,
    organizationId: user?.organizationId,
    tier: user?.organization?.subscriptionTier,
    email: user?.email,
  };
  
  req.featureFlags = {
    isEnabled: (key: string) => featureFlags.isEnabled(key, context),
    getEnabledFeatures: () => featureFlags.getEnabledFeatures(context),
  };
  
  next();
}

/**
 * Helper to check feature flag in routes
 */
export function requireFeature(flagKey: string) {
  return (req: any, res: any, next: any) => {
    if (!req.featureFlags?.isEnabled(flagKey)) {
      return res.status(403).json({
        error: 'Feature not enabled',
        code: 'FEATURE_DISABLED',
        feature: flagKey,
      });
    }
    next();
  };
}
