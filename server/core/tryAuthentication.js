/**
 * OpenCTI Authentication Testing Module
 * Following blink-ops patterns for API authentication validation
 */

const { 
  isAuthRequiredError, 
  isGraphQLError, 
  parseOpenCTIError 
} = require('../errorHandling/opencti-errors');

/**
 * Simple authentication test query
 * Tests if the API key is valid and can access basic user information
 */
const TEST_AUTH_QUERY = `
  query tryAuthentication {
    me {
      id
      name
      user_email
      description
    }
  }
`;

/**
 * Test OpenCTI API authentication
 * @param {Object} options - Configuration options containing API details
 * @param {Function} requestFunction - Function to make GraphQL requests
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} - Authentication test result
 */
async function tryAuthentication(options, requestFunction, logger) {
  try {
    // Make a simple query to test authentication
    const result = await requestFunction(TEST_AUTH_QUERY, {}, options, logger);

    // Check if we got valid user data
    if (result && result.me && result.me.id) {
      logger.trace({
        userId: result.me.id,
        userName: result.me.name || 'Unknown',
        userEmail: result.me.user_email || 'Not provided'
      }, 'OpenCTI authentication successful');

      return {
        success: true,
        authenticated: true,
        user: {
          id: result.me.id,
          name: result.me.name || 'Unknown',
          email: result.me.user_email || 'Not provided',
          description: result.me.description || 'No description'
        },
        message: 'Authentication successful'
      };
    }

    // No user data returned
    logger.warn('OpenCTI authentication returned no user data');
    return {
      success: false,
      authenticated: false,
      message: 'Authentication returned no user data',
      help: 'Check if the API endpoint is correct and accessible'
    };

  } catch (error) {
    logger.error('OpenCTI authentication test failed', { error: error.message });

    // Check for specific OpenCTI error types and create user-friendly messages
    if (isAuthRequiredError(error) || isAuthenticationError(error)) {
      const authError = parseOpenCTIError(error);
      return {
        success: false,
        authenticated: false,
        error: 'AUTH_REQUIRED',
        message: 'Your OpenCTI API key appears to be invalid or expired. Please check your API key and try again, or contact your OpenCTI administrator for assistance.',
        detail: authError?.detail || error.message,
        help: 'Verify your API key is correct and has proper permissions, or contact your OpenCTI administrator for assistance.'
      };
    }

    if (isGraphQLError(error)) {
      const graphqlError = parseOpenCTIError(error);
      return {
        success: false,
        authenticated: false,
        error: graphqlError.type,
        message: 'There was an issue with your OpenCTI configuration. Please verify your settings and try again, or contact support if the problem persists.',
        detail: graphqlError.detail,
        help: graphqlError.help
      };
    }

    // Network or other errors - provide specific guidance based on error type
    const networkMessage = generateNetworkErrorMessage(error.message);
    return {
      success: false,
      authenticated: false,
      error: 'NETWORK_ERROR',
      message: networkMessage,
      detail: error.message,
      help: getNetworkErrorHelp(error.message)
    };
  }
}

/**
 * Check if error indicates authentication/authorization issues
 * @param {Object} error - Error object to check
 * @returns {boolean} - True if this appears to be an authentication error
 */
function isAuthenticationError(error) {
  if (!error || !error.message) {
    return false;
  }

  const message = error.message.toLowerCase();
  
  // Common authentication error patterns
  const authPatterns = [
    'you must be logged in',
    'authentication required',
    'unauthorized',
    'access denied',
    'invalid api key',
    'api key required',
    'authentication failed',
    'not authenticated',
    'login required'
  ];

  return authPatterns.some(pattern => message.includes(pattern));
}

/**
 * Generate user-friendly error message based on network error details
 * @param {string} errorMessage - Raw error message
 * @returns {string} - User-friendly error message
 */
