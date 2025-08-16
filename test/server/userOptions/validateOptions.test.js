/**
 * Tests for server/userOptions/validateOptions.js
 * Critical for OpenCTI IOC Submission Configuration Validation
 * TDD Implementation - Following blink-ops patterns
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

const { validateOptions } = require('../../../server/userOptions');

// Helper to promisify the callback-based function
const validateOptionsAsync = (options) => {
  return new Promise((resolve, reject) => {
    validateOptions(options, (err, errors) => {
      if (err) reject(err);
      else resolve(errors);
    });
  });
};

describe('validateOptions - OpenCTI IOC Submission Configuration', () => {
  describe('URL Validation - OpenCTI Instance', () => {
    test('should require URL for OpenCTI connection', async () => {
      const options = {
        url: { value: '' }, // Empty URL should fail
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'url',
            message: expect.stringContaining('URL')
          })
        ])
      );
    });

    test('should accept valid HTTPS URL for OpenCTI', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' }, 
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should reject URLs ending with //', async () => {
      const options = {
        url: { value: 'https://tc.example.com//' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'url',
            message: expect.stringContaining('//')
          })
        ])
      );
    });

    test('should accept URLs without trailing //', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });
  });

  describe('Authentication Validation - OpenCTI API Keys', () => {
    test('should require authorId for OpenCTI authentication', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: '' }, // Empty authorId should fail
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'authorId',
            message: expect.stringContaining('User ID')
          })
        ])
      );
    });

    test('should require apiKey for OpenCTI authentication', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: '' } // Empty apiKey should fail
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'apiKey', 
            message: expect.stringContaining('API Token')
          })
        ])
      );
    });

    test('should accept valid OpenCTI credentials', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'valid-access-id' },
        apiKey: { value: 'valid-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should reject non-string authorId', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 123 },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'authorId'
          })
        ])
      );
    });

    test('should reject non-string apiKey', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: null }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'apiKey'
          })
        ])
      );
    });
  });

  describe('Complete Configuration Validation', () => {
    test('should return empty errors array for valid complete configuration', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'valid-access-id' },
        apiKey: { value: 'valid-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should return multiple errors for invalid configuration', async () => {
      const options = {
        url: { value: '' }, // Empty URL
        authorId: { value: '' }, // Empty authorId  
        apiKey: { value: '' } // Empty apiKey
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors.length).toBe(3); // Should have 3 errors
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'url' }),
          expect.objectContaining({ key: 'authorId' }),
          expect.objectContaining({ key: 'apiKey' })
        ])
      );
    });

    test('should handle mixed valid and invalid options', async () => {
      const options = {
        url: { value: 'https://tc.example.com' }, // Valid
        authorId: { value: '' }, // Invalid
        apiKey: { value: 'valid-key' } // Valid
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors.length).toBe(1);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'authorId' })
        ])
      );
    });
  });

  describe('IOC Submission Context Validation', () => {
    test('should validate minimal configuration for IOC submission workflow', async () => {
      // Test that validates configuration supports IOC submission patterns
      const iocSubmissionOptions = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(iocSubmissionOptions);
      
      expect(errors).toEqual([]);
    });

    test('should reject configuration with URL formatting issues critical for IOC APIs', async () => {
      // Test that double slashes are rejected (would break API calls)
      const invalidOptions = {
        url: { value: 'https://tc.example.com//' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(invalidOptions);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'url',
            message: expect.stringContaining('//')
          })
        ])
      );
    });

    test('should handle edge cases for IOC submission configuration', async () => {
      // Test edge cases that could break IOC submission
      const edgeCaseOptions = {
        url: { value: 'http://localhost:8080' }, // Local development
        authorId: { value: 'dev-access-id' },
        apiKey: { value: 'dev-api-key' }
      };
      
      const errors = await validateOptionsAsync(edgeCaseOptions);
      
      expect(errors).toEqual([]);
    });

    test('should validate OpenCTI production-like configuration', async () => {
      const productionOptions = {
        url: { value: 'https://demo.opencti.io' },
        authorId: { value: 'A1B2C3D4E5F6G7H8I9J0' },
        apiKey: { value: 'k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6' }
      };
      
      const errors = await validateOptionsAsync(productionOptions);
      
      expect(errors).toEqual([]);
    });
  });

  // Phase 2.3 Enhancements: Security Scenarios & Edge Cases
  describe('Security Validation - Injection Prevention', () => {
    test('should handle XSS injection attempts in URL', async () => {
      const options = {
        url: { value: 'https://tc.example.com"><script>alert("xss")</script>' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should either reject or sanitize XSS attempts - behavior depends on validation implementation
      // At minimum, should not crash
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle SQL injection attempts in credentials', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: "'; DROP TABLE users; --" },
        apiKey: { value: "1' OR '1'='1" }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle injection attempts gracefully
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle command injection attempts in URL', async () => {
      const options = {
        url: { value: 'https://tc.example.com; rm -rf /' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle command injection attempts
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle LDAP injection attempts in authorId', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test*)(objectClass=*)' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle LDAP injection attempts
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle NoSQL injection attempts in apiKey', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: '{"$ne": null}' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle NoSQL injection attempts
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle path traversal attempts in URL', async () => {
      const options = {
        url: { value: 'https://tc.example.com/../../../etc/passwd' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle path traversal attempts
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Extreme Edge Cases - Boundary Testing', () => {
    test('should handle extremely long URLs', async () => {
      const veryLongUrl = 'https://tc.example.com/' + 'a'.repeat(10000);
      const options = {
        url: { value: veryLongUrl },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle very long URLs without crashing
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle extremely long credentials', async () => {
      const veryLongKey = 'k'.repeat(50000);
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: veryLongKey },
        apiKey: { value: veryLongKey }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle very long credentials without crashing
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle Unicode characters in URL', async () => {
      const options = {
        url: { value: 'https://例え.テスト.jp' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle Unicode URLs
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle Unicode characters in credentials', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: '测试访问ID' },
        apiKey: { value: 'тест-апи-ключ' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle Unicode credentials
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle null and undefined values', async () => {
      const options = {
        url: { value: null },
        authorId: { value: undefined },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle null/undefined gracefully
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
    });

    test('should handle boolean values in string fields', async () => {
      const options = {
        url: { value: true },
        authorId: { value: false },
        apiKey: { value: 'test-api-key' }
      };
      
      // NEW: Fixed implementation gracefully handles non-string values
      const errors = await validateOptionsAsync(options);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'url' }),
          expect.objectContaining({ key: 'authorId' })
        ])
      );
    });

    test('should handle array values in string fields', async () => {
      const options = {
        url: { value: ['https://tc.example.com'] },
        authorId: { value: ['test-access-id'] },
        apiKey: { value: 'test-api-key' }
      };
      
      // NEW: Fixed implementation gracefully handles array values
      const errors = await validateOptionsAsync(options);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'url' }),
          expect.objectContaining({ key: 'authorId' })
        ])
      );
    });

    test('should handle object values in string fields', async () => {
      const options = {
        url: { value: { url: 'https://tc.example.com' } },
        authorId: { value: { id: 'test-access-id' } },
        apiKey: { value: 'test-api-key' }
      };
      
      // NEW: Fixed implementation gracefully handles object values
      const errors = await validateOptionsAsync(options);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'url' }),
          expect.objectContaining({ key: 'authorId' })
        ])
      );
    });
  });

  describe('Malformed Credentials - Real-World Edge Cases', () => {
    test('should handle authorId with special characters', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test@#$%^&*()_+-=[]{}|;:,.<>?' },
        apiKey: { value: 'test-api-key' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle special characters in authorId
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle apiKey with whitespace variations', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: '  \t\n  test-api-key  \r\n  ' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle whitespace in apiKey
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle credentials with control characters', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test\x00\x01\x02access' },
        apiKey: { value: 'test\x7f\x80api' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Should handle control characters
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle base64-like strings in credentials', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'dGVzdC1hY2Nlc3MtaWQ=' },
        apiKey: { value: 'dGVzdC1hcGkta2V5' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Base64 strings should be valid
      expect(errors).toEqual([]);
    });

    test('should handle hex-encoded strings in credentials', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: '746573742d6163636573732d6964' },
        apiKey: { value: '746573742d6170692d6b6579' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      // Hex strings should be valid
      expect(errors).toEqual([]);
    });
  });

  describe('Performance Validation - Timeout Scenarios', () => {
    test('should complete validation within reasonable time for normal inputs', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      const startTime = Date.now();
      const errors = await validateOptionsAsync(options);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(errors).toEqual([]);
    });

    test('should complete validation within reasonable time for large inputs', async () => {
      const largeString = 'x'.repeat(10000);
      const options = {
        url: { value: `https://tc.example.com/${largeString}` },
        authorId: { value: largeString },
        apiKey: { value: largeString }
      };
      
      const startTime = Date.now();
      const errors = await validateOptionsAsync(options);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should handle concurrent validation requests', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
      };
      
      // Run 10 concurrent validations
      const promises = Array(10).fill(null).map(() => validateOptionsAsync(options));
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // All should complete in under 1 second
      results.forEach(errors => {
        expect(errors).toEqual([]);
      });
    });

    test('should handle stress test with many invalid options', async () => {
      const invalidOptions = Array(100).fill(null).map((_, index) => ({
        url: { value: '' },
        authorId: { value: '' },
        apiKey: { value: '' }
      }));
      
      const startTime = Date.now();
      const results = await Promise.all(
        invalidOptions.map(options => validateOptionsAsync(options))
      );
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
      results.forEach(errors => {
        expect(errors.length).toBe(3); // Each should have 3 errors
      });
    });
  });

  describe('Array Configuration Validation', () => {
    test('should accept valid searchReturnTypes array', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        searchReturnTypes: [
          { value: 'indicators', display: 'Indicators' },
          { value: 'observables', display: 'Observables' }
        ]
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should reject non-array searchReturnTypes', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        searchReturnTypes: { value: 'indicators' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'searchReturnTypes',
            message: 'Search Return Types must be an array'
          })
        ])
      );
    });

    test('should accept valid deletionPermissions array', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        deletionPermissions: [
          { value: 'indicators', display: 'Allow Indicator Deletion' }
        ]
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should reject non-array deletionPermissions', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        deletionPermissions: 'indicators'
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'deletionPermissions',
            message: 'Deletion Permissions must be an array'
          })
        ])
      );
    });

    test('should accept valid submissionFieldRestrictions array', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        submissionFieldRestrictions: [
          { value: 'score_required', display: 'Score Required' }
        ]
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should reject non-array submissionFieldRestrictions', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        submissionFieldRestrictions: { score: 'required' }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'submissionFieldRestrictions',
            message: 'Field Submission Restrictions must be an array'
          })
        ])
      );
    });

    test('should accept valid defaultSubmissionValues array', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        defaultSubmissionValues: [
          { value: 'score_50', display: 'Default Score: 50 (Medium)' }
        ]
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should reject non-array defaultSubmissionValues', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        defaultSubmissionValues: { score: 50 }
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'defaultSubmissionValues',
            message: 'Default Submission Values must be an array'
          })
        ])
      );
    });

    test('should accept valid searchBehavior array', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        searchBehavior: [
          { value: 'case_sensitive', display: 'Case Sensitive Search' }
        ]
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should reject non-array searchBehavior', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        searchBehavior: 'case_sensitive'
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'searchBehavior',
            message: 'Search Behavior Options must be an array'
          })
        ])
      );
    });
  });

  describe('Boolean Configuration Validation', () => {
    test('should accept valid automaticLinking boolean true', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        automaticLinking: true
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should accept valid automaticLinking boolean false', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        automaticLinking: false
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should reject non-boolean automaticLinking', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        automaticLinking: 'true'
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'automaticLinking',
            message: 'Automatic Relationship Creation must be a boolean value'
          })
        ])
      );
    });

    test('should accept undefined automaticLinking', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' }
        // automaticLinking not provided
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });
  });

  describe('Default Configuration Values', () => {
    test('should accept empty arrays for new configuration options', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        searchReturnTypes: [],
        deletionPermissions: [],
        submissionFieldRestrictions: [],
        defaultSubmissionValues: [],
        searchBehavior: []
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });

    test('should accept configuration with all new options properly set', async () => {
      const options = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-access-id' },
        apiKey: { value: 'test-api-key' },
        searchReturnTypes: [
          { value: 'indicators', display: 'Indicators' },
          { value: 'observables', display: 'Observables' }
        ],
        deletionPermissions: [
          { value: 'indicators', display: 'Allow Indicator Deletion' }
        ],
        submissionFieldRestrictions: [
          { value: 'score_required', display: 'Score Required' }
        ],
        defaultSubmissionValues: [
          { value: 'score_50', display: 'Default Score: 50 (Medium)' },
          { value: 'confidence_high', display: 'Default Confidence: High (75%)' }
        ],
        automaticLinking: true,
        searchBehavior: [
          { value: 'case_sensitive', display: 'Case Sensitive Search' }
        ]
      };
      
      const errors = await validateOptionsAsync(options);
      
      expect(errors).toEqual([]);
    });
  });


}); 