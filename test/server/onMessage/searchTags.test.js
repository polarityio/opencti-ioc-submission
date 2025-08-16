/**
 * Tests for searchTags Action Function - OpenCTI Implementation
 */

// Mock dependencies BEFORE requiring the module under test
const mockSearchTagsQuery = jest.fn();

jest.mock('../../../server/queries', () => ({
  searchTags: mockSearchTagsQuery
}));

describe('searchTags Action Function', () => {
  let mockOptions, mockLogger, mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOptions = {
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
    mockSearchTagsQuery.mockReset();
  });

  describe('Function Export', () => {
    test('should export searchTags function', () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      expect(typeof searchTags).toBe('function');
    });

    test('should have correct function signature', () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      expect(searchTags.length).toBe(4); // actionParams, options, Logger, callback
    });
  });

  describe('Success Cases', () => {
    test('should successfully search for tags', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const mockLabels = [
        { 
          id: 'tag-1', 
          value: 'malware-family',
          color: '#ff0000',
          x_opencti_description: 'Malware family classification',
          created_at: '2025-01-01T00:00:00Z',
          x_opencti_count: 5
        },
        { 
          id: 'tag-2', 
          value: 'malware-type',
          color: '#00ff00',
          created_at: '2025-01-02T00:00:00Z',
          x_opencti_count: 3
        }
      ];

      mockSearchTagsQuery.mockResolvedValue(mockLabels);

      const actionParams = {
        term: 'malware',
        ownerId: 'owner-123'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchTagsQuery).toHaveBeenCalledWith('malware', 'owner-123', mockOptions);
      expect(mockCallback).toHaveBeenCalledWith(null, {
        tags: [
          {
            id: 'tag-1',
            value: 'malware-family',
            color: '#ff0000',
            displayName: 'malware-family',
            description: 'Malware family classification',
            created: '2025-01-01T00:00:00Z',
            uses: 5
          },
          {
            id: 'tag-2',
            value: 'malware-type',
            color: '#00ff00',
            displayName: 'malware-type',
            description: null,
            created: '2025-01-02T00:00:00Z',
            uses: 3
          }
        ],
        searchTerm: 'malware',
        success: true
      });
    });

    test('should handle empty search results', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      mockSearchTagsQuery.mockResolvedValue([]);

      const actionParams = {
        term: 'nonexistent'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        tags: [],
        searchTerm: 'nonexistent',
        success: true
      });
    });

    test('should handle search with empty term', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const actionParams = {
        term: '',
        ownerId: 'owner-123'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchTagsQuery).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {
        tags: [],
        searchTerm: '',
        success: true,
        message: 'Search term must be at least 1 character'
      });
    });
  });

  describe('Error Cases', () => {
    test('should handle searchTags query errors', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const searchError = new Error('Search failed');
      mockSearchTagsQuery.mockRejectedValue(searchError);

      const actionParams = {
        term: 'malware'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Search failed',
        userMessage: 'Failed to search labels',
        searchTerm: 'malware',
        error: searchError
      });
    });

    test('should handle API authentication errors', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const authError = new Error('Authentication failed');
      mockSearchTagsQuery.mockRejectedValue(authError);

      const actionParams = {
        term: 'malware'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Authentication failed',
        userMessage: 'Failed to search labels',
        searchTerm: 'malware',
        error: authError
      });
    });

    test('should handle network errors', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const networkError = new Error('Network error');
      mockSearchTagsQuery.mockRejectedValue(networkError);

      const actionParams = {
        term: 'malware'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Network error',
        userMessage: 'Failed to search labels',
        searchTerm: 'malware',
        error: networkError
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing term parameter', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const actionParams = {
        ownerId: 'owner-123'
        // Missing term
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchTagsQuery).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {
        tags: [],
        searchTerm: '',
        success: true,
        message: 'Search term must be at least 1 character'
      });
    });

    test('should handle missing ownerId parameter', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const mockLabels = [
        { 
          id: 'tag-1', 
          value: 'test-tag',
          color: '#4f81bd'
        }
      ];

      mockSearchTagsQuery.mockResolvedValue(mockLabels);

      const actionParams = {
        term: 'malware'
        // Missing ownerId - should use null
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchTagsQuery).toHaveBeenCalledWith(
        'malware',
        null,
        mockOptions
      );
    });

    test('should handle null actionParams', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const actionParams = null;

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockSearchTagsQuery).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, {
        tags: [],
        searchTerm: '',
        success: true,
        message: 'Search term must be at least 1 character'
      });
    });

    test('should handle special characters in search term', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const mockLabels = [
        { 
          id: 'tag-1', 
          value: 'special-tag',
          color: '#ff0000'
        }
      ];

      mockSearchTagsQuery.mockResolvedValue(mockLabels);

      const actionParams = {
        term: 'malware-$pecial@chars#'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, {
        tags: [
          {
            id: 'tag-1',
            value: 'special-tag',
            color: '#ff0000',
            displayName: 'special-tag',
            description: null,
            created: undefined,
            uses: 0
          }
        ],
        searchTerm: 'malware-$pecial@chars#',
        success: true
      });
    });

    test('should handle permission errors', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const permissionError = new Error('Access denied: insufficient permission to search labels');
      mockSearchTagsQuery.mockRejectedValue(permissionError);

      const actionParams = {
        term: 'malware'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Access denied: insufficient permission to search labels',
        userMessage: 'You do not have permission to search labels',
        searchTerm: 'malware',
        error: permissionError
      });
    });

    test('should handle timeout errors', async () => {
      const searchTags = require('../../../server/onMessage/searchTags');
      
      const timeoutError = new Error('Request timeout while searching labels');
      mockSearchTagsQuery.mockRejectedValue(timeoutError);

      const actionParams = {
        term: 'malware'
      };

      await searchTags(actionParams, mockOptions, mockLogger, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        detail: 'Request timeout while searching labels',
        userMessage: 'Label search timed out - try a more specific term',
        searchTerm: 'malware',
        error: timeoutError
      });
    });
  });
}); 