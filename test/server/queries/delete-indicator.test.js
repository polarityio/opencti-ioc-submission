/**
 * Test Suite: OpenCTI Delete Indicator
 * Tests the delete indicator functionality with comprehensive coverage
 */

const { deleteIndicator, DELETE_INDICATOR_MUTATION } = require('../../../server/queries/delete-indicator');

// Mock the request function
jest.mock('../../../server/core', () => ({
  makeOpenCTIRequest: jest.fn()
}));

const { makeOpenCTIRequest } = require('../../../server/core');

describe('OpenCTI Delete Indicator', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  // Shared test data
  const mockOptions = {
    url: 'https://demo.opencti.io',
    apiKey: 'test-api-key-123'
  };

  const indicatorId = 'indicator-uuid-123';

  describe('deleteIndicator Function', () => {

    describe('Successful Deletion', () => {
      it('should successfully delete an indicator', async () => {
        const mockResponse = {
          indicatorDelete: indicatorId
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await deleteIndicator(indicatorId, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          DELETE_INDICATOR_MUTATION,
          { id: indicatorId },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse.indicatorDelete);
        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Deleting OpenCTI indicator',
          { indicatorId }
        );
      });

      it('should work without logger parameter', async () => {
        const mockResponse = {
          indicatorDelete: indicatorId
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await deleteIndicator(indicatorId, mockOptions);

        expect(result).toEqual(mockResponse.indicatorDelete);
        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          DELETE_INDICATOR_MUTATION,
          { id: indicatorId },
          mockOptions,
          expect.any(Object)  // Logger instance expected, not undefined
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        const networkError = new Error('Network request failed');
        makeOpenCTIRequest.mockRejectedValue(networkError);

        await expect(deleteIndicator(indicatorId, mockOptions, mockLogger))
          .rejects.toThrow('Network request failed');

        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Deleting OpenCTI indicator',
          { indicatorId }
        );
      });

      it('should handle HTTP errors', async () => {
        const httpError = new Error('HTTP 500: Internal Server Error');
        httpError.statusCode = 500;
        makeOpenCTIRequest.mockRejectedValue(httpError);

        await expect(deleteIndicator(indicatorId, mockOptions, mockLogger))
          .rejects.toThrow('HTTP 500: Internal Server Error');
      });

      it('should handle AUTH_REQUIRED errors', async () => {
        const authError = new Error('Authentication required');
        authError.body = {
          errors: [{
            extensions: { code: 'AUTH_REQUIRED' },
            message: 'Authentication required'
          }]
        };
        makeOpenCTIRequest.mockRejectedValue(authError);

        await expect(deleteIndicator(indicatorId, mockOptions, mockLogger))
          .rejects.toThrow('Authentication failed: Invalid API key or insufficient permissions');
      });

      it('should handle GraphQL errors', async () => {
        const graphqlError = new Error('GraphQL validation error');
        graphqlError.body = {
          errors: [{
            message: 'Invalid indicator ID format',
            extensions: { code: 'GRAPHQL_VALIDATION_FAILED' }
          }]
        };
        makeOpenCTIRequest.mockRejectedValue(graphqlError);

        await expect(deleteIndicator(indicatorId, mockOptions, mockLogger))
          .rejects.toThrow('OpenCTI GraphQL error: Invalid request format or parameters.');
      });

      it('should handle permission errors', async () => {
        const permissionError = new Error('Insufficient permissions');
        permissionError.body = {
          errors: [{
            message: 'You do not have permission to delete this indicator',
            extensions: { code: 'FORBIDDEN' }
          }]
        };
        makeOpenCTIRequest.mockRejectedValue(permissionError);

        await expect(deleteIndicator(indicatorId, mockOptions, mockLogger))
          .rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty indicator ID', async () => {
        await expect(deleteIndicator('', mockOptions, mockLogger))
          .rejects.toThrow();
      });

      it('should handle null indicator ID', async () => {
        await expect(deleteIndicator(null, mockOptions, mockLogger))
          .rejects.toThrow();
      });

      it('should handle undefined indicator ID', async () => {
        await expect(deleteIndicator(undefined, mockOptions, mockLogger))
          .rejects.toThrow();
      });

      it('should handle malformed response body', async () => {
        makeOpenCTIRequest.mockResolvedValue(null);

        const result = await deleteIndicator(indicatorId, mockOptions, mockLogger);
        expect(result).toBeUndefined();
      });

      it('should handle response without indicatorEdit field', async () => {
        makeOpenCTIRequest.mockResolvedValue({});

        const result = await deleteIndicator(indicatorId, mockOptions, mockLogger);
        expect(result).toBeUndefined();
      });

      it('should handle partial response data', async () => {
        const partialResponse = {
          indicatorDelete: indicatorId
        };

        makeOpenCTIRequest.mockResolvedValue(partialResponse);

        const result = await deleteIndicator(indicatorId, mockOptions, mockLogger);
        expect(result).toEqual(partialResponse.indicatorDelete);
      });
    });

    describe('Request Validation', () => {
      it('should use correct mutation and variables', async () => {
        const mockResponse = { indicatorDelete: indicatorId };
        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        await deleteIndicator(indicatorId, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledTimes(1);
        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          DELETE_INDICATOR_MUTATION,
          { id: indicatorId },
          mockOptions,
          mockLogger
        );
      });

      it('should handle different indicator ID formats', async () => {
        const testIds = [
          'indicator--12345678-1234-1234-1234-123456789abc',
          'simple-id-123',
          'very-long-indicator-id-with-many-characters-and-numbers-123456789'
        ];

        for (const testId of testIds) {
          makeOpenCTIRequest.mockResolvedValue({
            indicatorDelete: testId
          });

          const result = await deleteIndicator(testId, mockOptions, mockLogger);

          expect(makeOpenCTIRequest).toHaveBeenCalledWith(
            DELETE_INDICATOR_MUTATION,
            { id: testId },
            mockOptions,
            mockLogger
          );

          expect(result).toBe(testId);
        }
      });
    });
  });

  describe('DELETE_INDICATOR_MUTATION Constant', () => {
    it('should export the correct GraphQL mutation', () => {
      expect(DELETE_INDICATOR_MUTATION).toBeDefined();
      expect(DELETE_INDICATOR_MUTATION).toContain('mutation DeleteIndicator');
      expect(DELETE_INDICATOR_MUTATION).toContain('indicatorDelete');
      expect(DELETE_INDICATOR_MUTATION).toContain('$id: ID!');
    });

    it('should be a valid GraphQL mutation string', () => {
      expect(typeof DELETE_INDICATOR_MUTATION).toBe('string');
      expect(DELETE_INDICATOR_MUTATION.trim().length).toBeGreaterThan(0);
      expect(DELETE_INDICATOR_MUTATION).toMatch(/mutation\s+\w+/);
    });
  });

  describe('Module Exports', () => {
    it('should export deleteIndicator function', () => {
      expect(typeof deleteIndicator).toBe('function');
    });

    it('should export DELETE_INDICATOR_MUTATION constant', () => {
      expect(typeof DELETE_INDICATOR_MUTATION).toBe('string');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical deletion workflow', async () => {
      const workflowSteps = [
        {
          description: 'Delete indicator with standard ID',
          indicatorId: 'indicator--uuid-standard',
          expectedResponse: 'indicator--uuid-standard'
        },
        {
          description: 'Delete indicator with special characters in ID',
          indicatorId: 'indicator--with-special-chars_123',
          expectedResponse: 'indicator--with-special-chars_123'
        }
      ];

      for (const step of workflowSteps) {
        makeOpenCTIRequest.mockResolvedValue({
          indicatorDelete: step.expectedResponse
        });

        const result = await deleteIndicator(step.indicatorId, mockOptions, mockLogger);

        expect(result).toEqual(step.expectedResponse);
        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Deleting OpenCTI indicator',
          { indicatorId: step.indicatorId }
        );
      }
    });

    it('should handle concurrent deletion requests', async () => {
      const indicatorIds = ['id1', 'id2', 'id3'];
      const promises = [];

      // Set up mock responses for each request
      indicatorIds.forEach((id, index) => {
        makeOpenCTIRequest.mockResolvedValueOnce({
          indicatorDelete: id
        });
      });

      // Make concurrent requests
      indicatorIds.forEach(id => {
        promises.push(deleteIndicator(id, mockOptions, mockLogger));
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBe(indicatorIds[index]);
      });

      expect(makeOpenCTIRequest).toHaveBeenCalledTimes(3);
    });
  });
}); 