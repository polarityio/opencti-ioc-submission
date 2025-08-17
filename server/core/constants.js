const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);

// OpenCTI-specific constants
const ENTITY_TYPE_BY_OBSERVABLE_TYPE = {
  IPv4: 'IPv4-Addr',
  IPv6: 'IPv6-Addr',
  domain: 'Domain-Name',
  email: 'Email-Addr',
  MD5: 'StixFile',
  SHA1: 'StixFile',
  SHA256: 'StixFile',
  url: 'Url',
  MAC: 'Mac-Addr'
};

const ENTITY_TYPE_TO_OPENCTI_HUMAN_READABLE_TYPE = {
  IPv4: 'IPv4 address',
  IPv6: 'IPv6 address',
  domain: 'Domain name',
  email: 'Email address',
  MD5: 'File',
  SHA1: 'File',
  SHA256: 'File',
  url: 'URL',
  MAC: 'MAC address'
}

/** Observable Search Keys
 *  Artifact
 *  AutonomousSystem
 *  BankAccount
 *  Credential
 *  CryptocurrencyWallet
 *  CryptographicKey
 *  Directory
 *  DomainName
 *  EmailAddr
 *  EmailMessage
 *  EmailMimePartType
 *  Hostname
 *  IPv4Addr
 *  IPv6Addr
 *  MacAddr
 *  MediaContent
 *  Mutex
 *  NetworkTraffic
 *  PaymentCard
 *  Persona
 *  PhoneNumber
 *  Process
 *  Software
 *  StixFile
 *  Text
 *  TrackingNumber
 *  Url
 *  UserAccount
 *  UserAgent
 *  WindowsRegistryKey
 *  WindowsRegistryValueType
 *  X509Certificate
 */
const ENTITY_TYPE_BY_OBSERVABLE_SUBMISSION_KEY = {
  IPv4: 'IPv4Addr',
  IPv6: 'IPv6Addr',
  domain: 'DomainName',
  email: 'EmailAddr',
  MD5: 'StixFile',
  SHA1: 'StixFile',
  SHA256: 'StixFile',
  url: 'Url',
  MAC: 'MacAddr'
};

// STIX pattern mapping for indicators
const STIX_PATTERNS = {
  IPv4: (value) => `[ipv4-addr:value = '${value}']`,
  IPv6: (value) => `[ipv6-addr:value = '${value}']`,
  domain: (value) => `[domain-name:value = '${value}']`,
  email: (value) => `[email-addr:value = '${value}']`,
  MD5: (value) => `[file:hashes.MD5 = '${value}']`,
  SHA1: (value) => `[file:hashes.'SHA-1' = '${value}']`,
  SHA256: (value) => `[file:hashes.'SHA-256' = '${value}']`,
  url: (value) => `[url:value = '${value}']`,
  MAC: (value) => `[mac-addr:value = '${value}']`
};

// Default configuration values
const DEFAULT_CONFIG = {
  confidence: 50,
  score: 50,
  createdBy: 'Polarity',
  timeout: 30000,
  maxRetries: 3
};

// Supported entity types for validation
const SUPPORTED_ENTITY_TYPES = new Set(['IPv4', 'IPv6', 'domain', 'email', 'MD5', 'SHA1', 'SHA256', 'url', 'MAC']);

module.exports = {
  IGNORED_IPS,
  ENTITY_TYPE_BY_OBSERVABLE_TYPE,
  ENTITY_TYPE_BY_OBSERVABLE_SUBMISSION_KEY,
  STIX_PATTERNS,
  DEFAULT_CONFIG,
  SUPPORTED_ENTITY_TYPES,
  ENTITY_TYPE_TO_OPENCTI_HUMAN_READABLE_TYPE
}; 