function generateNetworkErrorMessage(errorMessage) {
  if (!errorMessage) {
    return 'Unable to connect to OpenCTI. Please check your connection and try again.';
  }

  const message = errorMessage.toLowerCase();

  // DNS/hostname resolution errors
  if (message.includes('enotfound') || message.includes('getaddrinfo')) {
    return 'Cannot find the OpenCTI server. Please check that your OpenCTI URL is correct and the server is accessible.';
  }

  // Connection refused errors
  if (message.includes('econnrefused') || message.includes('connect econnrefused')) {
    return 'OpenCTI server is not responding. Please verify the server is running and check your URL and port settings.';
  }

  // SSL/Certificate errors
  if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
    return 'There is an SSL certificate issue with your OpenCTI server. Please check your certificate settings or contact your administrator.';
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('etimedout')) {
    return 'Connection to OpenCTI timed out. Please check your network connection and server status.';
  }

  // Invalid URL errors
  if (message.includes('invalid uri') || message.includes('invalid url')) {
    return 'The OpenCTI URL appears to be invalid. Please check your URL format and try again.';
  }

  // Generic network error
  return 'Unable to connect to OpenCTI. Please check your network connection, URL settings, and server status.';
  }

/**
 * Generate specific help text based on network error type
 * @param {string} errorMessage - Raw error message  
 * @returns {string} - Specific help text
 */
function getNetworkErrorHelp(errorMessage) {
  if (!errorMessage) {
    return 'Contact your OpenCTI administrator if the problem continues.';
  }

  const message = errorMessage.toLowerCase();

  // DNS/hostname resolution errors
  if (message.includes('enotfound') || message.includes('getaddrinfo')) {
    return 'Verify the OpenCTI URL is correct (e.g., https://your-opencti.com) and that the server is accessible from your network.';
  }

  // Connection refused errors
  if (message.includes('econnrefused')) {
    return 'Check that OpenCTI is running and accessible on the specified port. Contact your administrator if needed.';
  }

  // SSL/Certificate errors
  if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
    return 'If using a self-signed certificate, you may need to disable certificate verification. Contact your administrator for guidance.';
  }

  // Timeout errors
  if (message.includes('timeout')) {
    return 'Check your network connection and firewall settings. The server may be experiencing high load.';
  }

  // Invalid URL errors
  if (message.includes('invalid uri') || message.includes('invalid url')) {
    return 'Ensure your URL includes the protocol (http:// or https://) and follows the correct format.';
  }

  // Generic help
  return 'Check your OpenCTI URL, network connectivity, and contact your administrator if the issue persists.';
}

/**
 * Validate authentication configuration
 * @param {Object} options - Configuration options
 * @returns {Object} - Validation result
 */
function validateAuthConfig(options) {
  const errors = [];
  const warnings = [];

  // Handle null/undefined options
  if (!options || typeof options !== 'object') {
    errors.push('OpenCTI URL is required');
    errors.push('OpenCTI API key is required');
    return {
      valid: false,
      errors,
      warnings
    };
  }

  // Check required fields
  if (!options.url) {
    errors.push('OpenCTI URL is required');
  }

  if (!options.apiKey) {
    errors.push('OpenCTI API key is required');
  }

  // Check URL format
  if (options.url) {
    try {
      const url = new URL(options.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('OpenCTI URL must use HTTP or HTTPS protocol');
      }
    } catch (urlError) {
      errors.push('Invalid OpenCTI URL format');
    }
  }

  // Check API key format (basic validation)
  if (options.apiKey) {
    if (options.apiKey.length < 10) {
      warnings.push('API key appears to be too short');
    }
    
    // Check for common demo/test keys that won't work
    if (options.apiKey.includes('demo') || options.apiKey === 'test') {
      warnings.push('API key appears to be a demo/test key which may not work');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  tryAuthentication,
  validateAuthConfig,
  isAuthenticationError,
  generateNetworkErrorMessage,
  getNetworkErrorHelp,
  TEST_AUTH_QUERY
}; 