/**
 * Tests for OpenCTI Authentication Testing Module
 * Ensures Phase 1 coverage requirements are met
 */

const { tryAuthentication, validateAuthConfig, TEST_AUTH_QUERY } = require('../../server/core/tryAuthentication');

describe('OpenCTI Authentication Testing Module', () => {
  describe('tryAuthentication Function', () => {
    const mockOptions = {
      url: 'https://demo.opencti.io',
      apiKey: 'test-api-key'
    };

    const mockLogger = {
      trace: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Successful Authentication', () => {
      it('should return success for valid authentication', async () => {
        const mockRequestFunction = jest.fn().mockResolvedValue({
          me: {
            id: 'user-123',
            name: 'Test User',
            user_email: 'test@example.com',
            description: 'Test user account'
          }
        });

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result).toEqual({
          success: true,
          authenticated: true,
          user: {
            id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
            description: 'Test user account'
          },
          message: 'Authentication successful'
        });

        expect(mockRequestFunction).toHaveBeenCalledWith(TEST_AUTH_QUERY, {}, mockOptions, mockLogger);
        expect(mockLogger.info).toHaveBeenCalledWith('OpenCTI authentication successful', {
          userId: 'user-123',
          userName: 'Test User',
          userEmail: 'test@example.com'
        });
      });

      it('should handle missing optional user fields', async () => {
        const mockRequestFunction = jest.fn().mockResolvedValue({
          me: {
            id: 'user-123'
          }
        });

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result.success).toBe(true);
        expect(result.user).toEqual({
          id: 'user-123',
          name: 'Unknown',
          email: 'Not provided',
          description: 'No description'
        });
      });
    });

    describe('Authentication Failures', () => {
      it('should handle AUTH_REQUIRED errors', async () => {
        const authError = new Error('You must be logged in to do this.');
        authError.body = {
          errors: [{
            message: 'You must be logged in to do this.',
            extensions: { code: 'AUTH_REQUIRED' }
          }]
        };

        const mockRequestFunction = jest.fn().mockRejectedValue(authError);

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result).toEqual({
          success: false,
          authenticated: false,
          error: 'AUTH_REQUIRED',
          message: 'Your OpenCTI API key appears to be invalid or expired. Please check your API key and try again, or contact your OpenCTI administrator for assistance.',
          detail: 'You must be logged in to do this.',
          help: 'Verify your API key is correct and has proper permissions, or contact your OpenCTI administrator for assistance.'
        });
      });

      it('should handle FORBIDDEN errors', async () => {
        const forbiddenError = new Error('Insufficient permissions');
        forbiddenError.body = {
          errors: [{
            message: 'Insufficient permissions',
            extensions: { code: 'FORBIDDEN' }
          }]
        };

        const mockRequestFunction = jest.fn().mockRejectedValue(forbiddenError);

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result.error).toBe('FORBIDDEN');
        expect(result.success).toBe(false);
        expect(result.authenticated).toBe(false);
      });

      it('should handle generic GraphQL errors', async () => {
        const graphqlError = new Error('GraphQL error');
        graphqlError.body = {
          errors: [{
            message: 'Some GraphQL error',
            extensions: { code: 'INTERNAL_ERROR' }
          }]
        };

        const mockRequestFunction = jest.fn().mockRejectedValue(graphqlError);

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result.error).toBe('GRAPHQL_ERROR');
        expect(result.success).toBe(false);
        expect(result.authenticated).toBe(false);
      });

      it('should handle network errors', async () => {
        const networkError = new Error('ECONNREFUSED');

        const mockRequestFunction = jest.fn().mockRejectedValue(networkError);

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result).toEqual({
          success: false,
          authenticated: false,
          error: 'NETWORK_ERROR',
          message: 'OpenCTI server is not responding. Please verify the server is running and check your URL and port settings.',
          detail: 'ECONNREFUSED',
          help: 'Check that OpenCTI is running and accessible on the specified port. Contact your administrator if needed.'
        });
      });
    });

    describe('Invalid Responses', () => {
      it('should handle response with no user data', async () => {
        const mockRequestFunction = jest.fn().mockResolvedValue({});

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result).toEqual({
          success: false,
          authenticated: false,
          message: 'Authentication returned no user data',
          help: 'Check if the API endpoint is correct and accessible'
        });

        expect(mockLogger.warn).toHaveBeenCalledWith('OpenCTI authentication returned no user data');
      });

      it('should handle response with null me field', async () => {
        const mockRequestFunction = jest.fn().mockResolvedValue({ me: null });

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result.success).toBe(false);
        expect(result.authenticated).toBe(false);
      });

      it('should handle response with me field missing id', async () => {
        const mockRequestFunction = jest.fn().mockResolvedValue({ me: { name: 'Test' } });

        const result = await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(result.success).toBe(false);
        expect(result.authenticated).toBe(false);
      });
    });

    describe('Logging Behavior', () => {
      it('should trace authentication attempt', async () => {
        const mockRequestFunction = jest.fn().mockResolvedValue({
          me: { id: 'user-123', name: 'Test User' }
        });

        await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(mockLogger.trace).toHaveBeenCalledWith('Testing OpenCTI API authentication');
      });

      it('should log errors on failure', async () => {
        const error = new Error('Test error');
        const mockRequestFunction = jest.fn().mockRejectedValue(error);

        await tryAuthentication(mockOptions, mockRequestFunction, mockLogger);

        expect(mockLogger.error).toHaveBeenCalledWith('OpenCTI authentication test failed', { error: 'Test error' });
      });
    });
  });

  describe('validateAuthConfig Function', () => {
    describe('Valid Configurations', () => {
      it('should validate complete valid configuration', () => {
        const config = {
          url: 'https://opencti.example.com',
          apiKey: 'valid-api-key-12345'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept HTTP URLs', () => {
        const config = {
          url: 'http://localhost:8080',
          apiKey: 'test-api-key'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    describe('Required Field Validation', () => {
      it('should require URL', () => {
        const config = {
          apiKey: 'test-api-key'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('OpenCTI URL is required');
      });

      it('should require API key', () => {
        const config = {
          url: 'https://opencti.example.com'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('OpenCTI API key is required');
      });

      it('should require both URL and API key', () => {
        const config = {};

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('OpenCTI URL is required');
        expect(result.errors).toContain('OpenCTI API key is required');
      });
    });

    describe('URL Format Validation', () => {
      it('should reject invalid URL format', () => {
        const config = {
          url: 'not-a-valid-url',
          apiKey: 'test-api-key'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid OpenCTI URL format');
      });

      it('should reject non-HTTP protocols', () => {
        const config = {
          url: 'ftp://opencti.example.com',
          apiKey: 'test-api-key'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('OpenCTI URL must use HTTP or HTTPS protocol');
      });
    });

    describe('API Key Validation Warnings', () => {
      it('should warn about short API keys', () => {
        const config = {
          url: 'https://opencti.example.com',
          apiKey: 'short'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('API key appears to be too short');
      });

      it('should warn about demo API keys', () => {
        const config = {
          url: 'https://opencti.example.com',
          apiKey: 'demo-key'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('API key appears to be a demo/test key which may not work');
      });

      it('should warn about test API keys', () => {
        const config = {
          url: 'https://opencti.example.com',
          apiKey: 'test'
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('API key appears to be a demo/test key which may not work');
      });
    });

    describe('Edge Cases', () => {
      it('should handle null options', () => {
        const result = validateAuthConfig(null);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle undefined options', () => {
        const result = validateAuthConfig(undefined);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle empty strings', () => {
        const config = {
          url: '',
          apiKey: ''
        };

        const result = validateAuthConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('OpenCTI URL is required');
        expect(result.errors).toContain('OpenCTI API key is required');
      });
    });
  });

  describe('Module Exports', () => {
    it('should export required functions', () => {
      expect(typeof tryAuthentication).toBe('function');
      expect(typeof validateAuthConfig).toBe('function');
      expect(typeof TEST_AUTH_QUERY).toBe('string');
    });

    it('should export valid GraphQL query', () => {
      expect(TEST_AUTH_QUERY).toContain('query tryAuthentication');
      expect(TEST_AUTH_QUERY).toContain('me {');
      expect(TEST_AUTH_QUERY).toContain('id');
      expect(TEST_AUTH_QUERY).toContain('name');
    });
  });
}); 