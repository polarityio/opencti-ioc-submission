/**
 * Tests for integration-new.js - Main Integration File
 * TDD Implementation - Following blink-ops patterns with comprehensive testing
 * Tests startup, validateOptions, doLookup, and onMessage functions
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Create persistent mock logger
const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn()
};

// Use manual mock for polarity-integration-utils
jest.mock('polarity-integration-utils', () => ({
  logging: {
    setLogger: jest.fn(),
    getLogger: () => mockLogger
  },
  errors: {
    parseErrorToReadableJson: jest.fn().mockImplementation(error => error)
  },
  requests: {
    createRequestWithDefaults: jest.fn(),
    createRequestsInParallel: jest.fn()
  }
}));

// Mock all server dependencies
const mockAssembleLookupResults = jest.fn();
const mockValidateOptions = jest.fn();
const mockDeleteItem = jest.fn();
const mockSubmitItems = jest.fn();
const mockSearchTags = jest.fn();
const mockSearchGroups = jest.fn();

jest.mock('../server', () => ({
  assembleLookupResults: mockAssembleLookupResults,
  validateOptions: mockValidateOptions,
  onMessage: {
    deleteItem: mockDeleteItem,
    submitItems: mockSubmitItems,
    searchTags: mockSearchTags,
    searchGroups: mockSearchGroups
  }
}));

// Import after mocks are set up
const integration = require('../integration');
const utils = require('polarity-integration-utils');

describe('Integration-New - Main Integration File', () => {
  const mockCallback = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure parseErrorToReadableJson mock is properly reset
    utils.errors.parseErrorToReadableJson.mockImplementation(error => error);
  });
  
  // Shared test data
  const mockEntities = [
    { type: 'IPv4', value: '192.168.1.100', isIP: true },
    { type: 'domain', value: 'example.com', isDomain: true }
  ];
  const mockOptions = {
    url: 'https://tc.example.com',
    authorId: 'test-id',
    apiKey: 'test-key'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback.mockClear();
  });

  describe('Module Exports', () => {
    test('should export required functions', () => {
      expect(typeof integration.startup).toBe('function');
      expect(typeof integration.validateOptions).toBe('function');
      expect(typeof integration.doLookup).toBe('function');
      expect(typeof integration.onMessage).toBe('function');
    });

    test('should follow blink-ops export pattern', () => {
      const exportedKeys = Object.keys(integration);
      expect(exportedKeys).toContain('startup');
      expect(exportedKeys).toContain('validateOptions');
      expect(exportedKeys).toContain('doLookup');
      expect(exportedKeys).toContain('onMessage');
    });
  });

  describe('startup() - Logger Initialization', () => {
    test('should export setLogger as startup function', () => {
      expect(integration.startup).toBe(utils.logging.setLogger);
    });

    test('should follow blink-ops startup pattern', () => {
      const testLogger = { info: jest.fn(), error: jest.fn() };
      
      expect(() => integration.startup(testLogger)).not.toThrow();
      expect(utils.logging.setLogger).toHaveBeenCalledWith(testLogger);
    });
  });

  describe('validateOptions() - Configuration Validation', () => {
    test('should call server validateOptions with options and callback', () => {
      const testOptions = {
        url: { value: 'https://tc.example.com' },
        authorId: { value: 'test-id' },
        apiKey: { value: 'test-key' }
      };

      integration.validateOptions(testOptions, mockCallback);

      expect(mockValidateOptions).toHaveBeenCalledWith(testOptions, mockCallback);
    });
  });

  describe('doLookup() - Entity Processing', () => {
    test('should process entities with assembleLookupResults', async () => {
      const mockLookupResults = [
        { entity: mockEntities[0], data: { summary: ['Test'] } }
      ];

      mockAssembleLookupResults.mockImplementation(async (entities, options) => {
        return mockLookupResults;
      });

      await integration.doLookup(mockEntities, mockOptions, mockCallback);

      expect(mockAssembleLookupResults).toHaveBeenCalledWith(
        mockEntities,
        mockOptions
      );
      expect(mockCallback).toHaveBeenCalledWith(null, mockLookupResults);
    });

    test('should fix entity types before processing', () => {
      const entitiesWithStringType = [
        { type: 'string', types: ['IPv4'], value: '1.2.3.4' },
        { type: 'string', types: ['domain'], value: 'test.com' }
      ];

      mockAssembleLookupResults.mockImplementation((entities, options, callback) => {
        expect(entities[0].type).toBe('IPv4');
        expect(entities[1].type).toBe('domain');
        callback(null, []);
      });

      integration.doLookup(entitiesWithStringType, mockOptions, mockCallback);

      expect(mockAssembleLookupResults).toHaveBeenCalled();
    });

    test('should handle URL with trailing slash', () => {
      const optionsWithTrailingSlash = {
        ...mockOptions,
        url: 'https://tc.example.com/'
      };

      mockAssembleLookupResults.mockImplementation((entities, options, callback) => {
        expect(options.url).toBe('https://tc.example.com');
        callback(null, []);
      });

      integration.doLookup(mockEntities, optionsWithTrailingSlash, mockCallback);

      expect(mockAssembleLookupResults).toHaveBeenCalled();
    });

    test('should handle lookup errors gracefully', async () => {
      const lookupError = new Error('Assembly failed');

      mockAssembleLookupResults.mockImplementation(async (entities, options) => {
        throw lookupError;
      });

      await integration.doLookup(mockEntities, mockOptions, mockCallback);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: lookupError, formattedError: lookupError },
        'Get Lookup Results Failed'
      );
      expect(mockCallback).toHaveBeenCalledWith({ 
        detail: 'Assembly failed', 
        err: lookupError 
      });
    });

    test('should log entity processing', () => {
      mockAssembleLookupResults.mockImplementation((entities, options, callback) => {
        callback(null, []);
      });

      integration.doLookup(mockEntities, mockOptions, mockCallback);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { entities: mockEntities },
        'Fixed Entities'
      );
    });
  });

  describe('onMessage() - Client-Server Communication', () => {
    const mockPayload = {
      action: 'testAction',
      data: { param: 'value' }
    };

    test('should delegate to server onMessage handler with Logger', () => {
      mockDeleteItem.mockImplementation((payload, options, logger, callback) => {
        expect(logger).toBe(mockLogger);
        callback(null, { result: 'success' });
      });

      const payload = { action: 'deleteItem', data: { param: 'value' } };
      integration.onMessage(payload, mockOptions, mockCallback);

      expect(mockDeleteItem).toHaveBeenCalledWith(
        payload.data,
        mockOptions,
        mockLogger,
        mockCallback
      );
    });

    test('should handle message processing errors', () => {
      const messageError = new Error('Message processing failed');

      mockDeleteItem.mockImplementation((payload, options, logger, callback) => {
        callback(messageError);
      });

      const payload = { action: 'deleteItem', data: { param: 'value' } };
      integration.onMessage(payload, mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(messageError);
    });
  });

  describe('Integration Patterns - Blink-ops Compliance', () => {
    test('should use polarity-integration-utils patterns', () => {
      expect(integration.startup).toBe(utils.logging.setLogger);
    });

    test('should handle all required integration lifecycle events', () => {
      expect(integration).toHaveProperty('startup');
      expect(integration).toHaveProperty('validateOptions');
      expect(integration).toHaveProperty('doLookup');
      expect(integration).toHaveProperty('onMessage');
    });

    test('should maintain feature parity with original integration', () => {
      const entities = [{ type: 'string', types: ['IPv4'], value: '1.2.3.4' }];
      
      mockAssembleLookupResults.mockImplementation((entities, options, callback) => {
        expect(entities[0].type).toBe('IPv4');
        callback(null, []);
      });

      integration.doLookup(entities, mockOptions, mockCallback);

      expect(mockAssembleLookupResults).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Logging', () => {
    test('should log lookup results on success', async () => {
      const mockResults = [{ entity: mockEntities[0], data: {} }];

      mockAssembleLookupResults.mockImplementation(async (entities, options) => {
        return mockResults;
      });

      await integration.doLookup(mockEntities, mockOptions, mockCallback);

      expect(mockLogger.trace).toHaveBeenCalledWith(
        { lookupResults: mockResults },
        'Lookup Results'
      );
    });

    test('should provide meaningful error context', async () => {
      const contextError = new Error('Context test');
      contextError.statusCode = 500;

      mockAssembleLookupResults.mockImplementation(async (entities, options) => {
        throw contextError;
      });

      await integration.doLookup(mockEntities, mockOptions, mockCallback);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: contextError, formattedError: contextError },
        'Get Lookup Results Failed'
      );
    });
  });
}); 