// server/routes/div28.routes.ts
// Division 28 Electronic Security Assessment API Routes

import { Router } from "express";
import { z } from "zod";
import { requireAuth as isAuthenticated } from "../clerkAuth";
import { requireRole } from "../middleware/requireRole";
import { requireOrgAccess } from "../middleware/validateOrg";
import { computeDiv28Opportunity } from "../div28/div28OpportunityScoring";
import { buildDiv28TasksForOpening, getDiv28TaskTemplates } from "../div28/div28PmTasks";
import { buildOpeningProposalPackage, getProposalTemplates } from "../div28/div28ProposalSnippets";
import {
  div28SurveyAnswersSchema,
  defaultDiv28SurveyAnswers,
  defaultQuoteExportOptions,
} from "@shared/schemas/div28.schema";
import type {
  Div28SurveyAnswers,
  Div28OpportunitySummary,
  GeneratedDiv28Task,
  OpeningProposalPackage,
  QuoteExportOptions,
} from "@shared/types/div28";
import { handleValidationError } from "../utils/error-handler";
import { logger } from "../logger";

const router = Router();

interface Div28AssessmentResponse {
  survey: Div28SurveyAnswers;
  opportunity: Div28OpportunitySummary;
  tasks: GeneratedDiv28Task[];
  proposal: OpeningProposalPackage;
}

router.post(
  "/div28/assess",
  isAuthenticated,
  async (req, res) => {
    try {
      const validation = div28SurveyAnswersSchema.safeParse(req.body);
      if (!validation.success) {
        return handleValidationError(validation.error, res);
      }

      const survey = validation.data;
      const opportunity = computeDiv28Opportunity(survey);
      const tasks = buildDiv28TasksForOpening(
        req.body.projectId || "default",
        survey.openingId,
        opportunity
      );
      const proposal = buildOpeningProposalPackage(
        survey.openingId,
        req.body.openingLabel || `Opening ${survey.openingId}`,
        opportunity
      );

      const response: Div28AssessmentResponse = {
        survey,
        opportunity,
        tasks,
        proposal,
      };

      logger.info("Div28 assessment completed", {
        openingId: survey.openingId,
        score: opportunity.score,
        tier: opportunity.tier,
        featuresCount: opportunity.recommendedFeatures.length,
      });

      res.json(response);
    } catch (error: any) {
      logger.error("Div28 assessment failed", { error: error.message });
      res.status(500).json({ error: "Failed to process Div28 assessment" });
    }
  }
);

router.post(
  "/div28/score",
  isAuthenticated,
  async (req, res) => {
    try {
      const validation = div28SurveyAnswersSchema.safeParse(req.body);
      if (!validation.success) {
        return handleValidationError(validation.error, res);
      }

      const survey = validation.data;
      const opportunity = computeDiv28Opportunity(survey);

      res.json(opportunity);
    } catch (error: any) {
      logger.error("Div28 scoring failed", { error: error.message });
      res.status(500).json({ error: "Failed to compute Div28 opportunity score" });
    }
  }
);

router.post(
  "/div28/tasks",
  isAuthenticated,
  async (req, res) => {
    try {
      const { projectId, openingId } = req.body;

      if (!projectId || !openingId) {
        return res.status(400).json({
          error: "projectId and openingId are required",
        });
      }

      const validation = div28SurveyAnswersSchema.safeParse(req.body.survey);
      if (!validation.success) {
        return handleValidationError(validation.error, res);
      }

      const survey = validation.data;
      const opportunity = computeDiv28Opportunity(survey);
      const tasks = buildDiv28TasksForOpening(projectId, openingId, opportunity);

      res.json({ tasks, opportunity });
    } catch (error: any) {
      logger.error("Div28 task generation failed", { error: error.message });
      res.status(500).json({ error: "Failed to generate Div28 tasks" });
    }
  }
);

router.post(
  "/div28/proposal",
  isAuthenticated,
  async (req, res) => {
    try {
      const { openingId, openingLabel } = req.body;

      if (!openingId) {
        return res.status(400).json({ error: "openingId is required" });
      }

      const validation = div28SurveyAnswersSchema.safeParse(req.body.survey);
      if (!validation.success) {
        return handleValidationError(validation.error, res);
      }

      const survey = validation.data;
      const opportunity = computeDiv28Opportunity(survey);
      const proposal = buildOpeningProposalPackage(
        openingId,
        openingLabel || `Opening ${openingId}`,
        opportunity
      );

      res.json({ proposal, opportunity });
    } catch (error: any) {
      logger.error("Div28 proposal generation failed", { error: error.message });
      res.status(500).json({ error: "Failed to generate Div28 proposal" });
    }
  }
);

router.get("/div28/templates/tasks", isAuthenticated, async (_req, res) => {
  try {
    const templates = getDiv28TaskTemplates();
    res.json(templates);
  } catch (error: any) {
    logger.error("Failed to fetch Div28 task templates", { error: error.message });
    res.status(500).json({ error: "Failed to fetch task templates" });
  }
});

router.get("/div28/templates/proposal", isAuthenticated, async (_req, res) => {
  try {
    const templates = getProposalTemplates();
    res.json(templates);
  } catch (error: any) {
    logger.error("Failed to fetch Div28 proposal templates", { error: error.message });
    res.status(500).json({ error: "Failed to fetch proposal templates" });
  }
});

router.get("/div28/defaults/survey/:openingId", isAuthenticated, async (req, res) => {
  try {
    const { openingId } = req.params;
    const defaults = defaultDiv28SurveyAnswers(openingId);
    res.json(defaults);
  } catch (error: any) {
    logger.error("Failed to get Div28 survey defaults", { error: error.message });
    res.status(500).json({ error: "Failed to get survey defaults" });
  }
});

router.get("/div28/defaults/export-options", isAuthenticated, async (_req, res) => {
  try {
    res.json(defaultQuoteExportOptions);
  } catch (error: any) {
    logger.error("Failed to get Div28 export defaults", { error: error.message });
    res.status(500).json({ error: "Failed to get export defaults" });
  }
});

export default router;
