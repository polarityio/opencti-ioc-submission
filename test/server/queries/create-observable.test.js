/**
 * Tests for OpenCTI Observable Creation Mutation
 * Ensures Phase 2 coverage requirements are met for query modules
 */

const { 
  createObservable, 
  CREATE_OBSERVABLE_MUTATION,
  generateObservableVariables
} = require('../../../server/queries/create-observable');

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
  },
  OPENCTI_ENTITY_TYPES: {
    domain: 'Domain-Name',
    IPv4: 'IPv4-Addr',
    IPv6: 'IPv6-Addr',
    email: 'Email-Addr',
    MAC: 'Mac-Addr',
    hash: 'StixFile',
    MD5: 'StixFile',
    SHA1: 'StixFile',
    SHA256: 'StixFile'
  }
}));

// Mock postman-request
jest.mock('postman-request', () => {
  return jest.fn();
});

const request = require('postman-request');
const { isAuthRequiredError, isGraphQLError, parseOpenCTIError } = require('../../../server/errorHandling/opencti-errors');

describe('OpenCTI Create Observable', () => {
  const mockDomainEntity = {
    value: 'example.com',
    type: 'domain'
  };

  const mockHashEntity = {
    value: 'd41d8cd98f00b204e9800998ecf8427e',
    type: 'MD5'
  };

  const mockObservableData = {
    description: 'Test observable',
    score: 75,
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

  describe('createObservable Function', () => {
    it('should successfully create a domain observable', async () => {
      const mockResponse = {
        stixCyberObservableAdd: {
          id: 'observable-123',
          observable_value: 'example.com',
          x_opencti_score: 75
        }
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await createObservable(mockDomainEntity, mockObservableData, mockOptions, mockLogger);

      expect(result).toEqual(mockResponse.stixCyberObservableAdd);

      expect(mockLogger.trace).toHaveBeenCalledWith('Creating OpenCTI observable', {
        entity: 'example.com',
        type: 'domain',
        observableData: mockObservableData
      });

      const callArgs = request.mock.calls[0][0];
      const requestBody = callArgs.body; // Body is already an object when json: true
      
      expect(requestBody.variables.type).toBe('Domain-Name');
      expect(requestBody.variables.DomainName.value).toBe('example.com');
    });

    it('should successfully create a hash observable', async () => {
      const mockResponse = {
        stixCyberObservableAdd: {
          id: 'observable-hash-123',
          observable_value: 'd41d8cd98f00b204e9800998ecf8427e',
          x_opencti_score: 75
        }
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await createObservable(mockHashEntity, mockObservableData, mockOptions, mockLogger);

      expect(result).toEqual(mockResponse.stixCyberObservableAdd);

      const callArgs = request.mock.calls[0][0];
      const requestBody = callArgs.body; // Body is already an object when json: true
      
      expect(requestBody.variables.type).toBe('StixFile');
      expect(requestBody.variables.StixFile.hashes).toEqual([{
        algorithm: 'MD5',
        hash: 'd41d8cd98f00b204e9800998ecf8427e'
      }]);
    });

    it('should use default values when observable data is minimal', async () => {
      const mockResponse = {
        stixCyberObservableAdd: {
          id: 'observable-123',
          observable_value: 'example.com'
        }
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await createObservable(mockDomainEntity, {}, mockOptions, mockLogger);

      expect(result).toEqual(mockResponse.stixCyberObservableAdd);

      const callArgs = request.mock.calls[0][0];
      const requestBody = callArgs.body; // Body is already an object when json: true
      
      expect(requestBody.variables.x_opencti_score).toBe(50);
      expect(requestBody.variables.x_opencti_description).toContain('Created by Polarity IOC Submission Integration');
      expect(requestBody.variables.createdBy).toBe('Polarity');
      expect(requestBody.variables.objectLabel).toEqual([]);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      
      request.mockImplementation((options, callback) => {
        callback(networkError);
      });

      await expect(createObservable(mockDomainEntity, mockObservableData, mockOptions, mockLogger))
        .rejects.toThrow('Network timeout');

      expect(mockLogger.error).toHaveBeenCalledWith('OpenCTI observable creation failed', {
        entity: 'example.com',
        error: 'Network request failed: Network timeout'
      });
    });

    it('should handle AUTH_REQUIRED errors', async () => {
      isAuthRequiredError.mockReturnValue(true);

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { errors: [{ message: 'You must be logged in' }] });
      });

      await expect(createObservable(mockDomainEntity, mockObservableData, mockOptions, mockLogger))
        .rejects.toThrow('Authentication failed: Invalid API key or insufficient permissions');

      expect(isAuthRequiredError).toHaveBeenCalled();
    });

    it('should handle GraphQL errors', async () => {
      isAuthRequiredError.mockReturnValue(false);
      isGraphQLError.mockReturnValue(true);
      parseOpenCTIError.mockReturnValue({ message: 'Invalid observable type' });

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { errors: [{ message: 'Invalid observable type' }] });
      });

      await expect(createObservable(mockDomainEntity, mockObservableData, mockOptions, mockLogger))
        .rejects.toThrow('OpenCTI GraphQL error: Invalid observable type');

      expect(parseOpenCTIError).toHaveBeenCalled();
    });

    it('should work without logger parameter', async () => {
      const mockResponse = {
        stixCyberObservableAdd: {
          id: 'observable-123',
          observable_value: 'example.com'
        }
      };

      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, { data: mockResponse });
      });

      const result = await createObservable(mockDomainEntity, {}, mockOptions);

      expect(result).toEqual(mockResponse.stixCyberObservableAdd);
    });
  });

  describe('generateObservableVariables Function', () => {
    it('should generate variables for domain observable', () => {
      const variables = generateObservableVariables(mockDomainEntity, mockObservableData);
      
      expect(variables.type).toBe('Domain-Name');
      expect(variables.DomainName.value).toBe('example.com');
      expect(variables.x_opencti_score).toBe(75);
      expect(variables.x_opencti_description).toBe('Test observable');
    });

    it('should generate variables for IPv4 observable', () => {
      const ipEntity = { type: 'IPv4', value: '192.168.1.1' };
      const variables = generateObservableVariables(ipEntity);
      
      expect(variables.type).toBe('IPv4-Addr');
      expect(variables.IPv4Addr.value).toBe('192.168.1.1');
    });

    it('should generate variables for email observable', () => {
      const emailEntity = { type: 'email', value: 'test@example.com' };
      const variables = generateObservableVariables(emailEntity);
      
      expect(variables.type).toBe('Email-Addr');
      expect(variables.EmailAddr.value).toBe('test@example.com');
    });

    it('should generate variables for MAC observable', () => {
      const macEntity = { type: 'MAC', value: '00:11:22:33:44:55' };
      const variables = generateObservableVariables(macEntity);
      
      expect(variables.type).toBe('Mac-Addr');
      expect(variables.MacAddr.value).toBe('00:11:22:33:44:55');
    });

    it('should throw error for unsupported entity type', () => {
      const unsupportedEntity = { type: 'unsupported', value: 'test' };
      
      expect(() => generateObservableVariables(unsupportedEntity))
        .toThrow('Unsupported entity type for observable creation: unsupported');
    });
  });

  describe('GraphQL Mutation Constant', () => {
    it('should export the correct GraphQL mutation', () => {
      expect(CREATE_OBSERVABLE_MUTATION).toContain('mutation CreateObservable');
      expect(CREATE_OBSERVABLE_MUTATION).toContain('stixCyberObservableAdd');
      expect(CREATE_OBSERVABLE_MUTATION).toContain('$type: String!');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all entity types', () => {
      const entityTypes = ['IPv4', 'IPv6', 'domain', 'email', 'MAC', 'hash', 'MD5', 'SHA1', 'SHA256'];
      
      entityTypes.forEach(type => {
        const entity = { type, value: 'test-value' };
        const variables = generateObservableVariables(entity);
        expect(variables.type).toBeDefined();
      });
    });

    it('should handle malformed response body', async () => {
      request.mockImplementation((options, callback) => {
        callback(null, { statusCode: 200 }, 'invalid json');
      });

      await expect(createObservable(mockDomainEntity, mockObservableData, mockOptions, mockLogger))
        .rejects.toThrow();
    });
  });
}); 