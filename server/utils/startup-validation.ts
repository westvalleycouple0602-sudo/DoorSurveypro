import { logger } from "../logger";

interface ValidationResult {
  critical: string[];
  recommended: string[];
  optional: string[];
  allValid: boolean;
}

export function validateStartupEnvironment(): ValidationResult {
  const result: ValidationResult = {
    critical: [],
    recommended: [],
    optional: [],
    allValid: true,
  };

  // CRITICAL: Required for core functionality
  const criticalEnvVars = {
    DATABASE_URL: "PostgreSQL database connection",
    RESEND_API_KEY: "Email notifications (trial warnings, invites, confirmations)",
  };

  // RECOMMENDED: Strongly recommended for full features
  const recommendedEnvVars = {
    REDIS_URL: "Trial notification scheduler, job queue, caching",
    OPENAI_API_KEY: "AI photo analysis, compliance validation, chat assistant",
  };

  // OPTIONAL: Nice to have, gracefully degraded without
  const optionalEnvVars = {
    NATS_URL: "Real-time event distribution for workers",
    SENTRY_DSN: "Production error tracking and monitoring",
  };

  // Check critical variables
  for (const [key, description] of Object.entries(criticalEnvVars)) {
    if (!process.env[key]) {
      result.critical.push(`❌ ${key} (${description})`);
      result.allValid = false;
    }
  }

  // Check recommended variables
  for (const [key, description] of Object.entries(recommendedEnvVars)) {
    if (!process.env[key]) {
      result.recommended.push(`⚠️  ${key} (${description})`);
    }
  }

  // Check optional variables
  for (const [key, description] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      result.optional.push(`ℹ️  ${key} (${description})`);
    }
  }

  return result;
}

export function logStartupValidation(validation: ValidationResult): void {
  console.log("\n" + "=".repeat(80));
  console.log("🔧 ENVIRONMENT CONFIGURATION CHECK");
  console.log("=".repeat(80));

  if (validation.critical.length === 0) {
    console.log("\n✅ CRITICAL SETUP: All required variables configured");
  } else {
    console.log("\n🔴 CRITICAL SETUP: Missing required variables");
    validation.critical.forEach((msg) => console.log(`  ${msg}`));
    console.log(
      "\n⚠️  ACTION REQUIRED: See docs/SETUP_CHECKLIST.md for setup instructions"
    );
  }

  if (validation.recommended.length > 0) {
    console.log("\n🟡 RECOMMENDED SETUP: Missing recommended variables");
    validation.recommended.forEach((msg) => console.log(`  ${msg}`));
    console.log("  💡 Features will degrade gracefully without these");
  } else {
    console.log("\n✅ RECOMMENDED SETUP: All recommended variables configured");
  }

  if (validation.optional.length > 0) {
    console.log("\n🟢 OPTIONAL SETUP: Missing optional variables");
    validation.optional.forEach((msg) => console.log(`  ${msg}`));
  } else {
    console.log("\n✅ OPTIONAL SETUP: All optional variables configured");
  }

  if (!validation.allValid) {
    console.log("\n" + "=".repeat(80));
    console.log("⚠️  APPLICATION STARTED WITH MISSING CRITICAL CONFIGURATION");
    console.log("📖 Setup Guide: docs/SETUP_CHECKLIST.md");
    console.log("=".repeat(80) + "\n");
  } else {
    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL CRITICAL CONFIGURATION COMPLETE - Ready for testing!");
    console.log("=".repeat(80) + "\n");
  }
}
