// ============================================================================
// TEST NOTIFICATIONS - Manual testing script for notification system
// ============================================================================

import { notificationService } from "./services/notification-service.js";
import { renderEmailTemplate } from "./email-templates/index.js";
import { TemplateId, type WelcomeEmailData } from "@shared/events/notification-events";
import { logger } from "./logger.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Test 1: Render a welcome email template
 */
async function testWelcomeEmailRender() {
  console.log("\n========================================");
  console.log("TEST 1: Render Welcome Email Template");
  console.log("========================================\n");

  try {
    const data: WelcomeEmailData = {
      userName: "John Doe",
      userEmail: "john.doe@example.com",
      organizationName: "ACME Door Solutions",
      dashboardUrl: "https://doorsurvey.pro/dashboard",
      verificationUrl: "https://doorsurvey.pro/verify-email?token=abc123",
    };

    const result = await renderEmailTemplate(TemplateId.WELCOME, data);

    console.log("✅ Template rendered successfully!");
    console.log("Subject:", result.subject);
    console.log("HTML Length:", result.html.length, "characters");
    console.log("Preview:", result.html.substring(0, 200) + "...");
    
    return true;
  } catch (error) {
    console.error("❌ Template rendering failed:", error);
    return false;
  }
}

/**
 * Test 2: Process a notification envelope
 */
async function testNotificationProcessing() {
  console.log("\n========================================");
  console.log("TEST 2: Process Notification Envelope");
  console.log("========================================\n");

  try {
    const envelope = {
      eventId: uuidv4(),
      eventType: "user.welcome" as const,
      timestamp: new Date(),
      actor: {
        userId: "system",
        userEmail: "system@doorsurvey.pro",
        userName: "System",
      },
      context: {
        organizationId: "test-org-001",
        source: "test-script",
      },
      targets: [
        {
          userId: "test-user-001",
          email: "test@example.com",
          name: "Test User",
          language: "en" as const,
        },
      ],
      payload: {
        userName: "Test User",
        userEmail: "test@example.com",
        organizationName: "Test Organization",
        dashboardUrl: "https://doorsurvey.pro/dashboard",
        verificationUrl: "https://doorsurvey.pro/verify-email?token=test123",
      },
      priority: "high" as const,
    };

    const result = await notificationService.processNotification(envelope);

    console.log("✅ Notification processed successfully!");
    console.log("Queued:", result.queued);
    console.log("Skipped:", result.skipped);
    console.log("Errors:", result.errors);
    
    return result.queued > 0 && result.errors === 0;
  } catch (error) {
    console.error("❌ Notification processing failed:", error);
    return false;
  }
}

/**
 * Test 3: List all available templates
 */
function testListTemplates() {
  console.log("\n========================================");
  console.log("TEST 3: List Available Templates");
  console.log("========================================\n");

  const templates = Object.values(TemplateId);
  
  console.log(`Found ${templates.length} templates:\n`);
  
  templates.forEach((id) => {
    console.log(`  - ${id}`);
  });

  return templates.length > 0;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  EMAIL NOTIFICATION SYSTEM TESTS      ║");
  console.log("╚════════════════════════════════════════╝");

  const results = {
    listTemplates: testListTemplates(),
    renderTemplate: await testWelcomeEmailRender(),
    processNotification: await testNotificationProcessing(),
  };

  console.log("\n========================================");
  console.log("TEST SUMMARY");
  console.log("========================================\n");

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  Object.entries(results).forEach(([name, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${name}`);
  });

  console.log(`\n${passed}/${total} tests passed\n`);

  return passed === total;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}

export { runAllTests, testWelcomeEmailRender, testNotificationProcessing, testListTemplates };
