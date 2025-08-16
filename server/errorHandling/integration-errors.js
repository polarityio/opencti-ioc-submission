/**
 * Server Error Classes - Following blink-ops patterns
 * Using polarity-integration-utils for logging
 */

const {
  logging: { getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

/**
 * Safe wrapper for parseErrorToReadableJson that handles edge cases
 */
function parseErrorToReadableJSON(error) {
  // Handle null/undefined inputs
  if (error == null) {
    return { message: 'No error provided', error: 'null_or_undefined' };
  }

  try {
    return parseErrorToReadableJson(error);
  } catch (e) {
    // Handle circular references and other serialization issues
    try {
      return {
        message: error.message || 'Unknown error',
        name: error.name || 'Error',
        stack: error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : 'No stack trace',
        serialization_error: 'Failed to serialize error object'
      };
    } catch (fallbackError) {
      return {
        message: 'Error serialization failed completely',
        error: 'serialization_failure'
      };
    }
  }
}

// SSL and network error codes (kept same as original)
const SSL_ERROR_CODES = new Set([
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_CRL',
  'UNABLE_TO_DECRYPT_CERT_SIGNATURE',
  'UNABLE_TO_DECRYPT_CRL_SIGNATURE',
  'UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY',
  'CERT_SIGNATURE_FAILURE',
  'CRL_SIGNATURE_FAILURE',
  'CERT_NOT_YET_VALID',
  'CERT_HAS_EXPIRED',
  'CRL_NOT_YET_VALID',
  'CRL_HAS_EXPIRED',
  'ERROR_IN_CERT_NOT_BEFORE_FIELD',
  'ERROR_IN_CERT_NOT_AFTER_FIELD',
  'ERROR_IN_CRL_LAST_UPDATE_FIELD',
  'ERROR_IN_CRL_NEXT_UPDATE_FIELD',
  'OUT_OF_MEM',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_CHAIN_TOO_LONG',
  'CERT_REVOKED',
  'INVALID_CA',
  'PATH_LENGTH_EXCEEDED',
  'INVALID_PURPOSE',
  'CERT_UNTRUSTED',
  'CERT_REJECTED'
]);

const NETWORK_CONNECTION_ERROR_CODES = new Set([
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH'
]);

/**
 * Base Integration Error following blink-ops patterns
 */
class IntegrationError extends Error {
  constructor(message, properties = {}) {
    const Logger = getLogger();
    super(message);
    
    this.detail = message;
    this.name = this.constructor.name;
    
    // Set properties directly on error object (for test compatibility)
    Object.assign(this, properties);
    
    // Also store in meta for blink-ops compatibility
    this.meta = {
      ...properties
    };
    
    if (properties.cause instanceof Error) {
      this.meta.cause = parseErrorToReadableJSON(properties.cause);
    }
    
    if (properties.requestOptions) {
      this.meta.requestOptions = this.sanitizeRequestOptions(properties.requestOptions);
    }

    Logger.error({ error: this }, this.constructor.name);
  }

  sanitizeRequestOptions(requestOptions) {
    const sanitizedOptions = {
      ...requestOptions
    };

    if (sanitizedOptions.headers && sanitizedOptions.headers.Authorization) {
      sanitizedOptions.headers.Authorization = '**********';
    }

    if (sanitizedOptions.auth && sanitizedOptions.auth.password) {
      sanitizedOptions.auth.password = '**********';
    }

    if (sanitizedOptions.auth && sanitizedOptions.auth.bearer) {
      sanitizedOptions.auth.bearer = '**********';
    }

    if (requestOptions.body && requestOptions.body.password) {
      requestOptions.body.password = '**********';
    }

    if (requestOptions.form && requestOptions.form.client_secret) {
      requestOptions.form.client_secret = '**********';
    }

    return sanitizedOptions;
  }
}

/**
 * Network Error following blink-ops patterns
 */
class NetworkError extends IntegrationError {
  constructor(message, properties = {}) {
    super(message, properties);

    if (properties.cause instanceof Error) {
      const originalError = properties.cause;

      if (SSL_ERROR_CODES.has(originalError.code)) {
        this.help =
          'SSL errors are typically caused by an untrusted SSL certificate in the HTTPS request chain (e.g., ' +
          'an internal server that is being queried directly, or a web proxy for external requests). You can temporarily ' +
          'ignore SSL validation errors by enabling the integration setting "Allow Insecure TLS/SSL Connections". In most ' +
          "cases, you will need to add your organization's Certificate Authority to the Polarity Server to resolve the " +
          'issue permanently.';
      } else if (NETWORK_CONNECTION_ERROR_CODES.has(originalError.code)) {
        this.help =
          'Network connection issues are typically caused by a misconfigured proxy or firewall rule. You may ' +
          'need to add a proxy configuration to the integration and/or confirm that connectivity between the Polarity ' +
          'Server and the intended host is available.';
      }
    }
  }
}

/**
 * API Request Error following blink-ops patterns
 */
class ApiRequestError extends IntegrationError {
  constructor(message, properties = {}) {
    super(message, properties);
  }
}

/**
 * Auth Request Error following blink-ops patterns
 */
class AuthRequestError extends IntegrationError {
  constructor(message, properties = {}) {
    super(message, properties);
  }
}

/**
 * Retry Request Error following blink-ops patterns
 */
class RetryRequestError extends IntegrationError {
  constructor(message, properties = {}) {
    super(message, properties);
  }
}

// Add toJSON support
if (!('toJSON' in IntegrationError.prototype))
  Object.defineProperty(IntegrationError.prototype, 'toJSON', {
    value: function () {
      let alt = {};
      Object.getOwnPropertyNames(this).forEach(function (key) {
        alt[key] = this[key];
      }, this);
      return alt;
    },
    configurable: true,
    writable: true
  });

module.exports = {
  ApiRequestError,
  NetworkError,
  AuthRequestError,
  RetryRequestError,
  parseErrorToReadableJSON
}; 