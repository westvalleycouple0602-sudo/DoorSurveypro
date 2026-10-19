import type { IStorage } from "../storage";
import type { Multer } from "multer";
import { logger, logError, logAuditEvent, logIntegrationCall, logSecurityEvent } from "../logger";
import { 
  errorReportLimiter, 
  leadCreationLimiter, 
  quoteRequestLimiter,
  fileUploadLimiter,
  aiAnalysisLimiter,
  webhookLimiter
} from "../middleware/rateLimiting";
import { requireOrgAccess, withOrgContext as withOrgContextUtil } from "../middleware/validateOrg";
import { requireRole } from "../middleware/requireRole";

export interface RouteDependencies {
  storage: IStorage;
  uploaders: {
    logo: Multer;
    lidar: Multer;
    hardwareLabel: Multer;
    general: Multer;
  };
  logger: typeof logger;
  logError: typeof logError;
  logAuditEvent: typeof logAuditEvent;
  logIntegrationCall: typeof logIntegrationCall;
  logSecurityEvent: typeof logSecurityEvent;
  rateLimiters: {
    errorReport: typeof errorReportLimiter;
    leadCreation: typeof leadCreationLimiter;
    quoteRequest: typeof quoteRequestLimiter;
    fileUpload: typeof fileUploadLimiter;
    aiAnalysis: typeof aiAnalysisLimiter;
    webhook: typeof webhookLimiter;
  };
  middleware: {
    requireOrgAccess: typeof requireOrgAccess;
    withOrgContext: typeof withOrgContextUtil;
    requireRole: typeof requireRole;
  };
}
