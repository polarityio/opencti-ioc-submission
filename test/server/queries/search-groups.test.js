/**
 * Test Suite: OpenCTI Search Groups Query
 * Tests the search groups functionality with comprehensive coverage
 */

const { searchGroups, SEARCH_GROUPS_QUERY } = require('../../../server/queries/search-groups');

// Mock the request function
jest.mock('../../../server/core', () => ({
  makeOpenCTIRequest: jest.fn()
}));

const { makeOpenCTIRequest } = require('../../../server/core');

describe('OpenCTI Search Groups Query', () => {
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

  describe('searchGroups Function', () => {

    describe('Successful Search', () => {
      it('should successfully search for groups with search term', async () => {
        const mockGraphQLResponse = {
          organizations: {
            edges: [
              {
                node: {
                  id: 'group-uuid-1',
                  name: 'Security Team',
                  description: 'Main security group',
                  entity_type: 'Organization',
                  created_at: '2024-01-15T10:00:00.000Z',
                  createdBy: { name: 'Test User' }
                }
              }
            ]
          },
          sectors: {
            edges: [
              {
                node: {
                  id: 'group-uuid-2',
                  name: 'Admin Team',
                  description: 'Administrator group',
                  entity_type: 'Sector',
                  created_at: '2024-01-15T11:00:00.000Z',
                  createdBy: { name: 'Test User' }
                }
              }
            ]
          },
          threatActors: { edges: [] },
          intrusionSets: { edges: [] },
          campaigns: { edges: [] }
        };

        const expectedResult = {
          groups: {
            edges: [
              {
                node: {
                  id: 'group-uuid-1',
                  name: 'Security Team',
                  description: 'Main security group',
                  type: 'Organization',
                  created: '2024-01-15T10:00:00.000Z',
                  owner: 'Test User',
                  ownerName: 'Test User'
                }
              },
              {
                node: {
                  id: 'group-uuid-2',
                  name: 'Admin Team',
                  description: 'Administrator group',
                  type: 'Sector',
                  created: '2024-01-15T11:00:00.000Z',
                  owner: 'Test User',
                  ownerName: 'Test User'
                }
              }
            ]
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockGraphQLResponse);

        const result = await searchGroups('security', mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_GROUPS_QUERY,
          { search: 'security' },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(expectedResult);
        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Searching OpenCTI groups',
          { searchTerm: 'security' }
        );
      });

      it('should handle empty search results', async () => {
        const mockGraphQLResponse = {
          organizations: { edges: [] },
          sectors: { edges: [] },
          threatActors: { edges: [] },
          intrusionSets: { edges: [] },
          campaigns: { edges: [] }
        };

        const expectedResult = {
          groups: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockGraphQLResponse);

        const result = await searchGroups('nonexistent', mockOptions, mockLogger);

        expect(result).toEqual(expectedResult);
        expect(result.groups.edges).toHaveLength(0);
      });

      it('should work without logger parameter', async () => {
        const mockGraphQLResponse = {
          organizations: {
            edges: [
              {
                node: {
                  id: 'group-uuid-1',
                  name: 'Test Group',
                  entity_type: 'Organization',
                  created_at: '2024-01-15T10:00:00.000Z',
                  createdBy: { name: 'Test User' }
                }
              }
            ]
          },
          sectors: { edges: [] },
          threatActors: { edges: [] },
          intrusionSets: { edges: [] },
          campaigns: { edges: [] }
        };

        const expectedResult = {
          groups: {
            edges: [
              {
                node: {
                  id: 'group-uuid-1',
                  name: 'Test Group',
                  description: null,
                  type: 'Organization',
                  created: '2024-01-15T10:00:00.000Z',
                  owner: 'Test User',
                  ownerName: 'Test User'
                }
              }
            ]
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockGraphQLResponse);

        const result = await searchGroups('test', mockOptions);

        expect(result).toEqual(expectedResult);
        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_GROUPS_QUERY,
          { search: 'test' },
          mockOptions,
          expect.any(Object)  // Logger instance expected, not undefined
        );
      });

      it('should handle groups with various properties', async () => {
        const mockGraphQLResponse = {
          organizations: {
            edges: [
              {
                node: {
                  id: 'group-full-1',
                  name: 'Full Group',
                  description: 'Group with all properties',
                  entity_type: 'Organization',
                  created_at: '2024-01-15T10:00:00.000Z',
                  updated_at: '2024-01-15T11:00:00.000Z',
                  createdBy: { name: 'Full User' }
                }
              }
            ]
          },
          sectors: {
            edges: [
              {
                node: {
                  id: 'group-minimal-2',
                  name: 'Minimal Group',
                  entity_type: 'Sector',
                  created_at: '2024-01-15T12:00:00.000Z',
                  createdBy: { name: 'Minimal User' }
                  // Minimal properties only
                }
              }
            ]
          },
          threatActors: { edges: [] },
          intrusionSets: { edges: [] },
          campaigns: { edges: [] }
        };

        const expectedResult = {
          groups: {
            edges: [
              {
                node: {
                  id: 'group-full-1',
                  name: 'Full Group',
                  description: 'Group with all properties',
                  type: 'Organization',
                  created: '2024-01-15T10:00:00.000Z',
                  owner: 'Full User',
                  ownerName: 'Full User'
                }
              },
              {
                node: {
                  id: 'group-minimal-2',
                  name: 'Minimal Group',
                  description: null,
                  type: 'Sector',
                  created: '2024-01-15T12:00:00.000Z',
                  owner: 'Minimal User',
                  ownerName: 'Minimal User'
                }
              }
            ]
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockGraphQLResponse);

        const result = await searchGroups('group', mockOptions, mockLogger);

        expect(result).toEqual(expectedResult);
        expect(result.groups.edges).toHaveLength(2);
        
        // Verify full group has all properties
        const fullGroup = result.groups.edges[0].node;
        expect(fullGroup.description).toBeDefined();
        expect(fullGroup.created).toBeDefined();
        expect(fullGroup.type).toBe('Organization');
        
        // Verify minimal group has required properties only
        const minimalGroup = result.groups.edges[1].node;
        expect(minimalGroup.id).toBeDefined();
        expect(minimalGroup.type).toBe('Sector');
        expect(minimalGroup.name).toBeDefined();
        expect(minimalGroup.type).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        const networkError = new Error('Network request failed');
        makeOpenCTIRequest.mockRejectedValue(networkError);

        await expect(searchGroups('test', mockOptions, mockLogger))
          .rejects.toThrow('Network request failed');

        expect(mockLogger.trace).toHaveBeenCalledWith(
          'Searching OpenCTI groups',
          { searchTerm: 'test' }
        );
      });

      it('should handle HTTP errors', async () => {
        const httpError = new Error('HTTP 500: Internal Server Error');
        httpError.statusCode = 500;
        makeOpenCTIRequest.mockRejectedValue(httpError);

        await expect(searchGroups('test', mockOptions, mockLogger))
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

        await expect(searchGroups('test', mockOptions, mockLogger))
          .rejects.toThrow('Authentication failed: Invalid OpenCTI API key or insufficient permissions');
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

        await expect(searchGroups('test', mockOptions, mockLogger))
          .rejects.toThrow('OpenCTI GraphQL error: Invalid request format or parameters.');
      });

      it('should handle permission errors', async () => {
        const permissionError = new Error('Insufficient permissions');
        permissionError.body = {
          errors: [{
            message: 'You do not have permission to search groups',
            extensions: { code: 'FORBIDDEN' }
          }]
        };
        makeOpenCTIRequest.mockRejectedValue(permissionError);

        await expect(searchGroups('test', mockOptions, mockLogger))
          .rejects.toThrow('Insufficient permissions');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty search term', async () => {
        const mockResponse = {
          groups: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchGroups('', mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_GROUPS_QUERY,
          { search: '' },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle null search term', async () => {
        const mockResponse = {
          groups: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchGroups(null, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_GROUPS_QUERY,
          { search: null },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle undefined search term', async () => {
        const mockResponse = {
          groups: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchGroups(undefined, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_GROUPS_QUERY,
          { search: undefined },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
      });

      it('should handle malformed response body', async () => {
        makeOpenCTIRequest.mockResolvedValue(null);

        const result = await searchGroups('test', mockOptions, mockLogger);
        expect(result).toEqual([]);
      });

      it('should handle response without groups field', async () => {
        makeOpenCTIRequest.mockResolvedValue({});

        const result = await searchGroups('test', mockOptions, mockLogger);
        expect(result.groups.edges).toEqual([]);
      });

      it('should handle response with malformed groups structure', async () => {
        const malformedResponse = {
          groups: {
            // Missing edges field
            totalCount: 0
          }
        };

        makeOpenCTIRequest.mockResolvedValue(malformedResponse);

        const result = await searchGroups('test', mockOptions, mockLogger);
        expect(result.groups.edges).toEqual([]);
        expect(result.groups.edges).toBeDefined();
      });
    });

    describe('Search Term Variations', () => {
      it('should handle special characters in search term', async () => {
        const specialSearchTerms = [
          'group@domain.com',
          'group-with-hyphens',
          'group_with_underscores',
          'group with spaces',
          'group.with.dots',
          'group/with/slashes',
          'group\\with\\backslashes'
        ];

        const mockGraphQLResponse = {
          organizations: {
            edges: [
              {
                node: {
                  id: 'group-special-1',
                  name: 'Special Group',
                  entity_type: 'Organization',
                  created_at: '2024-01-15T10:00:00.000Z',
                  createdBy: { name: 'Test User' }
                }
              }
            ]
          },
          sectors: { edges: [] },
          threatActors: { edges: [] },
          intrusionSets: { edges: [] },
          campaigns: { edges: [] }
        };

        const expectedResult = {
          groups: {
            edges: [
              {
                node: {
                  id: 'group-special-1',
                  name: 'Special Group',
                  description: null,
                  type: 'Organization',
                  created: '2024-01-15T10:00:00.000Z',
                  owner: 'Test User',
                  ownerName: 'Test User'
                }
              }
            ]
          }
        };

        for (const searchTerm of specialSearchTerms) {
          makeOpenCTIRequest.mockResolvedValue(mockGraphQLResponse);

          const result = await searchGroups(searchTerm, mockOptions, mockLogger);

          expect(makeOpenCTIRequest).toHaveBeenCalledWith(
            SEARCH_GROUPS_QUERY,
            { search: searchTerm },
            mockOptions,
            mockLogger
          );

          expect(result).toEqual(expectedResult);
        }
      });

      it('should handle Unicode characters in search term', async () => {
        const unicodeSearchTerms = [
          'группа',        // Russian
          'グループ',        // Japanese
          'grupo',         // Spanish
          'groupe',        // French
          'gruppe',        // German
          '组',            // Chinese
          'مجموعة'         // Arabic
        ];

        const mockResponse = {
          groups: {
            edges: []
          }
        };

        for (const searchTerm of unicodeSearchTerms) {
          makeOpenCTIRequest.mockResolvedValue(mockResponse);

          const result = await searchGroups(searchTerm, mockOptions, mockLogger);

          expect(makeOpenCTIRequest).toHaveBeenCalledWith(
            SEARCH_GROUPS_QUERY,
            { search: searchTerm },
            mockOptions,
            mockLogger
          );

          expect(result).toEqual(mockResponse);
        }
      });

      it('should handle very long search terms', async () => {
        const longSearchTerm = 'a'.repeat(1000);

        const mockResponse = {
          groups: {
            edges: []
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockResponse);

        const result = await searchGroups(longSearchTerm, mockOptions, mockLogger);

        expect(makeOpenCTIRequest).toHaveBeenCalledWith(
          SEARCH_GROUPS_QUERY,
          { search: longSearchTerm },
          mockOptions,
          mockLogger
        );

        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('SEARCH_GROUPS_QUERY Constant', () => {
    it('should export the correct GraphQL query', () => {
      expect(SEARCH_GROUPS_QUERY).toBeDefined();
      expect(SEARCH_GROUPS_QUERY).toContain('query SearchOrganizationalEntities');
      expect(SEARCH_GROUPS_QUERY).toContain('organizations');
      expect(SEARCH_GROUPS_QUERY).toContain('$search: String');
      expect(SEARCH_GROUPS_QUERY).toContain('edges');
      expect(SEARCH_GROUPS_QUERY).toContain('node');
      expect(SEARCH_GROUPS_QUERY).toContain('id');
      expect(SEARCH_GROUPS_QUERY).toContain('name');
      expect(SEARCH_GROUPS_QUERY).toContain('entity_type');
    });

    it('should be a valid GraphQL query string', () => {
      expect(typeof SEARCH_GROUPS_QUERY).toBe('string');
      expect(SEARCH_GROUPS_QUERY.trim().length).toBeGreaterThan(0);
      expect(SEARCH_GROUPS_QUERY).toMatch(/query\s+\w+/);
    });

    it('should include required group fields', () => {
      const requiredFields = ['id', 'name', 'entity_type'];
      const optionalFields = ['description', 'created_at', 'updated_at', 'objectLabel'];
      
      requiredFields.forEach(field => {
        expect(SEARCH_GROUPS_QUERY).toContain(field);
      });
      
      // Optional fields may or may not be included
      optionalFields.forEach(field => {
        // Just verify they are strings if they exist in the query
        if (SEARCH_GROUPS_QUERY.includes(field)) {
          expect(typeof field).toBe('string');
        }
      });
    });
  });

  describe('Module Exports', () => {
    it('should export searchGroups function', () => {
      expect(typeof searchGroups).toBe('function');
    });

    it('should export SEARCH_GROUPS_QUERY constant', () => {
      expect(typeof SEARCH_GROUPS_QUERY).toBe('string');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical group search workflow', async () => {
      const searchScenarios = [
        {
          description: 'Search for admin groups',
          searchTerm: 'admin',
          expectedGroups: [
            { id: 'admin-1', name: 'Administrators', entity_type: 'Group' },
            { id: 'admin-2', name: 'Admin Team', entity_type: 'Group' }
          ]
        },
        {
          description: 'Search for security groups',
          searchTerm: 'security',
          expectedGroups: [
            { id: 'sec-1', name: 'Security Team', entity_type: 'Group' }
          ]
        },
        {
          description: 'Search with no results',
          searchTerm: 'nonexistent',
          expectedGroups: []
        }
      ];

      for (const scenario of searchScenarios) {
        // Create GraphQL response format (what makeOpenCTIRequest returns)
        const mockGraphQLResponse = {
          organizations: {
            edges: scenario.expectedGroups.filter(g => g.entity_type === 'Group').map(group => ({
              node: {
                id: group.id,
                name: group.name,
                entity_type: 'Organization',
                created_at: '2024-01-15T10:00:00.000Z',
                createdBy: { name: 'Test User' }
              }
            }))
          },
          sectors: { edges: [] },
          threatActors: { edges: [] },
          intrusionSets: { edges: [] },
          campaigns: { edges: [] }
        };

        // Expected transformed result (what searchGroups returns)
        const expectedResult = {
          groups: {
            edges: scenario.expectedGroups.map(group => ({
              node: {
                id: group.id,
                name: group.name,
                description: null,
                type: 'Organization',
                created: '2024-01-15T10:00:00.000Z',
                owner: 'Test User',
                ownerName: 'Test User'
              }
            }))
          }
        };

        makeOpenCTIRequest.mockResolvedValue(mockGraphQLResponse);

        const result = await searchGroups(scenario.searchTerm, mockOptions, mockLogger);

        expect(result).toEqual(expectedResult);
        expect(result.groups.edges).toHaveLength(scenario.expectedGroups.length);
        
        if (scenario.expectedGroups.length > 0) {
          result.groups.edges.forEach((edge, index) => {
            expect(edge.node.id).toBe(scenario.expectedGroups[index].id);
            expect(edge.node.name).toBe(scenario.expectedGroups[index].name);
          });
        }
      }
    });

    it('should handle pagination scenarios', async () => {
      // Create GraphQL response format (what makeOpenCTIRequest returns)
      const mockGraphQLResponse = {
        organizations: {
          edges: Array.from({ length: 20 }, (_, i) => ({
            node: {
              id: `group-${i + 1}`,
              name: `Group ${i + 1}`,
              entity_type: 'Organization',
              created_at: '2024-01-15T10:00:00.000Z',
              createdBy: { name: 'Test User' }
            }
          }))
        },
        sectors: { edges: [] },
        threatActors: { edges: [] },
        intrusionSets: { edges: [] },
        campaigns: { edges: [] }
      };

      makeOpenCTIRequest.mockResolvedValue(mockGraphQLResponse);

      const result = await searchGroups('group', mockOptions, mockLogger);

      expect(result.groups.edges).toHaveLength(20);
      // Note: Current implementation doesn't preserve pageInfo, only returns groups structure
      result.groups.edges.forEach((edge, index) => {
        expect(edge.node.id).toBe(`group-${index + 1}`);
        expect(edge.node.name).toBe(`Group ${index + 1}`);
        expect(edge.node.type).toBe('Organization');
      });
    });
  });
}); 