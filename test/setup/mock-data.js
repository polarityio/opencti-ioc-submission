/**
 * Mock Data for OpenCTI IOC Submission Integration Tests
 * Structured for OpenCTI GraphQL API with legacy test compatibility
 */

// =============================================================================
// OPENCTI API STRUCTURES (Current Implementation)
// =============================================================================

// Mock Entity Data (Polarity standard format)
const mockEntities = {
  ipv4: {
    type: 'IPv4',
    value: '192.168.1.100',
    types: ['IPv4', 'ip'],
    isIPv4: true,
    isIPv6: false,
    isHash: false,
    isMD5: false,
    isSHA1: false,
    isSHA256: false,
    isEmail: false,
    isDomain: false,
    isURL: false
  },
  
  ipv6: {
    type: 'IPv6', 
    value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    types: ['IPv6', 'ip'],
    isIPv4: false,
    isIPv6: true,
    isHash: false,
    isMD5: false,
    isSHA1: false,
    isSHA256: false,
    isEmail: false,
    isDomain: false,
    isURL: false
  },
  
  domain: {
    type: 'domain',
    value: 'malicious-example.com',
    types: ['domain'],
    isIPv4: false,
    isIPv6: false,
    isHash: false,
    isMD5: false,
    isSHA1: false,
    isSHA256: false,
    isEmail: false,
    isDomain: true,
    isURL: false
  },
  
  url: {
    type: 'url',
    value: 'https://malicious-example.com/payload',
    types: ['url'],
    isIPv4: false,
    isIPv6: false,
    isHash: false,
    isMD5: false,
    isSHA1: false,
    isSHA256: false,
    isEmail: false,
    isDomain: false,
    isURL: true
  },
  
  email: {
    type: 'email',
    value: 'attacker@malicious-example.com',
    types: ['email'],
    isIPv4: false,
    isIPv6: false,
    isHash: false,
    isMD5: false,
    isSHA1: false,
    isSHA256: false,
    isEmail: true,
    isDomain: false,
    isURL: false
  },
  
  md5Hash: {
    type: 'hash',
    value: '5d41402abc4b2a76b9719d911017c592',
    types: ['hash', 'MD5'],
    isIPv4: false,
    isIPv6: false,
    isHash: true,
    isMD5: true,
    isSHA1: false,
    isSHA256: false,
    isEmail: false,
    isDomain: false,
    isURL: false
  },
  
  sha1Hash: {
    type: 'hash',
    value: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
    types: ['hash', 'SHA1'],
    isIPv4: false,
    isIPv6: false,
    isHash: true,
    isMD5: false,
    isSHA1: true,
    isSHA256: false,
    isEmail: false,
    isDomain: false,
    isURL: false
  },
  
  sha256Hash: {
    type: 'hash',
    value: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    types: ['hash', 'SHA256'],
    isIPv4: false,
    isIPv6: false,
    isHash: true,
    isMD5: false,
    isSHA1: false,
    isSHA256: true,
    isEmail: false,
    isDomain: false,
    isURL: false
  },

  // Entity type fixing test cases
  stringEntity: {
    type: 'string',
    value: '192.168.1.200',
    types: ['IPv4', 'ip'],
    isIPv4: true,
    isIPv6: false,
    isHash: false,
    isMD5: false,
    isSHA1: false,
    isSHA256: false,
    isEmail: false,
    isDomain: false,
    isURL: false
  }
};

// Mock ThreatConnect Indicator Responses (REST API format)
const mockThreatConnectIndicators = {
  existingIndicator: {
    id: 12345,
    type: 'File',
    rating: 3.0,
    confidence: 85,
    dateAdded: '2024-01-15T10:00:00Z',
    lastModified: '2024-01-15T10:00:00Z',
    ownerId: 456,
    ownerName: 'Test Organization',
    md5: '5d41402abc4b2a76b9719d911017c592',
    webLink: 'https://tc.example.com/auth/indicators/details/file.xhtml?file=12345',
    summary: '5d41402abc4b2a76b9719d911017c592',
    tags: {
      data: [
        { id: 1, name: 'malware' },
        { id: 2, name: 'apt' }
      ]
    },
    attributes: {
      data: [
        { id: 100, type: 'Source', value: 'Internal Analysis', default: true },
        { id: 101, type: 'Description', value: 'Malicious file hash', default: true }
      ]
    },
    associatedGroups: {
      data: [
        { id: 5001, name: 'APT Campaign 2024', type: 'Campaign' }
      ]
    }
  },

  addressIndicator: {
    id: 67890,
    type: 'Address',
    rating: 4.0,
    confidence: 90,
    dateAdded: '2024-01-15T11:00:00Z',
    lastModified: '2024-01-15T11:00:00Z',
    ownerId: 456,
    ownerName: 'Test Organization',
    ip: '192.168.1.100',
    webLink: 'https://tc.example.com/auth/indicators/details/address.xhtml?address=67890',
    summary: '192.168.1.100'
  },

  hostIndicator: {
    id: 11111,
    type: 'Host',
    rating: 2.0,
    confidence: 75,
    dateAdded: '2024-01-15T12:00:00Z',
    lastModified: '2024-01-15T12:00:00Z',
    ownerId: 789,
    ownerName: 'Other Organization',
    hostName: 'malicious-example.com',
    webLink: 'https://tc.example.com/auth/indicators/details/host.xhtml?host=11111',
    summary: 'malicious-example.com',
    whoisActive: true,
    dnsActive: false
  }
};

