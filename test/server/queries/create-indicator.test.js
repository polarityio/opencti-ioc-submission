/**
 * Tests for OpenCTI Indicator Creation Mutation
 * Ensures Phase 2 coverage requirements are met for query modules
 */

const { 
  createIndicator, 
  CREATE_INDICATOR_MUTATION,
  generateStixPattern,
  applyDefaultValues,
  validateFieldRestrictions,
  applyFieldRestrictions
} = require('../../../server/queries/create-indicator');

// Mock polarity-integration-utils
jest.mock('polarity-integration-utils', () => ({
  logging: {
    getLogger: jest.fn(() => ({
      trace: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }))
  }
}));

// Mock errors module
jest.mock('../../../server/errorHandling/opencti-errors', () => ({
  isAuthRequiredError: jest.fn(),
  isGraphQLError: jest.fn(),
  parseOpenCTIError: jest.fn()
}));

// Mock constants module
jest.mock('../../../server/core/constants', () => ({
  STIX_PATTERNS: {
    domain: (value) => `[domain-name:value = '${value}']`,
    IPv4: (value) => `[ipv4-addr:value = '${value}']`,
    IPv6: (value) => `[ipv6-addr:value = '${value}']`,
    email: (value) => `[email-addr:value = '${value}']`,
    MD5: (value) => `[file:hashes.'MD5' = '${value}']`,
    SHA1: (value) => `[file:hashes.'SHA-1' = '${value}']`,
    SHA256: (value) => `[file:hashes.'SHA-256' = '${value}']`,
    url: (value) => `[url:value = '${value}']`,
    MAC: (value) => `[mac-addr:value = '${value}']`,
    hash: (value) => {
      // Detect hash type by length and return appropriate pattern
      if (value.length === 32) return `[file:hashes.'MD5' = '${value}']`;
      if (value.length === 40) return `[file:hashes.'SHA-1' = '${value}']`;
      if (value.length === 64) return `[file:hashes.'SHA-256' = '${value}']`;
      return `[file:hashes.'MD5' = '${value}']`; // Default to MD5
    }
  }
}));

// Mock the core request module
jest.mock('../../../server/core', () => ({
  makeOpenCTIRequest: jest.fn()
}));

const { makeOpenCTIRequest } = require('../../../server/core');
// Mock error handling functions
const { isAuthRequiredError, isGraphQLError, parseOpenCTIError } = require('../../../server/errorHandling/opencti-errors');

