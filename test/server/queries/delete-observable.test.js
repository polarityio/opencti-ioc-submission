/**
 * Test Suite: OpenCTI Delete Observable
 * Tests the delete observable functionality with comprehensive coverage
 */

const { deleteObservable, DELETE_OBSERVABLE_MUTATION } = require('../../../server/queries/delete-observable');

// Mock the request function
jest.mock('../../../server/core', () => ({
  makeOpenCTIRequest: jest.fn()
}));

const { makeOpenCTIRequest } = require('../../../server/core');

describe('OpenCTI Delete Observable', () => {
  let mockLogger;
  const mockOptions = {
    url: 'https://demo.opencti.io',
    apiKey: 'test-api-key-123'
  };

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

  describe('deleteObservable Function', () => {
    const observableId = 'observable-uuid-123';

    describe('Successful Deletion', () => {
      it('should successfully delete an observable', async () => {
        const mockResponse = {
          stixCyberObservableEdit: {
            delete: observableId
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await deleteObservable(observableId, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          DELETE_OBSERVABLE_MUTATION,
          { id: observableId },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(observableId);
        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Deleting OpenCTI observable',
          { observableId }
        );
      });

      it('should work without logger parameter', async () => {
        const mockResponse = {
          stixCyberObservableEdit: {
            delete: observableId
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await deleteObservable(observableId, mockOptions);

        expect(result).toEqual(observableId);
        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          DELETE_OBSERVABLE_MUTATION,
          { id: observableId },
          mockOptions,
          expect.any(Object)  // Logger instance expected, not undefined
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        const networkError = new Error('Network request failed');
        makeOpenCTIRequest.mockRejectedValue(networkError);

        await expect(deleteObservable(observableId, mockOptions, mockLogger))
          .rejects.toThrow('Network request failed');

        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Deleting OpenCTI observable',
          { observableId }
        );
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

        await expect(deleteObservable(observableId, mockOptions, mockLogger))
          .rejects.toThrow('Authentication failed: Invalid API key or insufficient permissions');
      });

      it('should handle GraphQL errors', async () => {
        const graphqlError = new Error('GraphQL validation error');
        graphqlError.body = {
          errors: [{
            message: 'Invalid request format or parameters.',
            extensions: { code: 'GRAPHQL_VALIDATION_FAILED' }
          }]
        };
        makeOpenCTIRequest.mockRejectedValue(graphqlError);

        await expect(deleteObservable(observableId, mockOptions, mockLogger))
          .rejects.toThrow('OpenCTI GraphQL error: Invalid request format or parameters.');
      });
    });

    describe('Edge Cases', () => {
      it('should handle malformed response body', async () => {
        makeOpenCTIRequest.mockResolvedValue(null);

        const result = await deleteObservable(observableId, mockOptions, mockLogger);
        expect(result).toBeUndefined();
      });

      it('should handle response without stixCyberObservableEdit field', async () => {
        makeOpenCTIRequest.mockResolvedValue({});

        const result = await deleteObservable(observableId, mockOptions, mockLogger);
        expect(result).toBeUndefined();
      });
    });

    describe('Request Validation', () => {
      it('should use correct mutation and variables', async () => {
        const mockResponse = { stixCyberObservableEdit: { delete: observableId } };
        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        await deleteObservable(observableId, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          DELETE_OBSERVABLE_MUTATION,
          { id: observableId },
          mockOptions,
          mockLogger
        );
      });
    });
  });

  describe('DELETE_OBSERVABLE_MUTATION Constant', () => {
    it('should export the correct GraphQL mutation', () => {
      expect(DELETE_OBSERVABLE_MUTATION).toBeDefined();
      expect(DELETE_OBSERVABLE_MUTATION).toContain('mutation DeleteObservable');
      expect(DELETE_OBSERVABLE_MUTATION).toContain('stixCyberObservableEdit');
      expect(DELETE_OBSERVABLE_MUTATION).toContain('$id: ID!');
      expect(DELETE_OBSERVABLE_MUTATION).toContain('delete');
    });

    it('should be a valid GraphQL mutation string', () => {
      expect(typeof DELETE_OBSERVABLE_MUTATION).toBe('string');
      expect(DELETE_OBSERVABLE_MUTATION.trim().length).toBeGreaterThan(0);
      expect(DELETE_OBSERVABLE_MUTATION).toMatch(/mutation\s+\w+/);
    });
  });

  describe('Module Exports', () => {
    it('should export deleteObservable function', () => {
      expect(typeof deleteObservable).toBe('function');
    });

    it('should export DELETE_OBSERVABLE_MUTATION constant', () => {
      expect(typeof DELETE_OBSERVABLE_MUTATION).toBe('string');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle deletion of different observable types', async () => {
      const observableTypes = [
        {
          type: 'domain',
          id: 'domain-name--uuid-123'
        },
        {
          type: 'ipv4',
          id: 'ipv4-addr--uuid-456'
        },
        {
          type: 'file',
          id: 'file--uuid-789'
        }
      ];

      for (const observable of observableTypes) {
        makeOpenCTIRequest.mockResolvedValue({
          stixCyberObservableEdit: { delete: observable.id }
        });

        const result = await deleteObservable(observable.id, mockOptions, mockLogger);

        expect(result).toEqual(observable.id);
        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Deleting OpenCTI observable',
          { observableId: observable.id }
        );
      }
    });

    it('should handle concurrent observable deletion requests', async () => {
      const observableIds = ['obs1', 'obs2', 'obs3'];
      const promises = [];

      // Set up mock responses for each request
      observableIds.forEach((id, index) => {
        makeOpenCTIRequest.mockResolvedValueOnce({
          stixCyberObservableEdit: { delete: id }
        });
      });

      // Make concurrent requests
      observableIds.forEach(id => {
        promises.push(deleteObservable(id, mockOptions, mockLogger));
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBe(observableIds[index]);
      });

      expect(makeOpenCTIRequest).toHaveBeenCalledTimes(3);
    });
  });
}); 