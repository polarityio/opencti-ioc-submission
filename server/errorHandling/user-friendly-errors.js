/**
 * User-Friendly Error Handler
 * Converts technical errors into clear, actionable messages for end users
 * Focuses on authentication and configuration errors that users can resolve themselves
 */

const { isAuthRequiredError, isGraphQLError } = require('./opencti-errors');

/**
 * Check if an error is related to user configuration that they can fix
 * @param {Error} error - Error object to check
 * @returns {boolean} - True if this is a user-configurable error
 */
function isUserConfigurableError(error) {
  if (!error || !error.message) {
    return false;
  }

  const message = error.message.toLowerCase();
  
  // Authentication and configuration error patterns
  const userConfigPatterns = [
    'you must be logged in',
    'authentication required',
    'unauthorized',
    'access denied',
    'invalid api key',
    'api key required',
    'authentication failed',
    'not authenticated',
    'login required',
    'invalid url',
    'connection refused',
    'enotfound',
    'timeout',
    'certificate',
    'ssl',
    'tls'
  ];

  return userConfigPatterns.some(pattern => message.includes(pattern));
}

/**
 * Convert technical error into user-friendly message with specific guidance
 * @param {Error} error - Original error object
 * @param {Object} options - User configuration options
 * @returns {Object} - User-friendly error information
 */
function createUserFriendlyError(error, options = {}) {
  if (!isUserConfigurableError(error)) {
    // For non-user-configurable errors, return technical details
    return {
      isUserConfigurable: false,
      userMessage: 'An unexpected error occurred. Please contact support if this issue persists.',
      technicalDetail: error.message,
      actionRequired: 'Contact support'
    };
  }

  const message = error.message.toLowerCase();
  
  // Authentication errors
  if (message.includes('you must be logged in') || 
      message.includes('authentication required') ||
      message.includes('unauthorized') ||
      message.includes('access denied') ||
      message.includes('invalid api key') ||
      message.includes('api key required') ||
      message.includes('authentication failed') ||
      message.includes('not authenticated') ||
      message.includes('login required')) {
    
    return {
      isUserConfigurable: true,
      userMessage: 'Your OpenCTI API credentials are invalid or missing.',
      technicalDetail: 'Authentication failed: ' + error.message,
      actionRequired: 'Update your OpenCTI configuration',
      specificGuidance: [
        'Check that your OpenCTI API URL is correct',
        'Verify your API Key is valid and not expired',
        'Ensure your Access ID is correct',
        'Contact your OpenCTI administrator if you need new credentials'
      ],
      configFields: ['url', 'apiKey', 'authorId']
    };
  }

  // URL/Connection errors
  if (message.includes('invalid url') || message.includes('enotfound')) {
    return {
      isUserConfigurable: true,
      userMessage: 'Cannot connect to your OpenCTI server. The URL appears to be incorrect.',
      technicalDetail: 'Connection failed: ' + error.message,
      actionRequired: 'Update your OpenCTI URL',
      specificGuidance: [
        'Verify your OpenCTI URL includes the correct protocol (https://)',
        'Check that the URL is accessible from your network',
        'Ensure the server is running and accessible',
        'Try accessing the URL in your browser to verify it works'
      ],
      configFields: ['url']
    };
  }

  // Connection refused errors
  if (message.includes('connection refused') || message.includes('econnrefused')) {
    return {
      isUserConfigurable: true,
      userMessage: 'Your OpenCTI server is not responding.',
      technicalDetail: 'Connection refused: ' + error.message,
      actionRequired: 'Check your OpenCTI server status',
      specificGuidance: [
        'Verify your OpenCTI server is running',
        'Check that the port number is correct in your URL',
        'Ensure your firewall allows connections to the server',
        'Contact your OpenCTI administrator to verify server status'
      ],
      configFields: ['url']
    };
  }

  // SSL/Certificate errors
  if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
    return {
      isUserConfigurable: true,
      userMessage: 'There is an SSL certificate issue with your OpenCTI server.',
      technicalDetail: 'SSL error: ' + error.message,
      actionRequired: 'Check SSL certificate configuration',
      specificGuidance: [
        'Verify your OpenCTI server has a valid SSL certificate',
        'If using a self-signed certificate, contact your administrator',
        'Check that your URL uses the correct protocol (https://)',
        'Contact your OpenCTI administrator for certificate assistance'
      ],
      configFields: ['url']
    };
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('etimedout')) {
    return {
      isUserConfigurable: true,
      userMessage: 'Connection to your OpenCTI server timed out.',
      technicalDetail: 'Timeout error: ' + error.message,
      actionRequired: 'Check network connectivity and server status',
      specificGuidance: [
        'Check your network connection',
        'Verify your OpenCTI server is not experiencing high load',
        'Try accessing the server directly to verify it\'s responsive',
        'Contact your OpenCTI administrator if the issue persists'
      ],
      configFields: ['url']
    };
  }

  // Generic user-configurable error
  return {
    isUserConfigurable: true,
    userMessage: 'There is an issue with your OpenCTI configuration.',
    technicalDetail: error.message,
    actionRequired: 'Review your OpenCTI settings',
    specificGuidance: [
      'Check your OpenCTI URL, API Key, and Access ID',
      'Verify your OpenCTI server is accessible',
      'Contact your OpenCTI administrator for assistance'
    ],
    configFields: ['url', 'apiKey', 'authorId']
  };
}

/**
 * Check if error should prevent results from being displayed
 * @param {Error} error - Error object to check
 * @returns {boolean} - True if results should be suppressed
 */
function shouldSuppressResults(error) {
  return isUserConfigurableError(error);
}

/**
 * Create a user-friendly error response for the UI
 * @param {Error} error - Original error
 * @param {Object} options - User configuration
 * @returns {Object} - Error response for UI display
 */
function createErrorResponse(error, options = {}) {
  const userError = createUserFriendlyError(error, options);
  
  return {
    error: true,
    userConfigurable: userError.isUserConfigurable,
    message: userError.userMessage,
    actionRequired: userError.actionRequired,
    guidance: userError.specificGuidance || [],
    configFields: userError.configFields || [],
    // Include technical details for debugging but keep them separate
    technicalDetail: userError.technicalDetail,
    // Original error for advanced debugging
    originalError: {
      message: error.message,
      type: error.type || 'UNKNOWN',
      stack: error.stack
    }
  };
}

module.exports = {
  isUserConfigurableError,
  createUserFriendlyError,
  shouldSuppressResults,
  createErrorResponse
}; 