describe('OpenCTI Create Indicator - Complete Coverage', () => {
  const mockEntity = {
    value: 'example.com',
    type: 'domain'
  };

  const mockIndicatorData = {
    name: 'Test Indicator',
    description: 'Test description',
    confidence: 75,
    score: 80,
    labels: ['test'],
    createdBy: 'Test User'
  };

  const mockOptions = {
    url: 'https://demo.opencti.io',
    apiKey: 'test-api-key',
    timeout: 30000
  };

  const mockLogger = {
    trace: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createIndicator Function', () => {
    it('should successfully create an indicator', async () => {
      const mockResponse = {
        indicatorAdd: {
          id: 'indicator-123',
          name: 'Test Indicator',
          pattern: '[domain-name:value = "example.com"]',
          confidence: 75,
          x_opencti_score: 80
        }
      };

      makeOpenCTIRequest.mockResolvedValue(mockResponse);

      const result = await createIndicator(mockEntity, mockIndicatorData, mockOptions, mockLogger);

      expect(result).toEqual(mockResponse.indicatorAdd);

      expect(mockLogger.trace).toHaveBeenCalledWith('Creating OpenCTI indicator', {
        entity: 'example.com',
        type: 'domain',
        indicatorData: mockIndicatorData
      });

      expect(makeOpenCTIRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation CreateIndicator'),
        {
              input: {
                pattern_type: 'stix',
                pattern: '[domain-name:value = \'example.com\']',
                name: 'Test Indicator',
                description: 'Test description',
                indicator_types: ['malicious-activity'],
                confidence: 75,
                x_opencti_score: 80,
                objectLabel: ['test'],
                createdBy: 'Test User'
              }
        },
        mockOptions,
        mockLogger
      );
    });

    it('should use default values when indicator data is minimal', async () => {
      const mockResponse = {
        indicatorAdd: {
          id: 'indicator-123',
          name: 'example.com',
          pattern: '[domain-name:value = "example.com"]'
        }
      };

      makeOpenCTIRequest.mockResolvedValue(mockResponse);

      const result = await createIndicator(mockEntity, {}, mockOptions, mockLogger);

      expect(result).toEqual(mockResponse.indicatorAdd);

      // Check that defaults were used
      const callArgs = makeOpenCTIRequest.mock.calls[0][1];
      
      expect(callArgs.input.name).toBe('example.com');
      expect(callArgs.input.description).toContain('Created by Polarity IOC Submission Integration');
      expect(callArgs.input.confidence).toBe(50);
      expect(callArgs.input.x_opencti_score).toBe(50);
      expect(callArgs.input.objectLabel).toEqual([]);
      expect(callArgs.input.createdBy).toBe('Polarity');
    });

    it('should handle user option default values', async () => {
      const mockResponse = { indicatorAdd: { id: 'test' } };
      makeOpenCTIRequest.mockResolvedValue(mockResponse);

      const optionsWithDefaults = {
        ...mockOptions,
        defaultSubmissionValues: [
          { value: 'score_75' },
          { value: 'confidence_high' }
        ]
      };

      await createIndicator(mockEntity, {}, optionsWithDefaults, mockLogger);

      const callArgs = makeOpenCTIRequest.mock.calls[0][1];
      expect(callArgs.input.x_opencti_score).toBe(75);
      expect(callArgs.input.confidence).toBe(75);
    });

    it('should handle user option field restrictions', async () => {
      const mockResponse = { indicatorAdd: { id: 'test' } };
      makeOpenCTIRequest.mockResolvedValue(mockResponse);

      const optionsWithRestrictions = {
        ...mockOptions,
        submissionFieldRestrictions: [
          { value: 'score_disabled' },
          { value: 'description_disabled' }
        ]
      };

      const indicatorDataWithDisabled = {
        name: 'Test',
        description: 'Should be removed',
        score: 90
      };

      await createIndicator(mockEntity, indicatorDataWithDisabled, optionsWithRestrictions, mockLogger);

      const callArgs = makeOpenCTIRequest.mock.calls[0][1];
      expect(callArgs.input.description).toContain('Created by Polarity'); // Default used
      expect(callArgs.input.x_opencti_score).toBe(50); // Default used
    });

    it('should handle validation errors', async () => {
      const optionsWithValidation = {
        ...mockOptions,
        submissionFieldRestrictions: [
          { value: 'score_required' },
          { value: 'description_required' }
        ]
      };

      await expect(
        createIndicator(mockEntity, {}, optionsWithValidation, mockLogger)
      ).rejects.toThrow('Validation failed: Score is required for indicator submission, Description is required for indicator submission');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      makeOpenCTIRequest.mockRejectedValue(networkError);

      await expect(createIndicator(mockEntity, mockIndicatorData, mockOptions, mockLogger))
        .rejects.toThrow('Network timeout');

      expect(mockLogger.error).toHaveBeenCalledWith('OpenCTI indicator creation failed', {
        entity: 'example.com',
        error: 'Network timeout'
      });
    });

    it('should handle AUTH_REQUIRED errors', async () => {
      const authError = new Error('Auth failed');
      isAuthRequiredError.mockReturnValue(true);
      makeOpenCTIRequest.mockRejectedValue(authError);

      await expect(createIndicator(mockEntity, mockIndicatorData, mockOptions, mockLogger))
        .rejects.toThrow('Authentication failed: Invalid API key or insufficient permissions');

      expect(isAuthRequiredError).toHaveBeenCalledWith(authError);
    });

    it('should handle GraphQL errors', async () => {
      const graphqlError = new Error('GraphQL error');
      isAuthRequiredError.mockReturnValue(false);
      isGraphQLError.mockReturnValue(true);
      parseOpenCTIError.mockReturnValue({ message: 'Invalid pattern' });
      makeOpenCTIRequest.mockRejectedValue(graphqlError);

      await expect(createIndicator(mockEntity, mockIndicatorData, mockOptions, mockLogger))
        .rejects.toThrow('OpenCTI GraphQL error: Invalid pattern');

      expect(parseOpenCTIError).toHaveBeenCalledWith(graphqlError);
    });

    it('should work without logger parameter', async () => {
      const mockResponse = { indicatorAdd: { id: 'indicator-123' } };
      makeOpenCTIRequest.mockResolvedValue(mockResponse);

      const result = await createIndicator(mockEntity, {}, mockOptions);

      expect(result).toEqual(mockResponse.indicatorAdd);
    });
  });

  describe('applyDefaultValues Function', () => {
    it('should apply score defaults correctly', () => {
      const indicatorData = {};
      const options = {
        defaultSubmissionValues: [
          { value: 'score_75' }
        ]
      };

      const result = applyDefaultValues(indicatorData, options);

      expect(result.score).toBe(75);
      expect(result.x_opencti_score).toBe(75);
    });

    it('should apply confidence defaults correctly', () => {
      const indicatorData = {};
      const options = {
        defaultSubmissionValues: [
          { value: 'confidence_low' },
          'confidence_medium',
          { value: 'confidence_high' },
          { value: 'confidence_certain' }
        ]
      };

      // Test low confidence
      const resultLow = applyDefaultValues(indicatorData, {
        defaultSubmissionValues: [{ value: 'confidence_low' }]
      });
      expect(resultLow.confidence).toBe(25);

      // Test medium confidence  
      const resultMedium = applyDefaultValues(indicatorData, {
        defaultSubmissionValues: ['confidence_medium']
      });
      expect(resultMedium.confidence).toBe(50);

      // Test high confidence
      const resultHigh = applyDefaultValues(indicatorData, {
        defaultSubmissionValues: [{ value: 'confidence_high' }]
      });
      expect(resultHigh.confidence).toBe(75);

      // Test certain confidence
      const resultCertain = applyDefaultValues(indicatorData, {
        defaultSubmissionValues: [{ value: 'confidence_certain' }]
      });
      expect(resultCertain.confidence).toBe(100);
    });

    it('should handle unknown confidence defaults', () => {
      const indicatorData = {};
      const options = {
        defaultSubmissionValues: [
          { value: 'confidence_unknown' }
        ]
      };

      const result = applyDefaultValues(indicatorData, options);

      expect(result.confidence).toBe(50); // Default fallback
    });

    it('should not override existing values', () => {
      const indicatorData = {
        score: 90,
        confidence: 80
      };
      const options = {
        defaultSubmissionValues: [
          { value: 'score_50' },
          { value: 'confidence_low' }
        ]
      };

      const result = applyDefaultValues(indicatorData, options);

      expect(result.score).toBe(90); // Original value preserved
      expect(result.confidence).toBe(80); // Original value preserved
    });

    it('should handle missing defaultSubmissionValues', () => {
      const indicatorData = { name: 'test' };
      const options = {};

      const result = applyDefaultValues(indicatorData, options);

      expect(result).toEqual(indicatorData);
    });

    it('should handle non-array defaultSubmissionValues', () => {
      const indicatorData = { name: 'test' };
      const options = {
        defaultSubmissionValues: 'not an array'
      };

      const result = applyDefaultValues(indicatorData, options);

      expect(result).toEqual(indicatorData);
    });

    it('should handle string values without object wrapper', () => {
      const indicatorData = {};
      const options = {
        defaultSubmissionValues: ['score_60']
      };

      const result = applyDefaultValues(indicatorData, options);

      expect(result.score).toBe(60);
      expect(result.x_opencti_score).toBe(60);
    });
  });

  describe('validateFieldRestrictions Function', () => {
    it('should validate required score', () => {
      const indicatorData = {};
      const options = {
        submissionFieldRestrictions: [
          { value: 'score_required' }
        ]
      };

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toContain('Score is required for indicator submission');
    });

    it('should validate required description', () => {
      const indicatorData = {};
      const options = {
        submissionFieldRestrictions: [
          { value: 'description_required' }
        ]
      };

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toContain('Description is required for indicator submission');
    });

    it('should validate required labels', () => {
      const indicatorData = {};
      const options = {
        submissionFieldRestrictions: [
          { value: 'labels_required' }
        ]
      };

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toContain('Labels are required for indicator submission');
    });

    it('should validate empty labels array', () => {
      const indicatorData = { labels: [] };
      const options = {
        submissionFieldRestrictions: [
          { value: 'labels_required' }
        ]
      };

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toContain('Labels are required for indicator submission');
    });

    it('should pass validation when required fields are present', () => {
      const indicatorData = {
        score: 75,
        description: 'Test description',
        labels: ['test']
      };
      const options = {
        submissionFieldRestrictions: [
          { value: 'score_required' },
          { value: 'description_required' },
          { value: 'labels_required' }
        ]
      };

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toHaveLength(0);
    });

    it('should handle missing submissionFieldRestrictions', () => {
      const indicatorData = {};
      const options = {};

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toHaveLength(0);
    });

    it('should handle non-array submissionFieldRestrictions', () => {
      const indicatorData = {};
      const options = {
        submissionFieldRestrictions: 'not an array'
      };

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toHaveLength(0);
    });

    it('should handle string values without object wrapper', () => {
      const indicatorData = {};
      const options = {
        submissionFieldRestrictions: ['score_required']
      };

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toContain('Score is required for indicator submission');
    });

    it('should handle multiple validation errors', () => {
      const indicatorData = {};
      const options = {
        submissionFieldRestrictions: [
          { value: 'score_required' },
          { value: 'description_required' },
          { value: 'labels_required' }
        ]
      };

      const errors = validateFieldRestrictions(indicatorData, options);

      expect(errors).toHaveLength(3);
      expect(errors).toContain('Score is required for indicator submission');
      expect(errors).toContain('Description is required for indicator submission');
      expect(errors).toContain('Labels are required for indicator submission');
    });
  });

  describe('applyFieldRestrictions Function', () => {
    it('should remove disabled score fields', () => {
      const indicatorData = {
        name: 'test',
        score: 75,
        x_opencti_score: 80,
        description: 'test'
      };
      const options = {
        submissionFieldRestrictions: [
          { value: 'score_disabled' }
        ]
      };

      const result = applyFieldRestrictions(indicatorData, options);

      expect(result.name).toBe('test');
      expect(result.description).toBe('test');
      expect(result.score).toBeUndefined();
      expect(result.x_opencti_score).toBeUndefined();
    });

    it('should remove disabled description field', () => {
      const indicatorData = {
        name: 'test',
        description: 'should be removed',
        score: 75
      };
      const options = {
        submissionFieldRestrictions: [
          { value: 'description_disabled' }
        ]
      };

      const result = applyFieldRestrictions(indicatorData, options);

      expect(result.name).toBe('test');
      expect(result.score).toBe(75);
      expect(result.description).toBeUndefined();
    });

    it('should remove disabled labels field', () => {
      const indicatorData = {
        name: 'test',
        labels: ['should', 'be', 'removed'],
        score: 75
      };
      const options = {
        submissionFieldRestrictions: [
          { value: 'labels_disabled' }
        ]
      };

      const result = applyFieldRestrictions(indicatorData, options);

      expect(result.name).toBe('test');
      expect(result.score).toBe(75);
      expect(result.labels).toBeUndefined();
    });

    it('should handle multiple disabled fields', () => {
      const indicatorData = {
        name: 'test',
        score: 75,
        x_opencti_score: 80,
        description: 'remove me',
        labels: ['remove', 'me', 'too'],
        confidence: 90
      };
      const options = {
        submissionFieldRestrictions: [
          { value: 'score_disabled' },
          { value: 'description_disabled' },
          { value: 'labels_disabled' }
        ]
      };

      const result = applyFieldRestrictions(indicatorData, options);

      expect(result.name).toBe('test');
      expect(result.confidence).toBe(90);
      expect(result.score).toBeUndefined();
      expect(result.x_opencti_score).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.labels).toBeUndefined();
    });

    it('should handle missing submissionFieldRestrictions', () => {
      const indicatorData = {
        name: 'test',
        score: 75,
        description: 'test'
      };
      const options = {};

      const result = applyFieldRestrictions(indicatorData, options);

      expect(result).toEqual(indicatorData);
    });

    it('should handle non-array submissionFieldRestrictions', () => {
      const indicatorData = {
        name: 'test',
        score: 75
      };
      const options = {
        submissionFieldRestrictions: 'not an array'
      };

      const result = applyFieldRestrictions(indicatorData, options);

      expect(result).toEqual(indicatorData);
    });

    it('should handle string values without object wrapper', () => {
      const indicatorData = {
        name: 'test',
        score: 75
      };
      const options = {
        submissionFieldRestrictions: ['score_disabled']
      };

      const result = applyFieldRestrictions(indicatorData, options);

      expect(result.name).toBe('test');
      expect(result.score).toBeUndefined();
    });

    it('should preserve data when no disabled fields match', () => {
      const indicatorData = {
        name: 'test',
        score: 75,
        description: 'test'
      };
      const options = {
        submissionFieldRestrictions: [
          { value: 'other_disabled' }
        ]
      };

      const result = applyFieldRestrictions(indicatorData, options);

      expect(result).toEqual(indicatorData);
    });
  });

  describe('generateStixPattern Function', () => {
    it('should generate correct STIX pattern for domain', () => {
      const entity = { type: 'domain', value: 'example.com' };
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[domain-name:value = \'example.com\']');
    });

    it('should generate correct STIX pattern for IPv4', () => {
      const entity = { type: 'IPv4', value: '192.168.1.1' };
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[ipv4-addr:value = \'192.168.1.1\']');
    });

    it('should generate correct STIX pattern for email', () => {
      const entity = { type: 'email', value: 'test@example.com' };
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[email-addr:value = \'test@example.com\']');
    });

    it('should generate correct STIX pattern for MD5 hash by length', () => {
      const entity = { type: 'hash', value: 'd41d8cd98f00b204e9800998ecf8427e' }; // 32 chars = MD5
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[file:hashes.\'MD5\' = \'d41d8cd98f00b204e9800998ecf8427e\']');
    });

    it('should generate correct STIX pattern for SHA1 hash by length', () => {
      const entity = { type: 'hash', value: 'da39a3ee5e6b4b0d3255bfef95601890afd80709' }; // 40 chars = SHA1
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[file:hashes.\'SHA-1\' = \'da39a3ee5e6b4b0d3255bfef95601890afd80709\']');
    });

    it('should generate correct STIX pattern for SHA256 hash by length', () => {
      const entity = { type: 'hash', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }; // 64 chars = SHA256
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[file:hashes.\'SHA-256\' = \'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\']');
    });

    it('should generate correct STIX pattern for specific MD5 type', () => {
      const entity = { type: 'MD5', value: 'd41d8cd98f00b204e9800998ecf8427e' };
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[file:hashes.\'MD5\' = \'d41d8cd98f00b204e9800998ecf8427e\']');
    });

    it('should generate correct STIX pattern for specific SHA1 type', () => {
      const entity = { type: 'SHA1', value: 'da39a3ee5e6b4b0d3255bfef95601890afd80709' };
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[file:hashes.\'SHA-1\' = \'da39a3ee5e6b4b0d3255bfef95601890afd80709\']');
    });

    it('should generate correct STIX pattern for specific SHA256 type', () => {
      const entity = { type: 'SHA256', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' };
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[file:hashes.\'SHA-256\' = \'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\']');
    });

    it('should default to MD5 for unknown hash length', () => {
      const entity = { type: 'hash', value: 'short' }; // Unknown length
      const pattern = generateStixPattern(entity);
      expect(pattern).toBe('[file:hashes.\'MD5\' = \'short\']');
    });

    it('should throw error for unsupported entity type', () => {
      const entity = { type: 'unsupported', value: 'test' };
      expect(() => generateStixPattern(entity)).toThrow('Unsupported entity type for STIX pattern generation: unsupported');
    });
  });

  describe('GraphQL Mutation Constant', () => {
    it('should export the correct GraphQL mutation', () => {
      expect(CREATE_INDICATOR_MUTATION).toContain('mutation CreateIndicator');
      expect(CREATE_INDICATOR_MUTATION).toContain('$input: IndicatorAddInput!');
      expect(CREATE_INDICATOR_MUTATION).toContain('indicatorAdd(input: $input)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty entity value', () => {
      const emptyEntity = { type: 'domain', value: '' };
      const pattern = generateStixPattern(emptyEntity);
      expect(pattern).toBe('[domain-name:value = \'\']');
    });

    it('should handle malformed response body', async () => {
      const malformedError = new Error('Malformed response');
      isAuthRequiredError.mockReturnValue(false);
      isGraphQLError.mockReturnValue(false);
      makeOpenCTIRequest.mockRejectedValue(malformedError);

      await expect(createIndicator(mockEntity, mockIndicatorData, mockOptions, mockLogger))
        .rejects.toThrow('Malformed response');
    });
  });
}); 