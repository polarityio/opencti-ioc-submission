/**
 * Tests for deleteItem Action Function - OpenCTI Implementation
 */

// Mock dependencies BEFORE requiring the module under test
const mockDeleteIndicator = jest.fn().mockResolvedValue({ success: true });
const mockDeleteObservable = jest.fn().mockResolvedValue({ success: true });
const mockAssembleLookupResults = jest.fn().mockResolvedValue([{
  entity: { value: 'test-entity' },
  data: {
    summary: ['Updated results'],
    details: { indicators: [], observables: [] }
  }
}]);

jest.mock('../../../server/queries', () => ({
  deleteIndicator: mockDeleteIndicator,
  deleteObservable: mockDeleteObservable
}));

jest.mock('../../../server/core/assembleLookupResults', () => ({
  assembleLookupResults: mockAssembleLookupResults
}));

describe('deleteItem Action Function', () => {
  let mockOptions, mockLogger, mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOptions = {
      deletionPermissions: [
        { value: "indicators", display: "Allow Indicator Deletion" },
        { value: "observables", display: "Allow Observable Deletion" }
      ],
      apiKey: 'test-api-key',
      baseUrl: 'https://test.com'
    };

    mockLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockCallback = jest.fn();
    
    // Reset mock implementations
    mockDeleteIndicator.mockResolvedValue({ success: true });
    mockDeleteObservable.mockResolvedValue({ success: true });
    mockAssembleLookupResults.mockResolvedValue([{
      entity: { value: 'test-entity' },
      data: {
        summary: ['Updated results'],
        details: { indicators: [], observables: [] }
      }
    }]);
  });

  describe('Function Export', () => {
    test('should export deleteItem function', () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      expect(typeof deleteItem).toBe('function');
    });

    test('should have correct function signature', () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      expect(deleteItem.length).toBe(4); // actionParams, options, Logger, callback
    });
  });

  describe('Success Cases', () => {
    test('should successfully delete indicator and return updated results', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      const actionParams = {
        itemToDelete: {
          id: 'test-indicator-id',
          type: 'indicator'
        },
        entity: { value: 'test-entity', type: 'domain' }
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockDeleteIndicator).toHaveBeenCalledWith('test-indicator-id', mockOptions, mockLogger);
      expect(mockAssembleLookupResults).toHaveBeenCalledWith(
        [actionParams.entity],
        mockOptions,
        mockLogger
      );
      expect(mockCallback).toHaveBeenCalledWith(null, {
        success: true,
        deletedItem: {
          id: 'test-indicator-id',
          type: 'indicator'
        },
        refreshedData: expect.objectContaining({
          summary: expect.any(Array),
          details: expect.any(Object)
        }),
        message: 'Indicator deleted successfully'
      });
    });

    test('should handle deletion without entity refresh', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      const actionParams = {
        itemToDelete: {
          id: 'test-observable-id',
          type: 'observable'
        }
        // No entity provided
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockDeleteObservable).toHaveBeenCalledWith('test-observable-id', mockOptions, mockLogger);
      expect(mockAssembleLookupResults).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {
        success: true,
        deletedItem: {
          id: 'test-observable-id',
          type: 'observable'
        },
        message: 'Observable deleted successfully'
      });
    });
  });

  describe('Error Cases', () => {
    test('should reject delete when no deletion permissions', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      mockOptions.deletionPermissions = [];
      const actionParams = {
        itemToDelete: {
          id: 'test-indicator-id',
          type: 'indicator'
        }
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Delete operation not permitted for indicators',
        userMessage: 'You do not have permission to delete indicators'
      });
      expect(mockDeleteIndicator).not.toHaveBeenCalled();
    });

    test('should handle deleteIndicator errors', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      const deleteError = new Error('Delete failed');
      mockDeleteIndicator.mockRejectedValue(deleteError);

      const actionParams = {
        itemToDelete: {
          id: 'test-indicator-id',
          type: 'indicator'
        },
        entity: { value: 'test-entity', type: 'domain' }
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          deleteError,
          itemToDelete: actionParams.itemToDelete,
          entity: actionParams.entity.value
        }),
        'OpenCTI deletion error'
      );
      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Delete failed',
        userMessage: 'Failed to delete item',
        error: deleteError
      });
    });

    test('should handle assembleLookupResults errors', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      const assembleError = new Error('Assembly failed');
      mockAssembleLookupResults.mockRejectedValue(assembleError);

      const actionParams = {
        itemToDelete: {
          id: 'test-indicator-id',
          type: 'indicator'
        },
        entity: { value: 'test-entity', type: 'domain' }
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Assembly failed',
        userMessage: 'Failed to delete item',
        error: assembleError
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing itemToDelete', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      const actionParams = {
        entity: { value: 'test-entity', type: 'domain' }
        // Missing itemToDelete
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Missing item to delete',
        userMessage: 'No item specified for deletion'
      });
      expect(mockDeleteIndicator).not.toHaveBeenCalled();
      expect(mockAssembleLookupResults).not.toHaveBeenCalled();
    });

    test('should handle missing entity', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      const actionParams = {
        itemToDelete: {
          id: 'test-indicator-id',
          type: 'indicator'
        }
        // Missing entity - should still work but not refresh
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockDeleteIndicator).toHaveBeenCalledWith('test-indicator-id', mockOptions, mockLogger);
      expect(mockAssembleLookupResults).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {
        success: true,
        deletedItem: {
          id: 'test-indicator-id',
          type: 'indicator'
        },
        message: 'Indicator deleted successfully'
      });
    });

    test('should handle unknown item type', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      const actionParams = {
        itemToDelete: {
          id: 'test-item-id',
          type: 'unknown-type'
        }
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Unknown item type: unknown-type',
        userMessage: 'Cannot delete item - unknown type'
      });
      expect(mockDeleteIndicator).not.toHaveBeenCalled();
      expect(mockDeleteObservable).not.toHaveBeenCalled();
    });

    test('should handle item missing id or type', async () => {
      const deleteItem = require('../../../server/onMessage/deleteItem');
      
      const actionParams = {
        itemToDelete: {
          id: 'test-id'
          // Missing type
        }
      };

      await deleteItem(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Invalid item - missing id or type',
        userMessage: 'Item cannot be deleted - missing required information'
      });
    });
  });
}); 