// Mock ThreatConnect Owner/Organization Data
const mockThreatConnectOwners = {
  myOwner: {
    id: 456,
    name: 'Test Organization',
    type: 'Organization'
  },
  
  otherOwner: {
    id: 789,
    name: 'Other Organization', 
    type: 'Organization'
  }
};

// Mock ThreatConnect Groups Data
const mockThreatConnectGroups = {
  campaignGroup: {
    id: 5001,
    name: 'APT Campaign 2024',
    type: 'Campaign',
    ownerName: 'Test Organization',
    ownerId: 456,
    dateAdded: '2024-01-10T00:00:00Z'
  },
  
  intrusionSetGroup: {
    id: 5002,
    name: 'APT Group 29',
    type: 'Intrusion Set',
    ownerName: 'Test Organization',
    ownerId: 456,
    dateAdded: '2024-01-05T00:00:00Z'
  }
};

// Mock ThreatConnect Tags Data
const mockThreatConnectTags = [
  { id: 1, name: 'malware' },
  { id: 2, name: 'apt' },
  { id: 3, name: 'campaign' },
  { id: 4, name: 'suspicious' }
];

// Mock ThreatConnect API Responses
const mockThreatConnectAPIResponses = {
  searchIndicatorSuccess: {
    status: 'Success',
    data: [mockThreatConnectIndicators.existingIndicator]
  },
  
  searchIndicatorEmpty: {
    status: 'Success',
    data: []
  },
  
  createIndicatorSuccess: {
    status: 'Success',
    data: mockThreatConnectIndicators.addressIndicator
  },
  
  updateIndicatorSuccess: {
    status: 'Success',
    data: {
      ...mockThreatConnectIndicators.existingIndicator,
      lastModified: '2024-01-15T13:00:00Z',
      rating: 4.0
    }
  },
  
  deleteIndicatorSuccess: {
    status: 'Success',
    data: null
  },
  
  getOwnerSuccess: {
    status: 'Success',
    data: mockThreatConnectOwners.myOwner
  },
  
  searchTagsSuccess: {
    status: 'Success',
    data: mockThreatConnectTags
  },
  
  searchGroupsSuccess: {
    status: 'Success',
    data: [
      mockThreatConnectGroups.campaignGroup,
      mockThreatConnectGroups.intrusionSetGroup
    ]
  }
};

// Mock Error Responses (ThreatConnect format)
const mockThreatConnectErrors = {
  networkError: {
    code: 'ECONNREFUSED',
    message: 'Failed to connect to ThreatConnect API',
    errno: 'ECONNREFUSED'
  },
  
  authenticationError: {
    status: 'Failure',
    message: 'Authentication failed - invalid API credentials'
  },
  
  validationError: {
    status: 'Failure',
    message: 'Invalid indicator data provided'
  },
  
  exclusionListError: {
    status: 'Failure',
    message: 'This indicator is in the exclusion list and cannot be created',
    meta: {
      responseBody: {
        message: 'exclusion list'
      }
    }
  },

  permissionError: {
    status: 'Failure',
    message: 'Insufficient permissions to perform this operation'
  }
};

// Test Scenarios for ThreatConnect Integration
const mockThreatConnectScenarios = {
  newIndicatorCreation: {
    entity: mockEntities.md5Hash,
    fields: {
      owner: mockThreatConnectOwners.myOwner,
      title: 'Malicious File Hash',
      description: 'Hash of known malicious file',
      source: 'Internal Analysis',
      tags: [{ id: 1, name: 'malware' }],
      groups: [{ id: 5001 }],
      rating: 3,
      confidence: 85
    },
    options: {
      url: 'https://test-tc.example.com',
      authorId: 'test-access-id',
      apiKey: 'test-api-key',
      deletionPermissions: [
        { value: "indicators", display: "Allow Indicator Deletion" },
        { value: "observables", display: "Allow Observable Deletion" }
      ],
      allowAssociation: true
    }
  },
  
  existingIndicatorUpdate: {
    entity: mockEntities.domain,
    existingIndicator: mockThreatConnectIndicators.hostIndicator,
    fields: {
      owner: mockThreatConnectOwners.myOwner,
      rating: 4,
      confidence: 90
    },
    options: {
      url: 'https://test-tc.example.com',
      authorId: 'test-access-id',
      apiKey: 'test-api-key',
      deletionPermissions: [
        { value: "indicators", display: "Allow Indicator Deletion" },
        { value: "observables", display: "Allow Observable Deletion" }
      ],
      allowAssociation: true
    }
  },
  
  unauthorizedDelete: {
    entity: mockEntities.ipv4,
    options: {
      url: 'https://test-tc.example.com',
      authorId: 'test-access-id',
      apiKey: 'test-api-key',
      deletionPermissions: [],
      allowAssociation: false
    }
  }
};

// =============================================================================
// FUTURE: OpenCTI STRUCTURES (For Migration - Keep for Reference)
// =============================================================================

// TODO: Will be activated during OpenCTI migration
const futureMockOpenCTIData = {
  // GraphQL responses, STIX patterns, etc.
  // Currently commented out but preserved for migration
};

module.exports = {
  // Current ThreatConnect Implementation
  mockEntities,
  mockIndicators: mockThreatConnectIndicators,
  mockOwners: mockThreatConnectOwners,
  mockGroups: mockThreatConnectGroups,
  mockTags: mockThreatConnectTags,
  mockAPIResponses: mockThreatConnectAPIResponses,
  mockErrors: mockThreatConnectErrors,
  testScenarios: mockThreatConnectScenarios,
  
  // Legacy exports (for compatibility)
  mockGraphQLResponses: mockThreatConnectAPIResponses, // Temporary alias
  
  // Future OpenCTI (preserved for migration)
  futureMockOpenCTIData
}; 