/**
 * TDD Tests for submitItems Action Function - OpenCTI Implementation
 * Following blink-ops patterns with individual action function testing
 */

const submitItems = require('../../../server/onMessage/submitItems');
const { createIndicator, createObservable } = require('../../../server/queries');
const assembleLookupResults = require('../../../server/core/assembleLookupResults');

// Mock dependencies for OpenCTI
jest.mock('../../../server/queries', () => ({
  createIndicator: jest.fn(),
  createObservable: jest.fn()
}));

jest.mock('../../../server/core/assembleLookupResults', () => jest.fn());

describe('submitItems Action Function - OpenCTI Implementation', () => {
  let mockOptions;
  let mockLogger;
  let mockCallback;

  beforeEach(() => {
    mockOptions = {
      apiKey: 'test-api-key',
      url: 'https://test-opencti.com'
    };
    mockLogger = {
      error: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn()
    };
    mockCallback = jest.fn();
    
    // Clear all mocks and reset their implementations
    jest.clearAllMocks();
    
    // Reset mock implementations to default success
    createIndicator.mockReset();
    createObservable.mockReset();
    assembleLookupResults.mockReset();
  });

  describe('Function Export', () => {
    test('should export submitItems function', () => {
      expect(submitItems).toBeDefined();
      expect(typeof submitItems).toBe('function');
    });

    test('should have correct function signature', () => {
      expect(submitItems.length).toBe(4); // actionParams, options, Logger, callback
    });
  });

  describe('Success Cases', () => {
    test('should successfully submit new indicators and observables', async () => {
      const actionParams = {
        itemsToSubmit: [
          {
            entity: { value: 'test-domain.com', type: 'domain' },
            submissionData: {
              name: 'test-domain.com',
              description: 'Test submission',
              score: 75
            }
          }
        ]
      };

      const mockIndicator = { id: 'new-indicator-1', name: 'test-domain.com' };
      const mockObservable = { id: 'new-observable-1', observable_value: 'test-domain.com' };
      const mockLookupResults = [{ data: { unified: [] } }];

      createIndicator.mockResolvedValue(mockIndicator);
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue(mockLookupResults);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(createIndicator).toHaveBeenCalled();
      expect(createObservable).toHaveBeenCalled();
      expect(assembleLookupResults).toHaveBeenCalled();
      
      expect(mockCallback).toHaveBeenCalledWith(null, {
        results: [
          {
            entity: actionParams.itemsToSubmit[0].entity,
            createdItems: [
              { type: 'indicator', data: mockIndicator },
              { type: 'observable', data: mockObservable }
            ],
            success: true,
            refreshedData: mockLookupResults[0].data
          }
        ],
        errors: [],
        success: true
      });
    });

    test('should successfully create indicators only (no observables)', async () => {
      const actionParams = {
        itemsToSubmit: [
          {
            entity: { value: 'test-domain.com', type: 'domain' },
            submissionData: {
              name: 'test-domain.com',
              description: 'Indicator only test',
              createIndicator: true,
              createObservable: false
            }
          }
        ]
      };

      const mockIndicator = { id: 'new-indicator-1', name: 'test-domain.com' };
      const mockLookupResults = [{ data: { unified: [] } }];

      createIndicator.mockResolvedValue(mockIndicator);
      assembleLookupResults.mockResolvedValue(mockLookupResults);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(createIndicator).toHaveBeenCalled();
      expect(createObservable).not.toHaveBeenCalled();
      
      expect(mockCallback).toHaveBeenCalledWith(null, {
        results: [
          {
            entity: actionParams.itemsToSubmit[0].entity,
            createdItems: [
              { type: 'indicator', data: mockIndicator }
            ],
            success: true,
            refreshedData: mockLookupResults[0].data
          }
        ],
        errors: [],
        success: true
      });
    });

    test('should successfully create observables only (no indicators)', async () => {
      const actionParams = {
        itemsToSubmit: [
          {
            entity: { value: 'test-domain.com', type: 'domain' },
            submissionData: {
              name: 'test-domain.com',
              description: 'Observable only test',
              createIndicator: false,
              createObservable: true
            }
          }
        ]
      };

      const mockObservable = { id: 'new-observable-1', observable_value: 'test-domain.com' };
      const mockLookupResults = [{ data: { unified: [] } }];

      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue(mockLookupResults);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(createIndicator).not.toHaveBeenCalled();
      expect(createObservable).toHaveBeenCalled();
      
      expect(mockCallback).toHaveBeenCalledWith(null, {
        results: [
          {
            entity: actionParams.itemsToSubmit[0].entity,
            createdItems: [
              { type: 'observable', data: mockObservable }
            ],
            success: true,
            refreshedData: mockLookupResults[0].data
          }
        ],
        errors: [],
        success: true
      });
    });
  });

  describe('Error Cases', () => {
    test('should handle createIndicator errors', async () => {
      const actionParams = {
        itemsToSubmit: [
          {
            entity: { value: 'test-domain.com', type: 'domain' },
            submissionData: {
              name: 'test-domain.com',
              description: 'Test submission'
            }
          }
        ]
      };

      const createError = new Error('Create failed');
      createIndicator.mockRejectedValue(createError);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ createError }),
        'OpenCTI creation error'
      );
      
      expect(mockCallback).toHaveBeenCalledWith(null, {
        results: [],
        errors: [
          {
            entity: actionParams.itemsToSubmit[0].entity,
            error: {
              message: 'Create failed',
              detail: 'Failed to create OpenCTI item'
            }
          }
        ],
        success: false
      });
    });

    test('should handle createObservable errors', async () => {
      const actionParams = {
        itemsToSubmit: [
          {
            entity: { value: 'test-domain.com', type: 'domain' },
            submissionData: {
              name: 'test-domain.com',
              description: 'Test submission'
            }
          }
        ]
      };

      const createError = new Error('Observable creation failed');
      createIndicator.mockResolvedValue({ id: 'indicator-1' });
      createObservable.mockRejectedValue(createError);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ createError }),
        'OpenCTI creation error'
      );
      
      expect(mockCallback).toHaveBeenCalledWith(null, {
        results: [],
        errors: [
          {
            entity: actionParams.itemsToSubmit[0].entity,
            error: {
              message: 'Observable creation failed',
              detail: 'Failed to create OpenCTI item'
            }
          }
        ],
        success: false
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty itemsToSubmit array', async () => {
      const actionParams = {
        itemsToSubmit: []
      };

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        results: [],
        errors: [],
        success: true
      });
      
      expect(createIndicator).not.toHaveBeenCalled();
      expect(createObservable).not.toHaveBeenCalled();
    });

    test('should handle missing itemsToSubmit property', async () => {
      const actionParams = {};

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        results: [],
        errors: [],
        success: true
      });
    });

    test('should handle multiple items with mixed success/failure', async () => {
      const actionParams = {
        itemsToSubmit: [
          {
            entity: { value: 'success-domain.com', type: 'domain' },
            submissionData: { name: 'success-domain.com' }
          },
          {
            entity: { value: 'error-domain.com', type: 'domain' },
            submissionData: { name: 'error-domain.com' }
          }
        ]
      };

      const mockIndicator = { id: 'new-indicator-1', name: 'success-domain.com' };
      const mockObservable = { id: 'new-observable-1', observable_value: 'success-domain.com' };
      const mockLookupResults = [{ data: { unified: [] } }];
      const createError = new Error('Create failed');

      // First call succeeds, second call fails
      createIndicator
        .mockResolvedValueOnce(mockIndicator)
        .mockRejectedValueOnce(createError);
      createObservable
        .mockResolvedValueOnce(mockObservable)
        .mockRejectedValueOnce(createError);
      assembleLookupResults.mockResolvedValue(mockLookupResults);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        results: [
          {
            entity: actionParams.itemsToSubmit[0].entity,
            createdItems: [
              { type: 'indicator', data: mockIndicator },
              { type: 'observable', data: mockObservable }
            ],
            success: true,
            refreshedData: mockLookupResults[0].data
          }
        ],
        errors: [
          {
            entity: actionParams.itemsToSubmit[1].entity,
            error: {
              message: 'Create failed',
              detail: 'Failed to create OpenCTI item'
            }
          }
        ],
        success: false
      });
    });

    test('should support legacy newIocsToSubmit parameter name', async () => {
      const actionParams = {
        newIocsToSubmit: [
          {
            entity: { value: 'legacy-domain.com', type: 'domain' },
            submissionData: { name: 'legacy-domain.com' }
          }
        ]
      };

      const mockIndicator = { id: 'legacy-indicator-1', name: 'legacy-domain.com' };
      const mockObservable = { id: 'legacy-observable-1', observable_value: 'legacy-domain.com' };
      const mockLookupResults = [{ data: { unified: [] } }];

      createIndicator.mockResolvedValue(mockIndicator);
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue(mockLookupResults);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);

      expect(createIndicator).toHaveBeenCalled();
      expect(createObservable).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: true,
        results: expect.arrayContaining([
          expect.objectContaining({
            entity: actionParams.newIocsToSubmit[0].entity
          })
        ])
      }));
    });
  });

  describe('Entity Type Coverage for convertEntityToObservable', () => {
    it('should handle IPv4 entities', async () => {
      const actionParams = {
        itemsToSubmit: [{
          entity: { value: '192.168.1.1', type: 'IPv4' },
          submissionData: { name: '192.168.1.1' }
        }]
      };
      
      const mockObservable = { id: 'new-observable-ipv4' };
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue([]);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);
      
      expect(createObservable).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: true
      }));
    });

    it('should handle IPv6 entities', async () => {
      const actionParams = {
        itemsToSubmit: [{
          entity: { value: '2001:db8::1', type: 'IPv6' },
          submissionData: { name: '2001:db8::1' }
        }]
      };
      
      const mockObservable = { id: 'new-observable-ipv6' };
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue([]);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);
      
      expect(createObservable).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: true
      }));
    });

    it('should handle email entities', async () => {
      const actionParams = {
        itemsToSubmit: [{
          entity: { value: 'test@example.com', type: 'email' },
          submissionData: { name: 'test@example.com' }
        }]
      };
      
      const mockObservable = { id: 'new-observable-email' };
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue([]);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);
      
      expect(createObservable).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: true
      }));
    });

    it('should handle MAC entities', async () => {
      const actionParams = {
        itemsToSubmit: [{
          entity: { value: '00:11:22:33:44:55', type: 'MAC' },
          submissionData: { name: '00:11:22:33:44:55' }
        }]
      };
      
      const mockObservable = { id: 'new-observable-mac' };
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue([]);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);
      
      expect(createObservable).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: true
      }));
    });

    it('should handle MD5 hash entities', async () => {
      const actionParams = {
        itemsToSubmit: [{
          entity: { value: 'd41d8cd98f00b204e9800998ecf8427e', type: 'MD5' },
          submissionData: { name: 'd41d8cd98f00b204e9800998ecf8427e' }
        }]
      };
      
      const mockObservable = { id: 'new-observable-md5' };
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue([]);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);
      
      expect(createObservable).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: true
      }));
    });

    it('should handle SHA1 hash entities', async () => {
      const actionParams = {
        itemsToSubmit: [{
          entity: { value: 'da39a3ee5e6b4b0d3255bfef95601890afd80709', type: 'SHA1' },
          submissionData: { name: 'da39a3ee5e6b4b0d3255bfef95601890afd80709' }
        }]
      };
      
      const mockObservable = { id: 'new-observable-sha1' };
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue([]);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);
      
      expect(createObservable).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: true
      }));
    });

    it('should handle SHA256 hash entities', async () => {
      const actionParams = {
        itemsToSubmit: [{
          entity: { value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', type: 'SHA256' },
          submissionData: { name: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }
        }]
      };
      
      const mockObservable = { id: 'new-observable-sha256' };
      createObservable.mockResolvedValue(mockObservable);
      assembleLookupResults.mockResolvedValue([]);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);
      
      expect(createObservable).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: true
      }));
    });

    it('should handle unknown entity types with default case', async () => {
      const actionParams = {
        itemsToSubmit: [{
          entity: { value: 'unknown-value', type: 'unknown-type' },
          submissionData: { name: 'unknown-value' }
        }]
      };
      
      assembleLookupResults.mockResolvedValue([]);

      await submitItems(actionParams, mockOptions, mockLogger, mockCallback);
      
      // Unknown entity types should not call createObservable (returns empty object)
      expect(createObservable).not.toHaveBeenCalled();
      // Should return error for unsupported entity type
      expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            entity: { value: 'unknown-value', type: 'unknown-type' },
            error: expect.objectContaining({
              message: 'Unsupported entity type for STIX pattern: unknown-type'
            })
          })
        ])
      }));
    });
  });
}); 