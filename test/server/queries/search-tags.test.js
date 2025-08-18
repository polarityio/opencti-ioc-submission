/**
 * Test Suite: OpenCTI Search Tags Query
 * Tests the search tags functionality with comprehensive coverage
 */

const { searchTags, SEARCH_TAGS_QUERY } = require('../../../server/queries/search-tags');

// Mock the request function
jest.mock('../../../server/core', () => ({
  makeOpenCTIRequest: jest.fn()
}));

const { makeOpenCTIRequest } = require('../../../server/core');

describe('OpenCTI Search Tags Query', () => {
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

  describe('searchTags Function', () => {
    const mockOptions = {
      url: 'https://demo.opencti.io',
      apiKey: 'test-api-key-123'
    };

    describe('Successful Search', () => {
      it('should successfully search for tags with search term', async () => {
        const mockResponse = {
          labels: {
            edges: [
              {
                node: {
                  id: 'label-uuid-1',
                  value: 'malware',
                  color: '#ff0000',
                  created_at: '2024-01-15T10:00:00.000Z'
                }
              },
              {
                node: {
                  id: 'label-uuid-2',
                  value: 'malicious',
                  color: '#ff4444',
                  created_at: '2024-01-15T11:00:00.000Z'
                }
              }
            ]
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags('mal', mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_TAGS_QUERY,
          { search: 'mal' },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Searching OpenCTI tags/labels',
          { searchTerm: 'mal' }
        );
      });

      it('should handle empty search results', async () => {
        const mockResponse = {
          labels: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags('nonexistent', mockOptions, mockLogger);

        expect(result).toEqual(mockResponse);
        expect(result.labels.edges).toHaveLength(0);
      });

      it('should work without logger parameter', async () => {
        const mockResponse = {
          labels: {
            edges: [
              {
                node: {
                  id: 'label-uuid-1',
                  value: 'test',
                  color: '#00ff00'
                }
              }
            ]
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags('test', mockOptions);

        expect(result).toEqual(mockResponse);
        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_TAGS_QUERY,
          { search: 'test' },
          mockOptions,
          expect.any(Object)  // Logger instance expected, not undefined
        );
      });

      it('should handle tags with various properties', async () => {
        const mockResponse = {
          labels: {
            edges: [
              {
                node: {
                  id: 'label-full-1',
                  value: 'comprehensive-tag',
                  color: '#ff00ff',
                  created_at: '2024-01-15T10:00:00.000Z',
                  updated_at: '2024-01-15T11:00:00.000Z',
                  objectLabel: {
                    edges: []
                  }
                }
              },
              {
                node: {
                  id: 'label-minimal-2',
                  value: 'minimal-tag',
                  color: '#0000ff'
                  // Minimal properties only
                }
              }
            ]
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags('tag', mockOptions, mockLogger);

        expect(result).toEqual(mockResponse);
        expect(result.labels.edges).toHaveLength(2);
        
        // Verify full tag has all properties
        const fullTag = result.labels.edges[0].node;
        expect(fullTag.created_at).toBeDefined();
        expect(fullTag.updated_at).toBeDefined();
        expect(fullTag.objectLabel).toBeDefined();
        
        // Verify minimal tag has required properties only
        const minimalTag = result.labels.edges[1].node;
        expect(minimalTag.id).toBeDefined();
        expect(minimalTag.value).toBeDefined();
        expect(minimalTag.color).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        const networkError = new Error('Network request failed');
        makeOpenCTIRequest.mockRejectedValue(networkError);

        await expect(searchTags('test', mockOptions, mockLogger))
          .rejects.toThrow('Network request failed');

        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Searching OpenCTI tags/labels',
          { searchTerm: 'test' }
        );
      });

      it('should handle HTTP errors', async () => {
        const httpError = new Error('HTTP 500: Internal Server Error');
        httpError.statusCode = 500;
        makeOpenCTIRequest.mockRejectedValue(httpError);

        await expect(searchTags('test', mockOptions, mockLogger))
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

        await expect(searchTags('test', mockOptions, mockLogger))
          .rejects.toThrow('Authentication required');
      });

      it('should handle GraphQL errors', async () => {
        const graphqlError = new Error('GraphQL validation error');
        graphqlError.body = {
          errors: [{
            message: 'Invalid search parameter',
            extensions: { code: 'GRAPHQL_VALIDATION_FAILED' }
          }]
        };
        makeOpenCTIRequest.mockRejectedValue(graphqlError);

        await expect(searchTags('test', mockOptions, mockLogger))
          .rejects.toThrow('GraphQL validation error');
      });

      it('should handle permission errors', async () => {
        const permissionError = new Error('Insufficient permissions');
        permissionError.body = {
          errors: [{
            message: 'You do not have permission to search labels',
            extensions: { code: 'FORBIDDEN' }
          }]
        };
        makeOpenCTIRequest.mockRejectedValue(permissionError);

        await expect(searchTags('test', mockOptions, mockLogger))
          .rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty search term', async () => {
        const mockResponse = {
          labels: {
            edges: [
              {
                node: {
                  id: 'all-label-1',
                  value: 'all-tags-1',
                  color: '#000000'
                }
              }
            ]
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags('', mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_TAGS_QUERY,
          { search: '' },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle null search term', async () => {
        const mockResponse = {
          labels: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags(null, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_TAGS_QUERY,
          { search: null },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle undefined search term', async () => {
        const mockResponse = {
          labels: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags(undefined, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_TAGS_QUERY,
          { search: undefined },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle malformed response body', async () => {
        makeOpenCTIRequest.mockResolvedValue(null);

        const result = await searchTags('test', mockOptions, mockLogger);
        expect(result).toBeNull();
      });

      it('should handle response without labels field', async () => {
        makeOpenCTIRequest.mockResolvedValue({});

        const result = await searchTags('test', mockOptions, mockLogger);
        expect(result.labels).toBeUndefined();
      });

      it('should handle response with malformed labels structure', async () => {
        const malformedResponse = {
          labels: {
            // Missing edges field
            totalCount: 0
          }
        };

        makeOpenCTIRequest.mockResolvedValue(malformedResponse);

        const result = await searchTags('test', mockOptions, mockLogger);
        expect(result).toEqual(malformedResponse);
        expect(result.labels.edges).toBeUndefined();
      });
    });

    describe('Tag Search Variations', () => {
      it('should handle common security tag searches', async () => {
        const securityTags = [
          'malware',
          'phishing',
          'ransomware',
          'trojan',
          'apt',
          'backdoor',
          'botnet',
          'c2',
          'exploit',
          'vulnerability'
        ];

        for (const tag of securityTags) {
          const mockResponse = {
            labels: {
              edges: [
                {
                  node: {
                    id: `label-${tag}`,
                    value: tag,
                    color: '#ff0000'
                  }
                }
              ]
            }
          };

          makeOpenCTIRequest.mockResolvedValue(mockResponse);

          const result = await searchTags(tag, mockOptions, mockLogger);

          expect(makeOpenCTIRequest).toHaveBeenCalledWith(
            SEARCH_TAGS_QUERY,
            { search: tag },
            mockOptions,
            mockLogger
          );

          expect(result.labels.edges[0].node.value).toBe(tag);
        }
      });

      it('should handle special characters in search term', async () => {
        const specialSearchTerms = [
          'tag-with-hyphens',
          'tag_with_underscores',
          'tag.with.dots',
          'tag/with/slashes',
          'tag@domain.com',
          'tag+plus',
          'tag=equals',
          'tag?question',
          'tag#hash'
        ];

        const mockResponse = {
          labels: {
            edges: [
              {
                node: {
                  id: 'label-special-1',
                  value: 'special-tag',
                  color: '#00ff00'
                }
              }
            ]
          }
        };

        for (const searchTerm of specialSearchTerms) {
          makeOpenCTIRequest.mockResolvedValue(mockResponse);

          const result = await searchTags(searchTerm, mockOptions, mockLogger);

          expect(makeOpenCTIRequest).toHaveBeenCalledWith(
            SEARCH_TAGS_QUERY,
            { search: searchTerm },
            mockOptions,
            mockLogger
          );

          expect(result).toEqual(mockResponse);
        }
      });

      it('should handle case sensitivity scenarios', async () => {
        const caseSensitiveTerms = [
          'UPPERCASE',
          'lowercase',
          'MixedCase',
          'camelCase',
          'PascalCase',
          'snake_case',
          'kebab-case'
        ];

        const mockResponse = {
          labels: {
            edges: [
              {
                node: {
                  id: 'label-case-1',
                  value: 'case-sensitive-tag',
                  color: '#0000ff'
                }
              }
            ]
          }
        };

        for (const searchTerm of caseSensitiveTerms) {
          makeOpenCTIRequest.mockResolvedValue(mockResponse);

          const result = await searchTags(searchTerm, mockOptions, mockLogger);

          expect(makeOpenCTIRequest).toHaveBeenCalledWith(
            SEARCH_TAGS_QUERY,
            { search: searchTerm },
            mockOptions,
            mockLogger
          );

          expect(result).toEqual(mockResponse);
        }
      });

      it('should handle very long search terms', async () => {
        const longSearchTerm = 'very-long-tag-name-that-exceeds-normal-length-limits-and-continues-for-many-characters-to-test-edge-cases';

        const mockResponse = {
          labels: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags(longSearchTerm, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_TAGS_QUERY,
          { search: longSearchTerm },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('SEARCH_TAGS_QUERY Constant', () => {
    it('should export the correct GraphQL query', () => {
      expect(SEARCH_TAGS_QUERY).toBeDefined();
      expect(SEARCH_TAGS_QUERY).toContain('query SearchTags');
      expect(SEARCH_TAGS_QUERY).toContain('labels');
      expect(SEARCH_TAGS_QUERY).toContain('$search: String');
      expect(SEARCH_TAGS_QUERY).toContain('edges');
      expect(SEARCH_TAGS_QUERY).toContain('node');
      expect(SEARCH_TAGS_QUERY).toContain('id');
      expect(SEARCH_TAGS_QUERY).toContain('value');
      expect(SEARCH_TAGS_QUERY).toContain('color');
    });

    it('should be a valid GraphQL query string', () => {
      expect(typeof SEARCH_TAGS_QUERY).toBe('string');
      expect(SEARCH_TAGS_QUERY.trim().length).toBeGreaterThan(0);
      expect(SEARCH_TAGS_QUERY).toMatch(/query\s+\w+/);
    });

    it('should include required label fields', () => {
      const requiredFields = ['id', 'value', 'color'];
      const optionalFields = ['created_at', 'updated_at', 'objectLabel'];
      
      requiredFields.forEach(field => {
        expect(SEARCH_TAGS_QUERY).toContain(field);
      });
      
      // Optional fields may or may not be included
      optionalFields.forEach(field => {
        // Just verify they are strings if they exist in the query
        if (SEARCH_TAGS_QUERY.includes(field)) {
          expect(typeof field).toBe('string');
        }
      });
    });
  });

  describe('Module Exports', () => {
    it('should export searchTags function', () => {
      expect(typeof searchTags).toBe('function');
    });

    it('should export SEARCH_TAGS_QUERY constant', () => {
      expect(typeof SEARCH_TAGS_QUERY).toBe('string');
    });
  });

  describe('Integration Scenarios', () => {
    const mockOptions = {
      url: 'https://demo.opencti.io',
      apiKey: 'test-api-key-123'
    };

    it('should handle typical tag search workflow', async () => {
      const searchScenarios = [
        {
          description: 'Search for malware tags',
          searchTerm: 'malware',
          expectedTags: [
            { id: 'mal-1', value: 'malware', color: '#ff0000' },
            { id: 'mal-2', value: 'malware-family', color: '#ff4444' }
          ]
        },
        {
          description: 'Search for apt tags',
          searchTerm: 'apt',
          expectedTags: [
            { id: 'apt-1', value: 'apt29', color: '#ff8800' },
            { id: 'apt-2', value: 'apt28', color: '#ffaa00' }
          ]
        },
        {
          description: 'Search with no results',
          searchTerm: 'nonexistent',
          expectedTags: []
        }
      ];

      for (const scenario of searchScenarios) {
        const mockResponse = {
          labels: {
            edges: scenario.expectedTags.map(tag => ({ node: tag }))
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags(scenario.searchTerm, mockOptions, mockLogger);

        expect(result).toEqual(mockResponse);
        expect(result.labels.edges).toHaveLength(scenario.expectedTags.length);
        
        if (scenario.expectedTags.length > 0) {
          result.labels.edges.forEach((edge, index) => {
            expect(edge.node.id).toBe(scenario.expectedTags[index].id);
            expect(edge.node.value).toBe(scenario.expectedTags[index].value);
            expect(edge.node.color).toBe(scenario.expectedTags[index].color);
          });
        }
      }
    });

    it('should handle autocomplete scenarios', async () => {
      const partialSearches = [
        {
          partial: 'mal',
          expectedMatches: ['malware', 'malicious', 'malformed']
        },
        {
          partial: 'apt',
          expectedMatches: ['apt28', 'apt29', 'apt30']
        },
        {
          partial: 'ran',
          expectedMatches: ['ransomware', 'random', 'range']
        }
      ];

      for (const search of partialSearches) {
        const mockResponse = {
          labels: {
            edges: search.expectedMatches.map((match, index) => ({
              node: {
                id: `${search.partial}-${index}`,
                value: match,
                color: '#0066cc'
              }
            }))
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchTags(search.partial, mockOptions, mockLogger);

        expect(result.labels.edges).toHaveLength(search.expectedMatches.length);
        
        result.labels.edges.forEach((edge, index) => {
          expect(edge.node.value).toBe(search.expectedMatches[index]);
          expect(edge.node.value).toContain(search.partial);
        });
      }
    });

    it('should handle pagination scenarios', async () => {
      const mockResponse = {
        labels: {
          edges: Array.from({ length: 50 }, (_, i) => ({
            node: {
              id: `label-${i + 1}`,
              value: `tag-${i + 1}`,
              color: `#${(i * 1000).toString(16).padStart(6, '0')}`
            }
          })),
          pageInfo: {
            hasNextPage: true,
            endCursor: 'cursor-50'
          }
        }
      };

      makeOpenCTIRequest.mockResolvedValue(mockResponse);

      const result = await searchTags('tag', mockOptions, mockLogger);

      expect(result.labels.edges).toHaveLength(50);
      expect(result.labels.pageInfo.hasNextPage).toBe(true);
      expect(result.labels.pageInfo.endCursor).toBe('cursor-50');
    });
  });
}); 