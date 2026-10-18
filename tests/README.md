# E2E Testing Guide

This directory contains end-to-end tests for DoorSurvey Pro using Playwright.

## Setup

Install dependencies:
```bash
npm install
npx playwright install # Install browsers
```

## Running Tests

```bash
# Run all tests (headless)
npx playwright test

# Run tests with UI (interactive)
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/02-project-management.spec.ts

# Run tests in debug mode
npx playwright test --debug

# Show test report
npx playwright show-report
```

## Test Structure

- `tests/e2e/helpers/` - Shared test utilities (auth, database helpers)
- `tests/e2e/01-authentication.spec.ts` - Authentication flow tests
- `tests/e2e/02-project-management.spec.ts` - Project CRUD tests
- `tests/e2e/03-door-openings.spec.ts` - Door opening management tests
- `tests/e2e/04-photo-upload.spec.ts` - Photo upload and gallery tests
- `tests/e2e/05-lidar-scanning.spec.ts` - LiDAR scanning feature tests
- `tests/e2e/06-hardware-scanning.spec.ts` - Hardware barcode scanning tests
- `tests/e2e/07-compliance-checking.spec.ts` - Compliance validation tests

## Writing Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
```

### Using Test Helpers

```typescript
import { login, logout } from './helpers/auth';
import { createTestUser, cleanupTestData } from './helpers/db';

test('authenticated action', async ({ page }) => {
  await login(page);
  // Your test here
  await logout(page);
});
```

## Test Data

Tests use the development database. Test data is automatically cleaned up after each test run.

## CI/CD Integration

In CI environments:
- Tests run headless with 1 worker
- Retry failed tests up to 2 times
- Generate HTML reports

## Debugging Failed Tests

1. Run with `--debug` flag to step through tests
2. Check screenshots in `test-results/` directory
3. View traces with `npx playwright show-trace <trace-file>`
4. Use `await page.pause()` to pause execution

## Best Practices

1. Use data-testid attributes for reliable selectors
2. Write defensive tests that check element visibility before interaction
3. Use test.skip() for tests that require special setup
4. Keep tests independent - don't rely on test execution order
5. Clean up test data after execution
6. Use meaningful test names that describe expected behavior

## Authentication in Tests

Tests currently require manual Replit Auth setup. For automated testing:
- Configure test OIDC credentials
- Use session mocking for faster test execution
- See `helpers/auth.ts` for authentication utilities
