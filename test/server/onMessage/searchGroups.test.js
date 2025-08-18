/**
 * Tests for searchGroups Action Function - OpenCTI Implementation
 */

// Mock dependencies BEFORE requiring the module under test
const mockSearchGroupsQuery = jest.fn();

jest.mock('../../../server/queries', () => ({
  searchGroups: mockSearchGroupsQuery
}));

describe('searchGroups Action Function', () => {
  let mockOptions, mockLogger, mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOptions = {
      allowAssociation: true,
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
    mockSearchGroupsQuery.mockReset();
  });

  describe('Function Export', () => {
    test('should export searchGroups function', () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      expect(typeof searchGroups).toBe('function');
    });

    test('should have correct function signature', () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      expect(searchGroups.length).toBe(4); // actionParams, options, Logger, callback
    });
  });

  describe('Success Cases', () => {
    test('should successfully search for groups', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const mockGroupResults = {
        groups: {
          edges: [
            {
              node: {
                id: 'group-1', 
                name: 'threat-group-1',
                type: 'Threat Actor',
                description: 'Advanced threat group',
                created: '2025-01-01T00:00:00Z',
                owner: 'admin',
                ownerName: 'admin'
              }
            },
            {
              node: {
                id: 'group-2', 
                name: 'threat-group-2',
                type: 'Campaign',
                description: null,
                created: '2025-01-02T00:00:00Z',
                owner: null,
                ownerName: null
              }
            }
          ]
        }
      };

      mockSearchGroupsQuery.mockResolvedValue(mockGroupResults);

      const actionParams = {
        term: 'threat-group',
        groupTypes: ['Adversary', 'Campaign'],
        ownerIds: ['owner-1']
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchGroupsQuery).toHaveBeenCalledWith(
        'threat-group',
        mockOptions,
        mockLogger
      );
      expect(mockCallback).toHaveBeenCalledWith(null, {
        groups: [
          {
            id: 'group-1',
            name: 'threat-group-1',
            type: 'Threat Actor',
            description: 'Advanced threat group',
            created: '2025-01-01T00:00:00Z',
            owner: 'admin'
          },
          {
            id: 'group-2',
            name: 'threat-group-2',
            type: 'Campaign',
            description: null,
            created: '2025-01-02T00:00:00Z',
            owner: null
          }
        ],
        searchTerm: 'threat-group',
        success: true
      });
    });

    test('should handle empty search results', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      mockSearchGroupsQuery.mockResolvedValue([]);

      const actionParams = {
        term: 'nonexistent'
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        groups: [],
        searchTerm: 'nonexistent',
        success: true
      });
    });

    test('should handle search with short term', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const actionParams = {
        term: 'a' // Too short
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchGroupsQuery).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {
        groups: [],
        message: 'Search term must be at least 2 characters'
      });
    });
  });

  describe('Permission Checks', () => {
    test('should reject search when allowAssociation is false', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      mockOptions.allowAssociation = false;

      const actionParams = {
        term: 'threat-group',
        groupTypes: ['Adversary'],
        ownerIds: ['owner-1']
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Group association not permitted',
        userMessage: 'You do not have permission to search groups'
      });
      expect(mockSearchGroupsQuery).not.toHaveBeenCalled();
    });

    test('should proceed when allowAssociation is true', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      mockSearchGroupsQuery.mockResolvedValue([]);

      const actionParams = {
        term: 'threat-group'
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchGroupsQuery).toHaveBeenCalledWith(
        'threat-group',
        mockOptions,
        mockLogger
      );
      expect(mockCallback).toHaveBeenCalledWith(null, {
        groups: [],
        searchTerm: 'threat-group',
        success: true
      });
    });
  });

  describe('Error Cases', () => {
    test('should handle searchGroups query errors', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const searchError = new Error('Search failed');
      mockSearchGroupsQuery.mockRejectedValue(searchError);

      const actionParams = {
        term: 'threat-group'
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Search failed',
        userMessage: 'Failed to search groups',
        searchTerm: 'threat-group',
        error: searchError
      });
    });

    test('should handle API authentication errors', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const authError = new Error('Authentication failed');
      mockSearchGroupsQuery.mockRejectedValue(authError);

      const actionParams = {
        term: 'threat-group'
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Authentication failed',
        userMessage: 'Failed to search groups',
        searchTerm: 'threat-group',
        error: authError
      });
    });

    test('should handle network errors', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const networkError = new Error('Network error');
      mockSearchGroupsQuery.mockRejectedValue(networkError);

      const actionParams = {
        term: 'threat-group'
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Network error',
        userMessage: 'Failed to search groups',
        searchTerm: 'threat-group',
        error: networkError
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing term parameter', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const actionParams = {
        groupTypes: ['Adversary'],
        ownerIds: ['owner-1']
        // Missing term
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchGroupsQuery).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {
        groups: [],
        message: 'Search term must be at least 2 characters'
      });
    });

    test('should handle missing groupTypes parameter', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      mockSearchGroupsQuery.mockResolvedValue([]);

      const actionParams = {
        term: 'threat-group',
        ownerIds: ['owner-1']
        // Missing groupTypes - should use defaults
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchGroupsQuery).toHaveBeenCalledWith(
        'threat-group',
        mockOptions,
        mockLogger
      );
    });

    test('should handle missing ownerIds parameter', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      mockSearchGroupsQuery.mockResolvedValue([]);

      const actionParams = {
        term: 'threat-group',
        groupTypes: ['Adversary']
        // Missing ownerIds - should use defaults
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchGroupsQuery).toHaveBeenCalledWith(
        'threat-group',
        mockOptions,
        mockLogger
      );
    });

    test('should handle null actionParams', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const actionParams = null;

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchGroupsQuery).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {
        groups: [],
        message: 'Search term must be at least 2 characters'
      });
    });

    test('should handle empty arrays in parameters', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      mockSearchGroupsQuery.mockResolvedValue([]);

      const actionParams = {
        term: 'threat-group',
        groupTypes: [],
        ownerIds: []
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchGroupsQuery).toHaveBeenCalledWith(
        'threat-group',
        mockOptions,
        mockLogger
      );
      expect(mockCallback).toHaveBeenCalledWith(null, {
        groups: [],
        searchTerm: 'threat-group',
        success: true
      });
    });

    test('should handle permission errors', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const permissionError = new Error('Access denied: insufficient permission to search groups');
      mockSearchGroupsQuery.mockRejectedValue(permissionError);

      const actionParams = {
        term: 'threat-group'
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Access denied: insufficient permission to search groups',
        userMessage: 'You do not have permission to search groups',
        searchTerm: 'threat-group',
        error: permissionError
      });
    });

    test('should handle timeout errors', async () => {
      const searchGroups = require('../../../server/onMessage/searchGroups');
      
      const timeoutError = new Error('Request timeout while searching groups');
      mockSearchGroupsQuery.mockRejectedValue(timeoutError);

      const actionParams = {
        term: 'threat-group'
      };

      await searchGroups(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Request timeout while searching groups',
        userMessage: 'Group search timed out - try a more specific term',
        searchTerm: 'threat-group',
        error: timeoutError
      });
    });
  });
}); 