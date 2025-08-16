/**
 * Tests for server/core/constants.js
 */

const constants = require('../../../server/core/constants');

describe('Server Constants', () => {
  describe('IGNORED_IPS', () => {
    test('should contain expected ignored IP addresses', () => {
      expect(constants.IGNORED_IPS.has('127.0.0.1')).toBe(true);
      expect(constants.IGNORED_IPS.has('255.255.255.255')).toBe(true);
      expect(constants.IGNORED_IPS.has('0.0.0.0')).toBe(true);
    });

    test('should not contain other IP addresses', () => {
      expect(constants.IGNORED_IPS.has('8.8.8.8')).toBe(false);
      expect(constants.IGNORED_IPS.has('192.168.1.1')).toBe(false);
    });
  });

  describe('OPENCTI_ENTITY_TYPES', () => {
    test('should contain correct OpenCTI entity type mappings', () => {
      expect(constants.OPENCTI_ENTITY_TYPES.IPv4).toBe('IPv4-Addr');
      expect(constants.OPENCTI_ENTITY_TYPES.IPv6).toBe('IPv6-Addr');
      expect(constants.OPENCTI_ENTITY_TYPES.domain).toBe('Domain-Name');
      expect(constants.OPENCTI_ENTITY_TYPES.email).toBe('Email-Addr');
      expect(constants.OPENCTI_ENTITY_TYPES.MD5).toBe('File');
      expect(constants.OPENCTI_ENTITY_TYPES.SHA1).toBe('File');
      expect(constants.OPENCTI_ENTITY_TYPES.SHA256).toBe('File');
      expect(constants.OPENCTI_ENTITY_TYPES.url).toBe('Url');
      expect(constants.OPENCTI_ENTITY_TYPES.MAC).toBe('Mac-Addr');
    });
  });

  describe('STIX_PATTERNS', () => {
    test('should generate correct STIX patterns', () => {
      expect(constants.STIX_PATTERNS.IPv4('192.168.1.1')).toBe("[ipv4-addr:value = '192.168.1.1']");
      expect(constants.STIX_PATTERNS.domain('example.com')).toBe("[domain-name:value = 'example.com']");
      expect(constants.STIX_PATTERNS.email('test@example.com')).toBe("[email-addr:value = 'test@example.com']");
      expect(constants.STIX_PATTERNS.MD5('d41d8cd98f00b204e9800998ecf8427e')).toBe("[file:hashes.MD5 = 'd41d8cd98f00b204e9800998ecf8427e']");
    });
  });

  describe('DEFAULT_CONFIG', () => {
    test('should contain expected default configuration values', () => {
      expect(constants.DEFAULT_CONFIG.confidence).toBe(50);
      expect(constants.DEFAULT_CONFIG.score).toBe(50);
      expect(constants.DEFAULT_CONFIG.createdBy).toBe('Polarity');
      expect(constants.DEFAULT_CONFIG.timeout).toBe(30000);
      expect(constants.DEFAULT_CONFIG.maxRetries).toBe(3);
    });
  });

  describe('SUPPORTED_ENTITY_TYPES', () => {
    test('should contain all supported entity types', () => {
      expect(constants.SUPPORTED_ENTITY_TYPES.has('IPv4')).toBe(true);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('IPv6')).toBe(true);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('domain')).toBe(true);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('email')).toBe(true);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('MD5')).toBe(true);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('SHA1')).toBe(true);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('SHA256')).toBe(true);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('url')).toBe(true);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('MAC')).toBe(true);
    });

    test('should not contain unsupported types', () => {
      expect(constants.SUPPORTED_ENTITY_TYPES.has('unsupported')).toBe(false);
      expect(constants.SUPPORTED_ENTITY_TYPES.has('cve')).toBe(false);
    });
  });

  describe('Module Exports', () => {
    test('should export all required OpenCTI constants', () => {
      expect(constants).toHaveProperty('IGNORED_IPS');
      expect(constants).toHaveProperty('OPENCTI_ENTITY_TYPES');
      expect(constants).toHaveProperty('STIX_PATTERNS');
      expect(constants).toHaveProperty('DEFAULT_CONFIG');
      expect(constants).toHaveProperty('SUPPORTED_ENTITY_TYPES');
    });

    test('should not export ThreatConnect constants', () => {
      expect(constants).not.toHaveProperty('INDICATOR_TYPES');
      expect(constants).not.toHaveProperty('POLARITY_TYPE_TO_THREATCONNECT');
      expect(constants).not.toHaveProperty('SUBMISSION_LABELS');
      expect(constants).not.toHaveProperty('ENTITY_TYPES');
    });
  });
}); 