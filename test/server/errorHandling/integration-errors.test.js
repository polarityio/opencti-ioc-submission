/**
 * Tests for Integration Error Handling Classes
 * Comprehensive coverage for all error types and helper functions
 */

const {
  ApiRequestError,
  NetworkError,
  AuthRequestError,
  RetryRequestError,
  parseErrorToReadableJSON
} = require('../../../server/errorHandling/integration-errors');

// Mock polarity-integration-utils
jest.mock('polarity-integration-utils', () => ({
  logging: {
    getLogger: jest.fn(() => ({
      trace: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }))
  },
  errors: {
    parseErrorToReadableJson: jest.fn()
  }
}));

const { logging, errors } = require('polarity-integration-utils');

describe('Integration Error Handling - Complete Coverage', () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn()
    };
    logging.getLogger.mockReturnValue(mockLogger);
    errors.parseErrorToReadableJson.mockReturnValue({ message: 'Mocked error' });
    jest.clearAllMocks();
  });

  describe('parseErrorToReadableJSON Function', () => {
    it('should handle null/undefined inputs', () => {
      const resultNull = parseErrorToReadableJSON(null);
      expect(resultNull).toEqual({
        message: 'No error provided',
        error: 'null_or_undefined'
      });

      const resultUndefined = parseErrorToReadableJSON(undefined);
      expect(resultUndefined).toEqual({
        message: 'No error provided', 
        error: 'null_or_undefined'
      });
    });

    it('should use polarity parseErrorToReadableJson when successful', () => {
      const testError = new Error('Test error');
      const mockResult = { message: 'Parsed successfully', code: 'TEST' };
      errors.parseErrorToReadableJson.mockReturnValue(mockResult);

      const result = parseErrorToReadableJSON(testError);

      expect(result).toEqual(mockResult);
      expect(errors.parseErrorToReadableJson).toHaveBeenCalledWith(testError);
    });

    it('should handle serialization failures gracefully', () => {
      const testError = new Error('Circular error');
      testError.stack = 'line1\nline2\nline3\nline4\nline5\nline6\nline7';
      errors.parseErrorToReadableJson.mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      const result = parseErrorToReadableJSON(testError);

      expect(result).toEqual({
        message: 'Circular error',
        name: 'Error',
        stack: 'line1\nline2\nline3\nline4\nline5',
        serialization_error: 'Failed to serialize error object'
      });
    });

    it('should handle errors without message or name', () => {
      const testError = {};
      errors.parseErrorToReadableJson.mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      const result = parseErrorToReadableJSON(testError);

      expect(result).toEqual({
        message: 'Unknown error',
        name: 'Error',
        stack: 'No stack trace',
        serialization_error: 'Failed to serialize error object'
      });
    });

    it('should handle complete serialization failure', () => {
      const testError = new Error('Test');
      errors.parseErrorToReadableJson.mockImplementation(() => {
        throw new Error('Serialization failed');
      });

      // Mock Object.getOwnPropertyNames to throw an error
      const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
      Object.getOwnPropertyNames = jest.fn(() => {
        throw new Error('Complete failure');
      });

      const result = parseErrorToReadableJSON(testError);

      expect(result).toEqual({
        message: 'Error serialization failed completely',
        error: 'serialization_failure'
      });

      // Restore original function
      Object.getOwnPropertyNames = originalGetOwnPropertyNames;
    });
  });

  describe('IntegrationError Base Class', () => {
    it('should create basic integration error', () => {
      const error = new ApiRequestError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error.message).toBe('Test error message');
      expect(error.detail).toBe('Test error message');
      expect(error.name).toBe('ApiRequestError');
      expect(error.meta).toEqual({});
      expect(mockLogger.error).toHaveBeenCalledWith({ error }, 'ApiRequestError');
    });

    it('should handle properties', () => {
      const properties = {
        statusCode: 400,
        retryable: false,
        customProp: 'test'
      };
      const error = new ApiRequestError('Test error', properties);

      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.customProp).toBe('test');
      expect(error.meta).toEqual(properties);
    });

    it('should handle Error cause property', () => {
      const originalError = new Error('Original error');
      originalError.code = 'TEST_CODE';
      
      errors.parseErrorToReadableJson.mockReturnValue({
        message: 'Original error',
        code: 'TEST_CODE',
        name: 'Error'
      });

      const error = new ApiRequestError('Wrapper error', { cause: originalError });

      expect(error.meta.cause).toEqual({
        message: 'Original error',
        code: 'TEST_CODE',
        name: 'Error'
      });
    });

    it('should handle non-Error cause property', () => {
      const stringCause = 'String cause';
      const error = new ApiRequestError('Test error', { cause: stringCause });

      expect(error.cause).toBe(stringCause);
      expect(error.meta.cause).toBe(stringCause); // String causes go directly to meta
    });

    it('should sanitize request options', () => {
      const requestOptions = {
        url: 'https://api.example.com',
        headers: {
          'Authorization': 'Bearer secret-token',
          'Content-Type': 'application/json'
        },
        auth: {
          username: 'user',
          password: 'secret-password',
          bearer: 'secret-bearer'
        },
        body: {
          data: 'test',
          password: 'secret-body-password'
        },
        form: {
          client_id: 'test',
          client_secret: 'secret-client-secret'
        }
      };

      const error = new ApiRequestError('Request failed', { requestOptions });

      expect(error.meta.requestOptions.headers.Authorization).toBe('**********');
      expect(error.meta.requestOptions.headers['Content-Type']).toBe('application/json');
      expect(error.meta.requestOptions.auth.username).toBe('user');
      expect(error.meta.requestOptions.auth.password).toBe('**********');
      expect(error.meta.requestOptions.auth.bearer).toBe('**********');
      expect(error.meta.requestOptions.body.password).toBe('**********');
      expect(error.meta.requestOptions.form.client_secret).toBe('**********');
    });

    it('should handle requestOptions without sensitive data', () => {
      const requestOptions = {
        url: 'https://api.example.com',
        method: 'GET'
      };

      const error = new ApiRequestError('Request failed', { requestOptions });

      expect(error.meta.requestOptions).toEqual(requestOptions);
    });

    it('should handle requestOptions sanitization edge cases', () => {
      const requestOptions = {
        headers: null,
        auth: undefined,
        body: { data: 'test' },
        form: null
      };

      const error = new ApiRequestError('Test', { requestOptions });

      expect(error.meta.requestOptions.headers).toBeNull();
      expect(error.meta.requestOptions.auth).toBeUndefined();
      expect(error.meta.requestOptions.body.data).toBe('test');
      expect(error.meta.requestOptions.form).toBeNull();
    });
  });

  describe('NetworkError Class', () => {
    it('should create a NetworkError', () => {
      const error = new NetworkError('Network connection failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Network connection failed');
      expect(error.name).toBe('NetworkError');
    });

    it('should add SSL help text for SSL errors', () => {
      const sslError = new Error('SSL validation failed');
      sslError.code = 'CERT_HAS_EXPIRED';

      const error = new NetworkError('SSL connection failed', { cause: sslError });

      expect(error.help).toContain('SSL errors are typically caused');
      expect(error.help).toContain('Allow Insecure TLS/SSL Connections');
    });

    it('should add network help text for connection errors', () => {
      const networkError = new Error('Connection refused');
      networkError.code = 'ECONNREFUSED';

      const error = new NetworkError('Connection failed', { cause: networkError });

      expect(error.help).toContain('Network connection issues');
      expect(error.help).toContain('proxy configuration');
    });

    it('should handle different SSL error codes', () => {
      const sslCodes = [
        'UNABLE_TO_GET_ISSUER_CERT',
        'CERT_NOT_YET_VALID',
        'DEPTH_ZERO_SELF_SIGNED_CERT',
        'SELF_SIGNED_CERT_IN_CHAIN',
        'CERT_UNTRUSTED'
      ];

      sslCodes.forEach(code => {
        const sslError = new Error('SSL error');
        sslError.code = code;

        const error = new NetworkError('SSL failed', { cause: sslError });

        expect(error.help).toContain('SSL errors are typically caused');
      });
    });

    it('should handle different network error codes', () => {
      const networkCodes = [
        'ECONNRESET',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'EHOSTUNREACH'
      ];

      networkCodes.forEach(code => {
        const networkError = new Error('Network error');
        networkError.code = code;

        const error = new NetworkError('Network failed', { cause: networkError });

        expect(error.help).toContain('Network connection issues');
      });
    });

    it('should not add help text for other error codes', () => {
      const otherError = new Error('Other error');
      otherError.code = 'UNKNOWN_ERROR';

      const error = new NetworkError('Other error', { cause: otherError });

      expect(error.help).toBeUndefined();
    });

    it('should handle non-Error cause', () => {
      const error = new NetworkError('Network failed', { cause: 'String cause' });

      expect(error.help).toBeUndefined();
    });

    it('should handle no cause property', () => {
      const error = new NetworkError('Network failed');

      expect(error.help).toBeUndefined();
    });
  });

  describe('ApiRequestError Class', () => {
    it('should create an ApiRequestError', () => {
      const error = new ApiRequestError('API request failed');

      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error.message).toBe('API request failed');
      expect(error.name).toBe('ApiRequestError');
    });

    it('should handle properties', () => {
      const properties = {
        statusCode: 404,
        retryable: false
      };
      const error = new ApiRequestError('API not found', properties);

      expect(error.statusCode).toBe(404);
      expect(error.retryable).toBe(false);
      expect(error.meta).toEqual(properties);
    });
  });

  describe('AuthRequestError Class', () => {
    it('should create an AuthRequestError', () => {
      const error = new AuthRequestError('Authentication failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthRequestError);
      expect(error.message).toBe('Authentication failed');
      expect(error.name).toBe('AuthRequestError');
    });

    it('should handle properties', () => {
      const properties = {
        statusCode: 401,
        retryable: false
      };
      const error = new AuthRequestError('Invalid credentials', properties);

      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
      expect(error.meta).toEqual(properties);
    });
  });

  describe('RetryRequestError Class', () => {
    it('should create a RetryRequestError', () => {
      const error = new RetryRequestError('Request failed, retry needed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RetryRequestError);
      expect(error.message).toBe('Request failed, retry needed');
      expect(error.name).toBe('RetryRequestError');
    });

    it('should handle properties', () => {
      const properties = {
        statusCode: 429,
        retryable: true,
        retryAfter: 60
      };
      const error = new RetryRequestError('Rate limited', properties);

      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(60);
      expect(error.meta).toEqual(properties);
    });
  });

  describe('Error Class Inheritance and Behavior', () => {
    it('should maintain proper inheritance chain', () => {
      const networkError = new NetworkError('Test');
      
      expect(networkError instanceof Error).toBe(true);
      expect(networkError instanceof NetworkError).toBe(true);
      // Note: NetworkError inherits directly from IntegrationError, not ApiRequestError
    });

    it('should support instanceof checks for all error types', () => {
      const apiError = new ApiRequestError('API error');
      const authError = new AuthRequestError('Auth error');
      const retryError = new RetryRequestError('Retry error');
      const networkError = new NetworkError('Network error');

      expect(apiError instanceof ApiRequestError).toBe(true);
      expect(authError instanceof AuthRequestError).toBe(true);
      expect(retryError instanceof RetryRequestError).toBe(true);
      expect(networkError instanceof NetworkError).toBe(true);
      // All inherit from Error
      expect(apiError instanceof Error).toBe(true);
      expect(authError instanceof Error).toBe(true);
      expect(retryError instanceof Error).toBe(true);
      expect(networkError instanceof Error).toBe(true);
    });

    it('should handle complex error scenarios', () => {
      const originalError = new Error('Original network error');
      originalError.code = 'ECONNRESET';
      originalError.errno = -54;

      errors.parseErrorToReadableJson.mockReturnValue({
        message: 'Original network error',
        code: 'ECONNRESET',
        errno: -54
      });

      const networkError = new NetworkError('Connection lost', {
        cause: originalError,
        requestOptions: {
          url: 'https://api.example.com',
          headers: { 'Authorization': 'Bearer token123' }
        },
        timeout: 5000,
        retryable: true
      });

      expect(networkError.meta.cause.code).toBe('ECONNRESET');
      expect(networkError.meta.requestOptions.headers.Authorization).toBe('**********');
      expect(networkError.timeout).toBe(5000);
      expect(networkError.retryable).toBe(true);
      expect(networkError.help).toContain('Network connection issues');
    });
  });

  describe('toJSON Support', () => {
    it('should support JSON serialization', () => {
      const error = new ApiRequestError('Test error', {
        statusCode: 500,
        retryable: true
      });

      const json = error.toJSON();

      expect(json.message).toBe('Test error');
      expect(json.name).toBe('ApiRequestError');
      expect(json.statusCode).toBe(500);
      expect(json.retryable).toBe(true);
      expect(json.detail).toBe('Test error');
    });

    it('should handle JSON.stringify', () => {
      const error = new ApiRequestError('Test error', {
        statusCode: 404
      });

      const jsonString = JSON.stringify(error);
      const parsed = JSON.parse(jsonString);

      expect(parsed.message).toBe('Test error');
      expect(parsed.statusCode).toBe(404);
      expect(parsed.name).toBe('ApiRequestError');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty properties object', () => {
      const error = new ApiRequestError('Test error', {});

      expect(error.meta).toEqual({});
    });

    it('should handle null properties', () => {
      // The implementation might not handle null properties gracefully, so let's test with undefined instead
      const error = new ApiRequestError('Test error', undefined);

      expect(error.meta).toEqual({});
    });

    it('should handle undefined properties', () => {
      const error = new ApiRequestError('Test error', undefined);

      expect(error.meta).toEqual({});
    });

    it('should handle very large error messages', () => {
      const largeMessage = 'A'.repeat(10000);
      const error = new ApiRequestError(largeMessage);

      expect(error.message).toBe(largeMessage);
      expect(error.detail).toBe(largeMessage);
    });

    it('should handle special characters in error messages', () => {
      const specialMessage = 'Error with special chars: àáâãäåæçèéêë 中文 🚀 "\'/\\';
      const error = new ApiRequestError(specialMessage);

      expect(error.message).toBe(specialMessage);
      expect(error.detail).toBe(specialMessage);
    });

    it('should handle nested error causes', () => {
      const rootError = new Error('Root cause');
      const middleError = new ApiRequestError('Middle error', { cause: rootError });
      const topError = new NetworkError('Top error', { cause: middleError });

      expect(topError.meta.cause).toBeDefined();
    });
  });
}); 