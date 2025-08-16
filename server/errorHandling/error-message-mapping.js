/**
 * Error Message Mapping System
 * Converts GraphQL and technical errors into human-readable messages with specific guidance
 * Maps common OpenCTI errors to actionable solutions for users
 */

/**
 * Mapping of GraphQL error messages to human-readable detail messages
 * Each entry provides specific guidance for resolving the error
 */
const ERROR_MESSAGE_MAPPING = {
  // Authentication and Authorization Errors
  'you must be logged in to do this': {
    detail: 'Your OpenCTI API key is invalid or expired. The server returned: "You must be logged in to do this." Please check your API key configuration in the integration settings and ensure it has the correct permissions.',
    guidance: [
      'Verify your API key is correct and not expired',
      'Check that your Access ID matches the API key',
      'Ensure your OpenCTI user account is active',
      'Contact your OpenCTI administrator if you need new credentials'
    ],
    configFields: ['apiKey', 'authorId'],
    category: 'authentication'
  },
  'authentication required': {
    detail: 'Authentication is required to access OpenCTI. The server returned: "Authentication required." Please verify your API credentials are properly configured.',
    guidance: [
      'Check your OpenCTI API URL is correct',
      'Verify your API key is valid and active',
      'Ensure your Access ID is correct',
      'Test your credentials directly with OpenCTI if possible'
    ],
    configFields: ['url', 'apiKey', 'authorId'],
    category: 'authentication'
  },
  'unauthorized': {
    detail: 'Access denied. The server returned: "Unauthorized." Your API key may not have sufficient permissions or may be invalid.',
    guidance: [
      'Check that your API key has the required permissions',
      'Verify your user account has access to the requested data',
      'Contact your OpenCTI administrator to verify permissions',
      'Ensure your API key is not expired'
    ],
    configFields: ['apiKey'],
    category: 'authorization'
  },
  'access denied': {
    detail: 'Access denied. The server returned: "Access denied." You may not have permission to perform this operation.',
    guidance: [
      'Verify your user account has the required permissions',
      'Check that your API key has the correct scope',
      'Contact your OpenCTI administrator for permission verification',
      'Ensure you are accessing the correct organization/workspace'
    ],
    configFields: ['apiKey'],
    category: 'authorization'
  },
  'you are not allowed to do this': {
    detail: 'Permission denied. The server returned: "You are not allowed to do this." Your API key may not have sufficient permissions to search indicators and observables.',
    guidance: [
      'Contact your OpenCTI administrator to verify your account permissions',
      'Ensure your API key has "Read" permissions for Indicators and Observables',
      'Check if your user account is assigned to the correct groups',
      'Verify you are accessing the correct OpenCTI workspace'
    ],
    configFields: ['apiKey', 'authorId'],
    category: 'authorization'
  },

  // Connection and Network Errors
  'connection refused': {
    detail: 'Cannot connect to OpenCTI server. The server returned: "Connection refused." Please check your network connectivity and server status.',
    guidance: [
      'Verify your OpenCTI URL is correct and accessible',
      'Check that the OpenCTI server is running',
      'Ensure your firewall allows connections to the server',
      'Try accessing the OpenCTI URL in your browser to verify connectivity'
    ],
    configFields: ['url'],
    category: 'connection'
  },
  'enotfound': {
    detail: 'Cannot find OpenCTI server. The server returned: "ENOTFOUND." Please check your URL configuration.',
    guidance: [
      'Verify your OpenCTI URL is correct (including protocol and port)',
      'Check that the domain name resolves correctly',
      'Ensure the server is accessible from your network',
      'Try accessing the URL in your browser to verify it works'
    ],
    configFields: ['url'],
    category: 'connection'
  },
  'timeout': {
    detail: 'Connection to OpenCTI timed out. The server returned: "Timeout." The server may be slow to respond or experiencing high load.',
    guidance: [
      'Check your network connection stability',
      'Verify the OpenCTI server is not experiencing high load',
      'Try the request again in a few moments',
      'Contact your OpenCTI administrator if the issue persists'
    ],
    configFields: ['url'],
    category: 'connection'
  },
  'etimedout': {
    detail: 'Connection to OpenCTI timed out. The server returned: "ETIMEDOUT." Please check your network connectivity.',
    guidance: [
      'Check your network connection',
      'Verify the OpenCTI server is responsive',
      'Try accessing the server directly to verify connectivity',
      'Contact your network administrator if connectivity issues persist'
    ],
    configFields: ['url'],
    category: 'connection'
  },

  // SSL and Certificate Errors
  'certificate': {
    detail: 'SSL certificate error. The server returned: "Certificate error." There may be an issue with the SSL certificate on your OpenCTI server.',
    guidance: [
      'Verify your OpenCTI URL uses the correct protocol (https://)',
      'Check if your server uses a self-signed certificate',
      'Contact your OpenCTI administrator about certificate issues',
      'Ensure your system trusts the server\'s SSL certificate'
    ],
    configFields: ['url'],
    category: 'ssl'
  },
  'ssl': {
    detail: 'SSL/TLS error. The server returned: "SSL error." There may be an issue with the SSL configuration.',
    guidance: [
      'Check that your URL uses HTTPS protocol',
      'Verify the SSL certificate is valid',
      'Contact your OpenCTI administrator about SSL configuration',
      'Ensure your system supports the required SSL/TLS version'
    ],
    configFields: ['url'],
    category: 'ssl'
  },
  'tls': {
    detail: 'TLS error. The server returned: "TLS error." There may be a TLS version compatibility issue.',
    guidance: [
      'Check that your system supports the required TLS version',
      'Verify the OpenCTI server TLS configuration',
      'Contact your OpenCTI administrator about TLS settings',
      'Ensure your network allows TLS connections'
    ],
    configFields: ['url'],
    category: 'ssl'
  },

  // Rate Limiting and Resource Errors
  'rate limit': {
    detail: 'Rate limit exceeded. The server returned: "Rate limit." You have made too many requests to OpenCTI.',
    guidance: [
      'Wait a few moments before trying again',
      'Reduce the frequency of your requests',
      'Check if other integrations are also making requests',
      'Contact your OpenCTI administrator if rate limits are too restrictive'
    ],
    configFields: [],
    category: 'rate_limit'
  },
  'too many requests': {
    detail: 'Too many requests. The server returned: "Too many requests." Please wait before making additional requests.',
    guidance: [
      'Wait 30-60 seconds before trying again',
      'Check if multiple integrations are running simultaneously',
      'Reduce the batch size of your requests',
      'Contact support if rate limiting is affecting your workflow'
    ],
    configFields: [],
    category: 'rate_limit'
  },

  // Validation and Data Errors
  'validation': {
    detail: 'Data validation error. The server returned: "Validation error." The data being sent to OpenCTI may be invalid.',
    guidance: [
      'Check that the entity data is in the correct format',
      'Verify that required fields are provided',
      'Ensure the data meets OpenCTI validation requirements',
      'Contact support if you believe the data is correct'
    ],
    configFields: [],
    category: 'validation'
  },
  'invalid': {
    detail: 'Invalid data error. The server returned: "Invalid error." The request data may be malformed or incorrect.',
    guidance: [
      'Check that all required fields are provided',
      'Verify the data format is correct',
      'Ensure the entity type is supported by OpenCTI',
      'Contact support if you believe the data is valid'
    ],
    configFields: [],
    category: 'validation'
  },

  // GraphQL Specific Errors
  'graphql': {
    detail: 'GraphQL error. The server returned: "GraphQL error." There may be an issue with the query or server configuration.',
    guidance: [
      'Check that your OpenCTI version supports the requested features',
      'Verify the GraphQL schema is compatible',
      'Contact your OpenCTI administrator about GraphQL configuration',
      'Contact support if the issue persists'
    ],
    configFields: ['url'],
    category: 'graphql'
  },

  // Default for unexpected errors
  'default': {
    detail: 'An unexpected error occurred while connecting to OpenCTI. Please contact support with the full error details for assistance.',
    guidance: [
      'Copy the complete error message and stack trace',
      'Include your OpenCTI version and configuration details',
      'Note any recent changes to your OpenCTI setup',
      'Contact support with the full error information'
    ],
    configFields: [],
    category: 'unknown'
  }
};

