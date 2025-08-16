/**
 * Tests for OpenCTI Core Error Classes
 * Following blink-ops patterns
 */

const {
  IntegrationError,
  NetworkError,
  ApiRequestError,
  AuthRequestError,
  RetryRequestError,
  parseErrorToReadableJSON
} = require('../../../server/errorHandling/integration-errors');

describe('OpenCTI Core Error Handling', () => {
  describe('Error Classes', () => {
    describe('ApiRequestError', () => {
      it('should create an API request error with correct properties', () => {
        const error = new ApiRequestError('API request failed', { statusCode: 500 });

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('API request failed');
        expect(error.statusCode).toBe(500);
        expect(error.name).toContain('Error');
      });

      it('should handle error without properties', () => {
        const error = new ApiRequestError('Simple API error');

        expect(error.message).toBe('Simple API error');
        expect(error).toBeInstanceOf(Error);
      });

      it('should support toJSON serialization', () => {
        const error = new ApiRequestError('Test error', { code: 'TEST_CODE' });
        const json = error.toJSON();

        expect(json).toHaveProperty('message', 'Test error');
        expect(json).toHaveProperty('code', 'TEST_CODE');
      });
    });

    describe('NetworkError', () => {
      it('should create a network error with correct properties', () => {
        const error = new NetworkError('Network connection failed', { 
          code: 'ECONNREFUSED',
          hostname: 'demo.opencti.io' 
        });

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Network connection failed');
        expect(error.code).toBe('ECONNREFUSED');
        expect(error.hostname).toBe('demo.opencti.io');
      });

      it('should handle timeout scenarios', () => {
        const error = new NetworkError('Request timeout', { 
          code: 'ETIMEDOUT',
          timeout: 30000 
        });

        expect(error.message).toBe('Request timeout');
        expect(error.code).toBe('ETIMEDOUT');
        expect(error.timeout).toBe(30000);
      });
    });

    describe('AuthRequestError', () => {
      it('should create an authentication error with correct properties', () => {
        const error = new AuthRequestError('Authentication failed', { 
          statusCode: 401,
          endpoint: '/graphql' 
        });

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Authentication failed');
        expect(error.statusCode).toBe(401);
        expect(error.endpoint).toBe('/graphql');
      });

      it('should handle forbidden scenarios', () => {
        const error = new AuthRequestError('Access forbidden', { 
          statusCode: 403,
          reason: 'Insufficient permissions' 
        });

        expect(error.message).toBe('Access forbidden');
        expect(error.statusCode).toBe(403);
        expect(error.reason).toBe('Insufficient permissions');
      });
    });

    describe('RetryRequestError', () => {
      it('should create a retry request error with correct properties', () => {
        const error = new RetryRequestError('Request failed, retrying', { 
          attempt: 3,
          maxRetries: 5 
        });

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Request failed, retrying');
        expect(error.attempt).toBe(3);
        expect(error.maxRetries).toBe(5);
      });

      it('should handle rate limiting scenarios', () => {
        const error = new RetryRequestError('Rate limited', { 
          retryAfter: 60,
          statusCode: 429 
        });

        expect(error.message).toBe('Rate limited');
        expect(error.retryAfter).toBe(60);
        expect(error.statusCode).toBe(429);
      });
    });
  });

  describe('parseErrorToReadableJSON Function', () => {
    it('should parse error objects to readable JSON', () => {
      const error = new Error('Test error message');
      error.statusCode = 500;
      error.code = 'TEST_ERROR';

      const readable = parseErrorToReadableJSON(error);

      expect(readable).toHaveProperty('message', 'Test error message');
      expect(readable).toHaveProperty('statusCode', 500);
      expect(readable).toHaveProperty('code', 'TEST_ERROR');
    });

    it('should handle errors with stack traces', () => {
      const error = new Error('Stack trace test');
      error.stack = 'Error: Stack trace test\n    at test.js:1:1';

      const readable = parseErrorToReadableJSON(error);

      expect(readable).toHaveProperty('message', 'Stack trace test');
      expect(readable).toHaveProperty('stack');
    });

    it('should handle null and undefined errors', () => {
      const nullResult = parseErrorToReadableJSON(null);
      const undefinedResult = parseErrorToReadableJSON(undefined);

      expect(nullResult).toBeDefined();
      expect(undefinedResult).toBeDefined();
    });

    it('should handle errors with circular references', () => {
      const error = new Error('Circular reference test');
      error.circular = error; // Create circular reference

      const readable = parseErrorToReadableJSON(error);

      expect(readable).toHaveProperty('message', 'Circular reference test');
      // Should not throw due to circular reference
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const apiError = new ApiRequestError('API error');
      const networkError = new NetworkError('Network error');
      const authError = new AuthRequestError('Auth error');
      const retryError = new RetryRequestError('Retry error');

      expect(apiError).toBeInstanceOf(Error);
      expect(networkError).toBeInstanceOf(Error);
      expect(authError).toBeInstanceOf(Error);
      expect(retryError).toBeInstanceOf(Error);
    });

    it('should support instanceof checks', () => {
      const apiError = new ApiRequestError('API error');
      
      expect(apiError instanceof ApiRequestError).toBe(true);
      expect(apiError instanceof Error).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical OpenCTI error workflow', () => {
      // Simulate authentication failure
      const authError = new AuthRequestError('Invalid API key', {
        statusCode: 401,
        url: 'https://demo.opencti.io/graphql'
      });

      expect(authError.statusCode).toBe(401);
      expect(authError.url).toBe('https://demo.opencti.io/graphql');

      // Convert to readable format
      const readable = parseErrorToReadableJSON(authError);
      expect(readable).toHaveProperty('statusCode', 401);
    });

    it('should handle network connectivity issues', () => {
      // Simulate connection timeout
      const networkError = new NetworkError('Connection timeout', {
        code: 'ETIMEDOUT',
        address: '192.168.1.100',
        port: 443
      });

      expect(networkError.code).toBe('ETIMEDOUT');
      expect(networkError.address).toBe('192.168.1.100');
      expect(networkError.port).toBe(443);
    });

    it('should handle retry scenarios', () => {
      // Simulate rate limiting that requires retry
      const retryError = new RetryRequestError('Rate limit exceeded', {
        statusCode: 429,
        retryAfter: 60,
        attempt: 2,
        maxRetries: 5
      });

      expect(retryError.statusCode).toBe(429);
      expect(retryError.attempt).toBe(2);
      expect(retryError.maxRetries).toBe(5);

      // Should be serializable
      const json = retryError.toJSON();
      expect(json.retryAfter).toBe(60);
    });
  });

  describe('Module Exports', () => {
    it('should export all required error classes', () => {
      expect(typeof ApiRequestError).toBe('function');
      expect(typeof NetworkError).toBe('function');
      expect(typeof AuthRequestError).toBe('function');
      expect(typeof RetryRequestError).toBe('function');
    });

    it('should export parseErrorToReadableJSON function', () => {
      expect(typeof parseErrorToReadableJSON).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new ApiRequestError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
    });

    it('should handle errors with special characters', () => {
      const specialMessage = 'Error with special chars: !@#$%^&*()_+{}|:"<>?';
      const error = new NetworkError(specialMessage);

      expect(error.message).toBe(specialMessage);
    });

    it('should handle errors with Unicode characters', () => {
      const unicodeMessage = 'Error with Unicode: 测试错误消息 🚫';
      const error = new AuthRequestError(unicodeMessage);

      expect(error.message).toBe(unicodeMessage);
    });

    it('should handle properties with undefined values', () => {
      const error = new ApiRequestError('Test', {
        definedProp: 'value',
        undefinedProp: undefined,
        nullProp: null
      });

      expect(error.definedProp).toBe('value');
      expect(error.undefinedProp).toBeUndefined();
      expect(error.nullProp).toBeNull();
    });
  });
}); 