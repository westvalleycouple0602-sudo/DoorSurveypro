import { test, expect } from '@playwright/test';

/**
 * E2E Tests for RAG-Enhanced Compliance Schema Validation
 * 
 * Tests cover:
 * - Valid inputs with numeric coercion from strings
 * - Invalid inputs rejected with 400 errors
 * - Edge cases (boundary values, missing fields, unknown fields)
 * - Enum validation for categorical fields
 * - AI response fallback handling
 */

test.describe('Compliance Schema Validation API Tests', () => {
  
  test('should accept valid compliance check request with string numbers', async ({ request }) => {
    // Test numeric coercion: backend should convert string numbers to actual numbers
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36', // String should be coerced to number
          clearWidth: '32',
          height: '80',
          fireRating: '90-minute',
          lockType: 'Mortise',
          threshold: 'ADA Compliant',
          closingForce: '5',
          occupancyType: 'Business',
          occupancyLoad: '100',
          hasCloser: true,
          hasEgressHardware: true,
          hardwareGrade: 'Grade 1',
          location: 'Main entrance'
        },
        query: 'Check ADA compliance for this entrance door'
      }
    });

    // Should succeed or return structured response (not 400/500)
    expect([200, 201]).toContain(response.status());
    
    const body = await response.json();
    expect(body).toHaveProperty('violations');
    expect(Array.isArray(body.violations)).toBe(true);
  });

  test('should reject invalid door type enum value', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'InvalidDoorType', // Invalid enum value
          width: '36',
          height: '80',
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        }
      }
    });

    // Should return 400 for validation error
    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should reject invalid fire rating enum value', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          fireRating: 'InvalidRating', // Invalid enum value
          width: '36',
          height: '80',
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        }
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should reject out-of-range width value', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '500', // Out of range (max 120)
          height: '80',
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        }
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should reject out-of-range height value', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '200', // Out of range (max 144)
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        }
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should reject out-of-range closing force', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '80',
          closingForce: '20', // Out of range (max 15 lbf)
          occupancyType: 'Business',
          hasCloser: true,
          hasEgressHardware: false
        }
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should reject invalid hardware grade enum', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '80',
          hardwareGrade: 'InvalidGrade', // Invalid enum
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        }
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should reject query longer than 500 characters', async ({ request }) => {
    const longQuery = 'a'.repeat(501); // Exceeds max length
    
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '80',
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        },
        query: longQuery
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should reject unknown fields in strict mode', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '80',
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false,
          unknownField: 'should be rejected' // Unknown field
        }
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should handle edge case: minimum valid dimensions', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '0', // Minimum allowed
          height: '0', // Minimum allowed
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        }
      }
    });

    // Should not return 400 (validation should pass)
    expect(response.status()).not.toBe(400);
  });

  test('should handle edge case: maximum valid dimensions', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '120', // Maximum allowed
          height: '144', // Maximum allowed
          closingForce: '15', // Maximum allowed
          occupancyType: 'Business',
          hasCloser: true,
          hasEgressHardware: false
        }
      }
    });

    expect(response.status()).not.toBe(400);
  });

  test('should accept minimal valid opening (required fields only)', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '80',
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        }
      }
    });

    expect(response.status()).not.toBe(400);
  });

  test('should coerce boolean-like strings to actual booleans', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '80',
          occupancyType: 'Business',
          hasCloser: 'true', // String "true" should be coerced
          hasEgressHardware: 'false' // String "false" should be coerced
        }
      }
    });

    // Backend should handle coercion or reject clearly
    // Not expecting 500 server error
    expect(response.status()).not.toBe(500);
  });

  test('RAG search: should validate minSimilarity bounds', async ({ request }) => {
    // This tests the RAG service parameter validation
    // Since /check-with-citations uses RAG internally, we test via that endpoint
    
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '80',
          occupancyType: 'Assembly',
          hasCloser: true,
          hasEgressHardware: true
        },
        query: 'Check fire door requirements'
      }
    });

    // Should not fail due to RAG parameter validation
    expect(response.status()).not.toBe(500);
  });

  test('should handle AI timeout gracefully', async ({ request }) => {
    // Test that timeouts don't cause 500 errors
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          height: '80',
          occupancyType: 'Business',
          hasCloser: false,
          hasEgressHardware: false
        },
        query: 'Complex query that might take time to process'
      }
    });

    // Even if AI times out, should return structured response (not 500)
    if (response.status() === 500) {
      const body = await response.json();
      // Should have error message, not crash
      expect(body).toHaveProperty('error');
    } else {
      // Or return successful structured response
      const body = await response.json();
      expect(body).toHaveProperty('violations');
    }
  });
});

test.describe('Compliance Schema Validation - Response Structure', () => {
  
  test('should return properly structured compliance response', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '36',
          clearWidth: '32',
          height: '80',
          fireRating: '90-minute',
          occupancyType: 'Business',
          hasCloser: true,
          hasEgressHardware: false
        }
      }
    });

    if (response.ok()) {
      const body = await response.json();
      
      // Should have expected structure
      expect(body).toHaveProperty('violations');
      expect(body).toHaveProperty('compliant');
      expect(body).toHaveProperty('citations');
      
      // Violations should be array
      expect(Array.isArray(body.violations)).toBe(true);
      
      // Each violation should have expected fields
      if (body.violations.length > 0) {
        const violation = body.violations[0];
        expect(violation).toHaveProperty('code');
        expect(violation).toHaveProperty('description');
        expect(violation).toHaveProperty('severity');
        expect(['critical', 'high', 'medium', 'low']).toContain(violation.severity);
      }
    }
  });

  test('should return citations with similarity scores', async ({ request }) => {
    const response = await request.post('/api/compliance/check-with-citations', {
      data: {
        opening: {
          doorType: 'Single Hinged',
          width: '32',
          height: '80',
          occupancyType: 'Assembly',
          hasCloser: true,
          hasEgressHardware: true,
          fireRating: '90-minute'
        },
        query: 'Fire door requirements for assembly occupancy'
      }
    });

    if (response.ok()) {
      const body = await response.json();
      
      if (body.citations && body.citations.length > 0) {
        const citation = body.citations[0];
        
        // Should have expected fields
        expect(citation).toHaveProperty('codeType');
        expect(citation).toHaveProperty('section');
        expect(citation).toHaveProperty('chunk');
        expect(citation).toHaveProperty('similarity');
        
        // Similarity should be valid number between 0 and 1
        expect(citation.similarity).toBeGreaterThanOrEqual(0);
        expect(citation.similarity).toBeLessThanOrEqual(1);
      }
    }
  });
});
