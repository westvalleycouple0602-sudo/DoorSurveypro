import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { prelaunchSignups, insertPrelaunchSignupSchema } from "@shared/schema";
import { logger } from "../logger";
import { eq, sql, desc, count } from "drizzle-orm";
import { getOrganizationContext } from "../clerkAuth";

const router = Router();

// POST /api/prelaunch-signups - Create a new prelaunch signup
// Public endpoint - no authentication required
router.post("/", async (req, res) => {
  try {
    // Capture comprehensive tracking data
    const signupData = insertPrelaunchSignupSchema.parse({
      email: req.body.email,
      name: req.body.name,
      company: req.body.company,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      referralSource: req.body.source || 'direct',
      referrer: req.headers['referer'] || null,
      // UTM parameters from URL query string (passed from frontend)
      utmSource: req.body.utm_source || null,
      utmMedium: req.body.utm_medium || null,
      utmCampaign: req.body.utm_campaign || null,
      utmContent: req.body.utm_content || null,
      utmTerm: req.body.utm_term || null,
    });

    // Check if email already exists
    const existing = await db
      .select()
      .from(prelaunchSignups)
      .where(eq(prelaunchSignups.email, signupData.email))
      .limit(1);

    if (existing.length > 0) {
      logger.info("Duplicate prelaunch signup attempt", {
        email: signupData.email,
        ipAddress: signupData.ipAddress,
      });
      
      // Return success to prevent email enumeration
      return res.json({ 
        success: true, 
        message: "Thank you for your interest!" 
      });
    }

    // Insert new signup
    const [signup] = await db
      .insert(prelaunchSignups)
      .values(signupData)
      .returning();

    logger.info("New prelaunch signup created", {
      signupId: signup.id,
      email: signup.email,
      company: signup.company,
      utmCampaign: signup.utmCampaign,
      utmSource: signup.utmSource,
      referralSource: signup.referralSource,
    });

    res.json({ 
      success: true, 
      message: "Successfully added to waitlist",
      signup: {
        id: signup.id,
        email: signup.email,
        createdAt: signup.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid prelaunch signup data", { errors: error.errors });
      return res.status(400).json({ 
        error: "Invalid signup data", 
        details: error.errors 
      });
    }

    logger.error("Error creating prelaunch signup", { error });
    res.status(500).json({ 
      error: "Failed to process signup. Please try again later." 
    });
  }
});

// GET /api/prelaunch-signups - Get all prelaunch signups (admin only)
router.get("/", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only allow admins and owners to view prelaunch signups
    if (context.role !== 'admin' && context.role !== 'owner') {
      return res.status(403).json({ error: "Access denied" });
    }

    const signups = await db
      .select()
      .from(prelaunchSignups)
      .orderBy(desc(prelaunchSignups.createdAt));

    res.json({
      signups,
      total: signups.length,
    });
  } catch (error) {
    logger.error("Error fetching prelaunch signups", { error });
    res.status(500).json({ error: "Failed to fetch signups" });
  }
});

// GET /api/prelaunch-signups/analytics - Get funnel analytics (admin only)
router.get("/analytics", async (req, res) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only allow admins and owners
    if (context.role !== 'admin' && context.role !== 'owner') {
      return res.status(403).json({ error: "Access denied" });
    }

    // Total signups
    const totalSignups = await db
      .select({ count: count() })
      .from(prelaunchSignups);

    // Signups by UTM campaign
    const byCampaign = await db
      .select({
        campaign: prelaunchSignups.utmCampaign,
        count: count(),
      })
      .from(prelaunchSignups)
      .where(sql`${prelaunchSignups.utmCampaign} IS NOT NULL`)
      .groupBy(prelaunchSignups.utmCampaign);

    // Signups by source
    const bySource = await db
      .select({
        source: prelaunchSignups.utmSource,
        count: count(),
      })
      .from(prelaunchSignups)
      .where(sql`${prelaunchSignups.utmSource} IS NOT NULL`)
      .groupBy(prelaunchSignups.utmSource);

    // Signups by medium
    const byMedium = await db
      .select({
        medium: prelaunchSignups.utmMedium,
        count: count(),
      })
      .from(prelaunchSignups)
      .where(sql`${prelaunchSignups.utmMedium} IS NOT NULL`)
      .groupBy(prelaunchSignups.utmMedium);

    // Conversion funnel metrics (count non-null values)
    const conversionMetrics = await db
      .select({
        totalSignups: count(),
        emailOpened: sql<number>`COUNT(CASE WHEN ${prelaunchSignups.emailOpened} IS NOT NULL THEN 1 END)`,
        emailClicked: sql<number>`COUNT(CASE WHEN ${prelaunchSignups.emailClicked} IS NOT NULL THEN 1 END)`,
        trialStarted: sql<number>`COUNT(CASE WHEN ${prelaunchSignups.trialStarted} IS NOT NULL THEN 1 END)`,
        convertedToPaid: sql<number>`COUNT(CASE WHEN ${prelaunchSignups.convertedToPaid} IS NOT NULL THEN 1 END)`,
      })
      .from(prelaunchSignups);

    // Signups over time (last 30 days, grouped by day)
    const signupsOverTime = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM prelaunch_signups
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Calculate conversion rates
    const total = conversionMetrics[0]?.totalSignups || 0;
    const opened = conversionMetrics[0]?.emailOpened || 0;
    const clicked = conversionMetrics[0]?.emailClicked || 0;
    const trial = conversionMetrics[0]?.trialStarted || 0;
    const paid = conversionMetrics[0]?.convertedToPaid || 0;

    res.json({
      overview: {
        totalSignups: total,
        emailOpenedCount: opened,
        emailClickedCount: clicked,
        trialStartedCount: trial,
        convertedToPaidCount: paid,
        // Conversion rates
        signupToEmailOpen: total > 0 ? (opened / total * 100).toFixed(2) : "0",
        emailOpenToClick: opened > 0 ? (clicked / opened * 100).toFixed(2) : "0",
        clickToTrial: clicked > 0 ? (trial / clicked * 100).toFixed(2) : "0",
        trialToPaid: trial > 0 ? (paid / trial * 100).toFixed(2) : "0",
        overallConversion: total > 0 ? (paid / total * 100).toFixed(2) : "0",
      },
      byCampaign,
      bySource,
      byMedium,
      signupsOverTime: signupsOverTime.rows,
    });
  } catch (error) {
    logger.error("Error fetching prelaunch analytics", { error });
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
