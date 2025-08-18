/**
 * Tests for OpenCTI Indicators and Observables Search Query
 * Ensures Phase 2 coverage requirements are met for query modules
 */

const { 
  searchIndicatorsAndObservables, 
  SEARCH_INDICATORS_AND_OBSERVABLES_QUERY 
} = require('../../../server/queries/search-indicators-and-observables');

// Mock polarity-integration-utils
jest.mock('polarity-integration-utils', () => ({
  logging: {
    getLogger: jest.fn(() => ({
      trace: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }))
  }
}));

// Mock errors module
jest.mock('../../../server/errorHandling/opencti-errors', () => ({
  isAuthRequiredError: jest.fn(),
  isGraphQLError: jest.fn(),
  parseOpenCTIError: jest.fn()
}));

// Mock postman-request
jest.mock('postman-request', () => {
  return jest.fn();
});

const request = require('postman-request');
const { isAuthRequiredError, isGraphQLError, parseOpenCTIError } = require('../../../server/errorHandling/opencti-errors');

describe('OpenCTI Search Indicators and Observables', () => {
  const mockEntity = {
    value: 'example.com',
    type: 'domain'
  };

  const mockOptions = {
    url: 'https://demo.opencti.io',
    apiKey: 'test-api-key',
    timeout: 30000
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

  describe('searchIndicatorsAndObservables Function', () => {
    it('should successfully search for indicators and observables', async () => {
      const mockResponse = {
        indicators: {
          edges: [
            {
              node: {
                id: 'indicator-1',
                pattern: '[domain-name:value = "example.com"]',
                name: 'example.com',
                confidence: 75
              }
            }
          ]
        },
        stixCyberObservables: {
          edges: [
            {
              node: {
                id: 'observable-1',
                observable_value: 'example.com',
                x_opencti_score: 80
              }
            }
          ]
        }
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await searchIndicatorsAndObservables(mockEntity, mockOptions, mockLogger);

      expect(result).toEqual({
        indicators: mockResponse.indicators,
        observables: mockResponse.stixCyberObservables
      });

      expect(mockLogger.trace).toHaveBeenCalledWith('Searching OpenCTI for indicators and observables', {
        entity: 'example.com',
        type: 'domain'
      });

      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          uri: 'https://demo.opencti.io/graphql',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          body: {
            query: expect.stringContaining('query GetIndicatorsAndObservables'),
            variables: { search: '"example.com"' }
          },
          json: true,
          timeout: 30000
        }),
        expect.any(Function)
      );
    });

    it('should handle empty results gracefully', async () => {
      const mockResponse = {
        indicators: { edges: [] },
        stixCyberObservables: { edges: [] }
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await searchIndicatorsAndObservables(mockEntity, mockOptions, mockLogger);

      expect(result).toEqual({
        indicators: { edges: [] },
        observables: { edges: [] }
      });

      expect(mockLogger.trace).toHaveBeenCalledWith('OpenCTI search completed successfully', {
        indicators: 0,
        observables: 0,
        searchConfig: { searchIndicators: true, searchObservables: true }
      });
    });

    it('should handle missing indicators or observables in response', async () => {
      const mockResponse = {
        indicators: null,
        stixCyberObservables: null
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await searchIndicatorsAndObservables(mockEntity, mockOptions, mockLogger);

      expect(result).toEqual({
        indicators: { edges: [] },
        observables: { edges: [] }
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      
      request.mockImplementation((options, callback) => {
        callback(networkError);
      });

      await expect(searchIndicatorsAndObservables(mockEntity, mockOptions, mockLogger))
        .rejects.toThrow('Network timeout');

      expect(mockLogger.error).toHaveBeenCalledWith('OpenCTI search failed', {
        entity: 'example.com',
        error: 'Network request failed: Network timeout'
      });
    });

    it('should handle HTTP errors', async () => {
      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 500 }, { error: 'Internal Server Error' });
      });

      await expect(searchIndicatorsAndObservables(mockEntity, mockOptions, mockLogger))
        .rejects.toThrow('HTTP 500: Internal Server Error');

      expect(mockLogger.error).toHaveBeenCalledWith('OpenCTI request failed with non-200 status', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      });
    });

    it('should handle AUTH_REQUIRED errors', async () => {
      const authError = {
        message: 'Authentication failed',
        body: {
          errors: [{ extensions: { code: 'AUTH_REQUIRED' } }]
        }
      };

      isAuthRequiredError.mockReturnValue(true);

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { errors: [{ message: 'You must be logged in' }] });
      });

      await expect(searchIndicatorsAndObservables(mockEntity, mockOptions, mockLogger))
        .rejects.toThrow('Authentication failed: Invalid API key or insufficient permissions');

      expect(isAuthRequiredError).toHaveBeenCalled();
    });

    it('should handle GraphQL errors', async () => {
      const graphqlError = {
        message: 'GraphQL error',
        body: {
          errors: [{ message: 'Field not found' }]
        }
      };

      isAuthRequiredError.mockReturnValue(false);
      isGraphQLError.mockReturnValue(true);
      parseOpenCTIError.mockReturnValue({ message: 'Field not found' });

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { errors: [{ message: 'Field not found' }] });
      });

      await expect(searchIndicatorsAndObservables(mockEntity, mockOptions, mockLogger))
        .rejects.toThrow('OpenCTI GraphQL error: Field not found');

      expect(parseOpenCTIError).toHaveBeenCalled();
    });

    it('should work without logger parameter', async () => {
      const mockResponse = {
        indicators: { edges: [] },
        stixCyberObservables: { edges: [] }
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await searchIndicatorsAndObservables(mockEntity, mockOptions);

      expect(result).toEqual({
        indicators: { edges: [] },
        observables: { edges: [] }
      });
    });
  });

  describe('GraphQL Query Constant', () => {
    it('should export the correct GraphQL query', () => {
      expect(SEARCH_INDICATORS_AND_OBSERVABLES_QUERY).toContain('query GetIndicatorsAndObservables');
      expect(SEARCH_INDICATORS_AND_OBSERVABLES_QUERY).toContain('indicators(');
      expect(SEARCH_INDICATORS_AND_OBSERVABLES_QUERY).toContain('stixCyberObservables(');
      expect(SEARCH_INDICATORS_AND_OBSERVABLES_QUERY).toContain('$search: String!');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed response body', async () => {
      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, 'invalid json');
      });

      await expect(searchIndicatorsAndObservables(mockEntity, mockOptions, mockLogger))
        .rejects.toThrow();
    });

    it('should handle entity with special characters', async () => {
      const specialEntity = {
        value: 'test@example.com',
        type: 'email'
      };

      const mockResponse = {
        indicators: { edges: [] },
        stixCyberObservables: { edges: [] }
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      await searchIndicatorsAndObservables(specialEntity, mockOptions, mockLogger);

      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            query: expect.stringContaining('query GetIndicatorsAndObservables'),
            variables: { search: '"test@example.com"' }
          }
        }),
        expect.any(Function)
      );
    });

    it('should handle searchReturnTypes option to cover missing lines', async () => {
      const mockResponse = {
        indicators: { edges: [] },
        stixCyberObservables: { edges: [] }
      };

      // Test with searchReturnTypes option that should trigger lines 94-97
      const optionsWithSearchTypes = {
        ...mockOptions,
        searchReturnTypes: [
          { value: 'indicators' },
          'observables'  // Test both object and string formats
        ]
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await searchIndicatorsAndObservables(mockEntity, optionsWithSearchTypes, mockLogger);

      expect(result).toEqual({
        indicators: { edges: [] },
        observables: { edges: [] }
      });
    });
  });
}); 