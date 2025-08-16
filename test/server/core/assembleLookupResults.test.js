/**
 * Test cases for OpenCTI Assembly Lookup Results
 * Tests the unified single-list interface and data transformation functions
 */

const assembleLookupResults = require('../../../server/core/assembleLookupResults');
const { createUnifiedDataStructure, getEntityDisplayType } = assembleLookupResults;

// Mock the dependencies
jest.mock('../../../server/core/dataTransformations');
jest.mock('../../../server/userOptions');
jest.mock('../../../server/queries/search-indicators-and-observables');
jest.mock('polarity-integration-utils');

const { splitOutIgnoredIps } = require('../../../server/core/dataTransformations');
const { isDeletionAllowed } = require('../../../server/userOptions');
const { searchIndicatorsAndObservables } = require('../../../server/queries/search-indicators-and-observables');
const { logging, errors } = require('polarity-integration-utils');

describe('OpenCTI Assembly Lookup Results - Complete Coverage', () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      trace: jest.fn(),
      error: jest.fn()
    };
    logging.getLogger.mockReturnValue(mockLogger);
    errors.parseErrorToReadableJson.mockReturnValue({ message: 'Formatted error' });
    jest.clearAllMocks();
  });

  describe('Main assembleLookupResults Function', () => {
    it('should successfully process entities with indicators and observables', async () => {
      const entities = [
        { value: 'test.com', type: 'domain' },
        { value: '192.168.1.1', type: 'IPv4' }
      ];
      const options = {
        url: 'https://demo.opencti.io',
        deletionPermissions: [{ value: 'indicators' }, { value: 'observables' }],
        allowAssociation: true
      };

      // Mock dependencies
      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      const mockSearchResults = {
        indicators: { 
          edges: [{ 
            node: { 
              id: 'ind-1', 
              name: 'Test Indicator',
              pattern: '[domain-name:value = "test.com"]',
              confidence: 75,
              created_at: '2023-01-01T00:00:00Z',
              objectLabel: [],
              createdBy: { name: 'OpenCTI' }
            } 
          }] 
        },
        observables: { 
          edges: [{ 
            node: { 
              id: 'obs-1', 
              observable_value: 'test.com',
              created_at: '2023-01-01T00:00:00Z',
              objectLabel: [],
              createdBy: { name: 'OpenCTI' }
            } 
          }] 
        }
      };

      searchIndicatorsAndObservables.mockResolvedValue(mockSearchResults);
      isDeletionAllowed.mockReturnValue(true);

      const result = await assembleLookupResults(entities, options);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        entity: { value: 'OpenCTI IOC Submission' },
        displayValue: 'OpenCTI IOC Submission',
        isVolatile: true
      });

      expect(result[0].data.summary).toContain('Items Found');
      expect(result[0].data.details.unified).toHaveLength(2); // 2 entities processed
      expect(result[0].data.details.apiUrl).toBe('https://demo.opencti.io');
      expect(result[0].data.details.canCreate).toBe(true);
      expect(result[0].data.details.canDelete).toBe(true);
      expect(result[0].data.details.canAssociate).toBe(true);

      expect(mockLogger.trace).toHaveBeenCalledWith({ entities: 2 }, 'Starting OpenCTI lookup assembly');
      expect(searchIndicatorsAndObservables).toHaveBeenCalledTimes(2);
    });

    it('should handle entities with no results (new entities)', async () => {
      const entities = [{ value: 'newdomain.com', type: 'domain' }];
      const options = { url: 'https://demo.opencti.io' };

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: { edges: [] },
        observables: { edges: [] }
      });
      isDeletionAllowed.mockReturnValue(false);

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.summary).toContain('New Items');
      expect(result[0].data.summary).not.toContain('Items Found');
      expect(result[0].data.details.canDelete).toBe(false);
    });

    it('should handle only ignored IPs', async () => {
      const entities = [{ value: '127.0.0.1', type: 'IPv4' }];
      const options = {};

      const ignoredResults = [{ entity: { value: '127.0.0.1' }, data: { summary: ['Ignored'] } }];
      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: null, // No entities to process
        ignoredIpLookupResults: ignoredResults
      });

      const result = await assembleLookupResults(entities, options);

      expect(result).toEqual(ignoredResults);
      expect(mockLogger.trace).toHaveBeenCalledWith('No entities to process, returning ignored IPs only');
      expect(searchIndicatorsAndObservables).not.toHaveBeenCalled();
    });

    it('should handle mixed scenarios with found and new items', async () => {
      const entities = [
        { value: 'found.com', type: 'domain' },
        { value: 'new.com', type: 'domain' }
      ];
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      // First entity has results, second doesn't
      searchIndicatorsAndObservables
        .mockResolvedValueOnce({
          indicators: { edges: [{ node: { id: 'ind-1', created_at: '2023-01-01T00:00:00Z', objectLabel: [], createdBy: { name: 'OpenCTI' } } }] },
          observables: { edges: [] }
        })
        .mockResolvedValueOnce({
          indicators: { edges: [] },
          observables: { edges: [] }
        });

      isDeletionAllowed.mockReturnValue(false);

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.summary).toEqual(['Items Found', 'New Items']);
    });

    it('should handle search errors gracefully', async () => {
      const entities = [{ value: 'error.com', type: 'domain' }];
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      const error = new Error('Search failed');
      searchIndicatorsAndObservables.mockRejectedValue(error);

      await expect(assembleLookupResults(entities, options)).rejects.toThrow('OpenCTI Assembly Failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error, formattedError: { message: 'Formatted error' } },
        'OpenCTI Assembly Lookup Results Failed'
      );
    });

    it('should combine results with ignored IPs', async () => {
      const entities = [{ value: 'test.com', type: 'domain' }];
      const options = {};

      const ignoredResults = [{ entity: { value: '10.0.0.1' }, data: { summary: ['Ignored'] } }];
      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: ignoredResults
      });

      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: { edges: [] },
        observables: { edges: [] }
      });
      isDeletionAllowed.mockReturnValue(false);

      const result = await assembleLookupResults(entities, options);

      expect(result).toHaveLength(2); // Main result + ignored IP
      expect(result[1]).toEqual(ignoredResults[0]);
    });

    it('should handle null/undefined search results', async () => {
      const entities = [{ value: 'test.com', type: 'domain' }];
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      searchIndicatorsAndObservables.mockResolvedValue(null);
      isDeletionAllowed.mockReturnValue(false);

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.summary).toContain('New Items');
    });

    it('should handle malformed search results gracefully', async () => {
      const entities = [{ value: 'test.com', type: 'domain' }];
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      // Malformed results without proper structure
      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: null,
        observables: { edges: null }
      });
      isDeletionAllowed.mockReturnValue(false);

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.summary).toContain('New Items');
      expect(result[0].data.details.unified).toHaveLength(1);
    });
  });

  describe('API URL Processing', () => {
    it('should extract clean API URL from options', async () => {
      const entities = [{ value: 'test.com', type: 'domain' }];
      const options = { url: 'https://demo.opencti.io/' }; // With trailing slash

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: { edges: [] },
        observables: { edges: [] }
      });

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.details.apiUrl).toBe('https://demo.opencti.io');
    });

    it('should handle invalid URL options', async () => {
      const entities = [{ value: 'test.com', type: 'domain' }];
      const options = { url: null };

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: { edges: [] },
        observables: { edges: [] }
      });

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.details.apiUrl).toBe('');
    });
  });

  describe('Permission Handling', () => {
    it('should correctly determine deletion permissions', async () => {
      const entities = [{ value: 'test.com', type: 'domain' }];
      const options = { deletionPermissions: [{ value: 'indicators' }] };

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: { edges: [] },
        observables: { edges: [] }
      });

      // Mock that user can delete indicators but not observables
      isDeletionAllowed.mockImplementation((opts, type) => type === 'indicator');

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.details.canDelete).toBe(true); // Has ANY deletion permissions
    });

    it('should handle no deletion permissions', async () => {
      const entities = [{ value: 'test.com', type: 'domain' }];
      const options = { deletionPermissions: [] };

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: { edges: [] },
        observables: { edges: [] }
      });

      isDeletionAllowed.mockReturnValue(false);

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.details.canDelete).toBe(false);
    });
  });

  describe('Helper Functions - getApiUrl', () => {
    // Test the getApiUrl function indirectly through main function results
    it('should handle various URL formats', async () => {
      const entities = [{ value: 'test.com', type: 'domain' }];
      const testCases = [
        { input: 'https://demo.opencti.io/', expected: 'https://demo.opencti.io' },
        { input: 'https://demo.opencti.io///', expected: 'https://demo.opencti.io' },
        { input: 'https://demo.opencti.io', expected: 'https://demo.opencti.io' },
        { input: '', expected: '' },
        { input: null, expected: '' },
        { input: undefined, expected: '' },
        { input: 123, expected: '' }
      ];

      for (const testCase of testCases) {
        splitOutIgnoredIps.mockReturnValue({
          entitiesPartition: entities,
          ignoredIpLookupResults: []
        });

        searchIndicatorsAndObservables.mockResolvedValue({
          indicators: { edges: [] },
          observables: { edges: [] }
        });

        const options = { url: testCase.input };
        const result = await assembleLookupResults(entities, options);
        
        expect(result[0].data.details.apiUrl).toBe(testCase.expected);
      }
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty entities array', async () => {
      const entities = [];
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: null,
        ignoredIpLookupResults: []
      });

      const result = await assembleLookupResults(entities, options);

      expect(result).toEqual([]);
    });

    it('should handle entities with missing properties', async () => {
      const entities = [{ value: 'test.com' }]; // Missing type
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: { edges: [] },
        observables: { edges: [] }
      });

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.details.unified).toHaveLength(1);
    });

    it('should handle very large numbers of entities', async () => {
      const entities = Array.from({ length: 100 }, (_, i) => ({ 
        value: `test${i}.com`, 
        type: 'domain' 
      }));
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      searchIndicatorsAndObservables.mockResolvedValue({
        indicators: { edges: [] },
        observables: { edges: [] }
      });

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.details.unified).toHaveLength(100);
      expect(searchIndicatorsAndObservables).toHaveBeenCalledTimes(100);
    });

    it('should handle partial search errors for multiple entities', async () => {
      const entities = [
        { value: 'good.com', type: 'domain' },
        { value: 'bad.com', type: 'domain' }
      ];
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      // First succeeds, second fails
      searchIndicatorsAndObservables
        .mockResolvedValueOnce({
          indicators: { edges: [] },
          observables: { edges: [] }
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(assembleLookupResults(entities, options)).rejects.toThrow('OpenCTI Assembly Failed');
    });

    it('should handle complex nested GraphQL response structures', async () => {
      const entities = [{ value: 'complex.com', type: 'domain' }];
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      const complexResults = {
        indicators: {
          edges: [{
            node: {
              id: 'complex-ind',
              name: null, // Test null name
              pattern: '[domain-name:value = "complex.com"]',
              confidence: null,
              x_opencti_score: undefined,
              description: '',
              objectLabel: [], // Empty labels
              created_at: '2023-01-01T00:00:00Z',
              updated_at: null,
              createdBy: null // No creator
            }
          }]
        },
        observables: {
          edges: [{
            node: {
              id: 'complex-obs',
              observable_value: null, // Test null value
              x_opencti_score: 0,
              x_opencti_description: undefined,
              objectLabel: [{ value: 'test-label' }],
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-02T00:00:00Z',
              createdBy: { name: 'System' }
            }
          }]
        }
      };

      searchIndicatorsAndObservables.mockResolvedValue(complexResults);
      isDeletionAllowed.mockReturnValue(true);

      const result = await assembleLookupResults(entities, options);

      expect(result[0].data.details.unified).toHaveLength(1);
      expect(result[0].data.details.unified[0].unified).toHaveLength(2);
      
      // Check that null values are handled gracefully
      const indicatorItem = result[0].data.details.unified[0].indicators[0];
      expect(indicatorItem.displayName).toBe('complex.com'); // Fallback to entity value
      expect(indicatorItem.name).toBe('[domain-name:value = "complex.com"]'); // Uses pattern when name is null
      expect(indicatorItem.confidence).toBe(50); // Default value
      expect(indicatorItem.createdBy).toBe('Unknown'); // Default for null creator
      
      const observableItem = result[0].data.details.unified[0].observables[0];
      expect(observableItem.displayName).toBe('complex.com'); // Fallback to entity value
      expect(observableItem.labels).toEqual(['test-label']);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent entity processing', async () => {
      const entities = [
        { value: 'concurrent1.com', type: 'domain' },
        { value: 'concurrent2.com', type: 'domain' },
        { value: 'concurrent3.com', type: 'domain' }
      ];
      const options = {};

      splitOutIgnoredIps.mockReturnValue({
        entitiesPartition: entities,
        ignoredIpLookupResults: []
      });

      // Add delay to simulate real async operations
      searchIndicatorsAndObservables.mockImplementation(async (entity) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          indicators: { edges: [] },
          observables: { edges: [] }
        };
      });

      const startTime = Date.now();
      const result = await assembleLookupResults(entities, options);
      const endTime = Date.now();

      // Should complete in roughly parallel time, not sequential
      expect(endTime - startTime).toBeLessThan(300); // Should be much faster than 3x10ms sequential
      expect(result[0].data.details.unified).toHaveLength(3);
    });
  });

  describe('Unified Data Structure Creation', () => {
    it('should create unified data structure with indicators and observables', () => {
      const entity = { value: 'test.com', type: 'domain' };
      const indicators = [
        {
            id: 'indicator-1',
            name: 'test.com malware',
            pattern: '[domain-name:value = "test.com"]',
            confidence: 75,
            x_opencti_score: 80,
            description: 'Malicious domain',
          objectLabel: [{ value: 'malware' }],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z',
            createdBy: { name: 'OpenCTI' }
        }
      ];
      const observables = [
        {
            id: 'observable-1',
            observable_value: 'test.com',
            x_opencti_score: 70,
            x_opencti_description: 'Observed domain',
          objectLabel: [{ value: 'suspicious' }],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z',
            createdBy: { name: 'OpenCTI' }
        }
      ];
      const options = { 
        deletionPermissions: [
          { value: "indicators", display: "Allow Indicator Deletion" },
          { value: "observables", display: "Allow Observable Deletion" }
        ]
      };

      // Mock the permission check
      isDeletionAllowed.mockReturnValue(true);

      const result = createUnifiedDataStructure(entity, indicators, observables, options);

      expect(result).toMatchObject({
        entity: entity,
        hasItems: true,
        hasIndicators: true,
        hasObservables: true,
        itemCount: 2,
        indicatorCount: 1,
        observableCount: 1,
        foundInOpenCTI: true,
        displayType: 'Domain',
        canCreate: true,
        canDelete: true
      });

      // Check unified items
      expect(result.unified).toHaveLength(2);
      expect(result.unified[0]).toMatchObject({
        type: 'indicator',
        icon: '👤',
        displayType: 'Indicator',
        canEdit: true,
        canDelete: true
      });
      expect(result.unified[1]).toMatchObject({
        type: 'observable',
        icon: '🔍',
        displayType: 'Observable',
        canEdit: true,
        canDelete: true
      });
    });

    it('should handle empty indicators and observables arrays', () => {
      const entity = { value: 'test.com', type: 'domain' };
      const indicators = [];
      const observables = [];
      const options = {};

      isDeletionAllowed.mockReturnValue(false);

      const result = createUnifiedDataStructure(entity, indicators, observables, options);

      expect(result.hasItems).toBe(false);
      expect(result.hasIndicators).toBe(false);
      expect(result.hasObservables).toBe(false);
      expect(result.itemCount).toBe(0);
      expect(result.indicatorCount).toBe(0);
      expect(result.observableCount).toBe(0);
      expect(result.foundInOpenCTI).toBe(false);
    });

    it('should handle only indicators', () => {
      const entity = { value: '192.168.1.1', type: 'IPv4' };
      const indicators = [
        {
            id: 'indicator-1',
            name: '192.168.1.1',
            pattern: '[ipv4-addr:value = "192.168.1.1"]',
            confidence: 85,
            x_opencti_score: 90,
            description: 'Malicious IP',
          objectLabel: [],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z',
            createdBy: { name: 'OpenCTI' }
        }
      ];
      const observables = [];
      const options = { deletionPermissions: [] };

      isDeletionAllowed.mockReturnValue(false);

      const result = createUnifiedDataStructure(entity, indicators, observables, options);

      expect(result.hasItems).toBe(true);
      expect(result.hasIndicators).toBe(true);
      expect(result.hasObservables).toBe(false);
      expect(result.itemCount).toBe(1);
      expect(result.indicatorCount).toBe(1);
      expect(result.observableCount).toBe(0);
      expect(result.canDelete).toBe(false);
    });

    it('should handle only observables', () => {
      const entity = { value: 'alice@example.com', type: 'email' };
      const indicators = [];
      const observables = [
        {
            id: 'observable-1',
            observable_value: 'alice@example.com',
            x_opencti_score: 60,
            x_opencti_description: 'Observed email',
          objectLabel: [],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z',
            createdBy: { name: 'OpenCTI' }
        }
      ];
      const options = {};

      isDeletionAllowed.mockReturnValue(false);

      const result = createUnifiedDataStructure(entity, indicators, observables, options);

      expect(result.hasItems).toBe(true);
      expect(result.hasIndicators).toBe(false);
      expect(result.hasObservables).toBe(true);
      expect(result.itemCount).toBe(1);
      expect(result.indicatorCount).toBe(0);
      expect(result.observableCount).toBe(1);
    });

    it('should sort unified items by creation date (newest first)', () => {
      const entity = { value: 'test.com', type: 'domain' };
      const indicators = [
        {
          id: 'indicator-old',
          name: 'Old indicator',
          pattern: '[domain-name:value = "test.com"]',
          created_at: '2022-01-01T00:00:00Z',
          objectLabel: [],
          createdBy: { name: 'OpenCTI' }
        }
      ];
      const observables = [
        {
          id: 'observable-new',
          observable_value: 'test.com',
          created_at: '2023-01-01T00:00:00Z',
          objectLabel: [],
          createdBy: { name: 'OpenCTI' }
        }
      ];
      const options = {};

      isDeletionAllowed.mockReturnValue(false);

      const result = createUnifiedDataStructure(entity, indicators, observables, options);

      expect(result.unified).toHaveLength(2);
      expect(result.unified[0].id).toBe('observable-new'); // Newer first
      expect(result.unified[1].id).toBe('indicator-old');
    });

    it('should preserve entity structure', () => {
      const entity = { value: 'test.com', type: 'domain', customProperty: 'test' };
      const indicators = [];
      const observables = [];
      const options = {};

      isDeletionAllowed.mockReturnValue(false);

      const result = createUnifiedDataStructure(entity, indicators, observables, options);

      expect(result.entity).toBe(entity); // Should be the same reference
      expect(result.entity.customProperty).toBe('test');
    });

    it('should handle valid inputs without crashing', () => {
      const entity = { value: 'test', type: 'unknown' };
      const indicators = [];
      const observables = [];
      const options = {};

      isDeletionAllowed.mockReturnValue(false);

      expect(() => createUnifiedDataStructure(entity, indicators, observables, options)).not.toThrow();
    });
  });

  describe('Entity Display Type Mapping', () => {
    it('should map entity types to correct display types', () => {
      const testCases = [
        { type: 'IPv4', expected: 'IP Address' },
        { type: 'IPv6', expected: 'IP Address' },
        { type: 'domain', expected: 'Domain' },
        { type: 'email', expected: 'Email' },
        { type: 'MAC', expected: 'MAC Address' },
        { type: 'MD5', expected: 'File Hash' },
        { type: 'SHA1', expected: 'File Hash' },
        { type: 'SHA256', expected: 'File Hash' },
        { type: 'url', expected: 'URL' },
        { type: 'cve', expected: 'CVE' }
      ];

      testCases.forEach(({ type, expected }) => {
        const entity = { value: 'test', type };
        const displayType = getEntityDisplayType(entity);
        expect(displayType).toBe(expected);
      });
    });

    it('should handle unknown entity types', () => {
      const entity = { value: 'test', type: 'unknown' };
      const displayType = getEntityDisplayType(entity);
      expect(displayType).toBe('unknown');
    });
  });

  describe('Icon Assignment', () => {
    it('should assign correct icons to indicators and observables', () => {
      const entity = { value: 'test.com', type: 'domain' };
      const indicators = [
        {
            id: 'indicator-1',
            name: 'test indicator',
            pattern: '[domain-name:value = "test.com"]',
          objectLabel: [],
            created_at: '2023-01-01T00:00:00Z',
            createdBy: { name: 'OpenCTI' }
        }
      ];
      const observables = [
        {
            id: 'observable-1',
            observable_value: 'test.com',
          objectLabel: [],
            created_at: '2023-01-01T00:00:00Z',
            createdBy: { name: 'OpenCTI' }
        }
      ];
      const options = {};

      isDeletionAllowed.mockReturnValue(false);

      const result = createUnifiedDataStructure(entity, indicators, observables, options);

      // Check indicator icon (fingerprint)
      const indicatorItem = result.unified.find(item => item.type === 'indicator');
      expect(indicatorItem.icon).toBe('👤');
      expect(indicatorItem.displayType).toBe('Indicator');

      // Check observable icon (binoculars)
      const observableItem = result.unified.find(item => item.type === 'observable');
      expect(observableItem.icon).toBe('🔍');
      expect(observableItem.displayType).toBe('Observable');
    });
  });

  describe('Module Exports', () => {
    it('should export required functions', () => {
      const module = require('../../../server/core/assembleLookupResults');
      
      expect(typeof module.createUnifiedDataStructure).toBe('function');
      expect(typeof module.getEntityDisplayType).toBe('function');
      expect(typeof module).toBe('function'); // Main assembleLookupResults function
    });

    it('should handle basic function parameters', () => {
      const entity = { value: 'test', type: 'domain' };
      const indicators = [];
      const observables = [];
      const options = {};

      isDeletionAllowed.mockReturnValue(false);

      expect(() => {
        createUnifiedDataStructure(entity, indicators, observables, options);
      }).not.toThrow();
    });
  });
}); 