/**
 * Get human-readable error message for a given error
 * @param {Error} error - The error object
 * @param {string} graphqlMessage - The original GraphQL error message
 * @returns {Object} - Human-readable error information
 */
function getHumanReadableError(error, graphqlMessage = '') {
  const message = (graphqlMessage || error.message || '').toLowerCase();
  
  // Find the best matching error pattern
  for (const [pattern, errorInfo] of Object.entries(ERROR_MESSAGE_MAPPING)) {
    if (pattern === 'default') continue; // Skip default, we'll use it as fallback
    
    if (message.includes(pattern)) {
      return {
        ...errorInfo,
        originalMessage: graphqlMessage || error.message,
        errorType: errorInfo.category
      };
    }
  }
  
  // Return default for unexpected errors
  return {
    ...ERROR_MESSAGE_MAPPING.default,
    originalMessage: graphqlMessage || error.message,
    errorType: 'unknown'
  };
}

/**
 * Create enhanced error detail message for user display
 * @param {Error} error - The original error
 * @param {string} graphqlMessage - The GraphQL error message
 * @returns {string} - Enhanced human-readable error message
 */
function createEnhancedErrorDetail(error, graphqlMessage = '') {
  const errorInfo = getHumanReadableError(error, graphqlMessage);
  
  // Include the original GraphQL message in the detail
  const originalMessage = errorInfo.originalMessage;
  const detail = errorInfo.detail;
  
  // Prevent recursive error message wrapping - check BOTH detail and originalMessage
  if (originalMessage && 
      !detail.includes(originalMessage) && 
      !originalMessage.includes('Original error:') &&
      !detail.includes('Original error:')) {
    return `${detail} Original error: "${originalMessage}"`;
  }
  
  return detail;
}

/**
 * Get error guidance for user resolution
 * @param {Error} error - The original error
 * @param {string} graphqlMessage - The GraphQL error message
 * @returns {Array} - Array of guidance strings
 */
function getErrorGuidance(error, graphqlMessage = '') {
  const errorInfo = getHumanReadableError(error, graphqlMessage);
  return errorInfo.guidance || [];
}

/**
 * Get configuration fields that need attention
 * @param {Error} error - The original error
 * @param {string} graphqlMessage - The GraphQL error message
 * @returns {Array} - Array of configuration field names
 */
function getConfigFieldsToCheck(error, graphqlMessage = '') {
  const errorInfo = getHumanReadableError(error, graphqlMessage);
  return errorInfo.configFields || [];
}

module.exports = {
  ERROR_MESSAGE_MAPPING,
  getHumanReadableError,
  createEnhancedErrorDetail,
  getErrorGuidance,
  getConfigFieldsToCheck
}; 