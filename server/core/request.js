/**
 * OpenCTI Request Infrastructure
 * Centralized GraphQL request handling following blink-ops patterns
 * Uses postman-request NPM library with consistent error handling
 */

const { logging } = require('polarity-integration-utils');
const {
  isAuthRequiredError,
  isGraphQLError,
  parseOpenCTIError
} = require('../errorHandling/opencti-errors');
const { createEnhancedErrorDetail } = require('../errorHandling/error-message-mapping');
const {
  map,
  get,
  getOr,
  filter,
  flow,
  negate,
  isEmpty,
  tail,
  first
} = require('lodash/fp');
const { parallelLimit } = require('async');

const {
  requests: { createRequestWithDefaults }
} = require('polarity-integration-utils');
const config = require('../../config/config');

// Workaround required because v1 of the utils library is expecting a request object
// on the config
config.request = {
  cert: '',
  key: '',
  passphrase: '',
  ca: '',
  proxy: ''
};

const requestWithDefaults = createRequestWithDefaults({
  config,
  roundedSuccessStatusCodes: [200],
  requestOptionsToOmitFromLogsKeyPaths: ['headers.Authorization'],
  postprocessRequestFailure: (error) => {
    try {
      const errorResponseBody = JSON.parse(error.description);
      error.message = `${error.message} - (${error.status})${
        errorResponseBody.message || errorResponseBody.error
          ? `| ${errorResponseBody.message || errorResponseBody.error}`
          : ''
      }`;
    } catch (_) {}

    throw error;
  }
});

const createRequestsInParallel =
  (requestWithDefaults) =>
  async (
    requestsOptions,
    responseGetPath,
    limit = 10,
    onlyReturnPopulatedResults = true
  ) => {
    const unexecutedRequestFunctions = map(
      ({ resultId, ...requestOptions }) =>
        async () => {
          const response = await requestWithDefaults(requestOptions);
          const result = responseGetPath ? get(responseGetPath, response) : response;
          return resultId ? { resultId, result } : result;
        },
      requestsOptions
    );

    const firstResult = await first(unexecutedRequestFunctions)();
    const remainingResults = await parallelLimit(tail(unexecutedRequestFunctions), limit);
    const results = [firstResult, ...remainingResults];

    return onlyReturnPopulatedResults
      ? filter(
          flow((result) => getOr(result, 'result', result), negate(isEmpty)),
          results
        )
      : results;
  };

const requestsInParallel = createRequestsInParallel(requestWithDefaults);

/**
 * Make GraphQL request to OpenCTI API
 * @param {string} query - GraphQL query string
 * @param {Object} variables - GraphQL variables
 * @param {Object} options - Configuration options containing OpenCTI API details
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} - GraphQL response data
 */
async function makeOpenCTIRequest(query, variables, options) {
  const Logger = logging.getLogger();

  const requestOptions = {
    method: 'POST',
    uri: `${options.url}/graphql`,
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: {
      query,
      variables
    },
    json: true
  };

  Logger.trace(
    {
      url: requestOptions.uri,
      hasVariables: !!variables,
      queryType: query.substring(0, 20) + '...',
      hasApiKey: !!options.apiKey,
      apiKeyLength: options.apiKey ? options.apiKey.length : 0
    },
    'Making OpenCTI GraphQL request'
  );

  try {
    const response = await requestWithDefaults(requestOptions);
    if (response?.body?.errors?.length) {
      Logger.error('OpenCTI GraphQL errors', { errors: response.body.errors });
      const graphqlMessage = response.body.errors[0].message;
      const enhancedDetail = createEnhancedErrorDetail(
        new Error(graphqlMessage),
        graphqlMessage
      );
      const error = new Error(enhancedDetail);
      error.body = response.body;
      error.graphqlErrors = response.body.errors;
      error.type = 'GRAPHQL_ERROR';
      throw error;
    }

    if (response.statusCode !== 200) {
      const errorMessage = `HTTP ${response.statusCode}: ${
        response?.body?.error || 'Unknown error'
      }`;
      Logger.error(
        {
          statusCode: response.statusCode,
          body: response.body
        },
        'OpenCTI request failed with non-200 status'
      );
      const enhancedDetail = createEnhancedErrorDetail(
        new Error(errorMessage),
        errorMessage
      );
      const enhancedError = new Error(enhancedDetail);
      enhancedError.statusCode = response.statusCode;
      enhancedError.body = response.body;
      throw enhancedError;
    }

    Logger.trace(
      {
        hasData: !!response.body.data,
        dataKeys: response.body.data ? Object.keys(response.body.data) : []
      },
      'OpenCTI GraphQL response received'
    );

    return response?.body?.data || {};
  } catch (error) {
    Logger.error({ error }, 'OpenCTI request failed');
    const enhancedDetail = createEnhancedErrorDetail(error, error.message);
    const enhancedError = new Error(enhancedDetail);
    enhancedError.originalError = error;
    enhancedError.type = 'REQUEST_ERROR';
    throw enhancedError;
  }
}

/**
 * Enhanced error handling for request failures
 * @param {Error} error - Original request error
 * @param {string} context - Additional context for the error
 * @returns {Error} - Enhanced error with additional context
 */
function enhanceRequestError(error, context) {
  const enhancedError = new Error(`${context}: ${error.message}`);
  enhancedError.originalError = error;
  enhancedError.type = 'REQUEST_ERROR';
  return enhancedError;
}

/**
 * Enhanced error handling for GraphQL errors
 * @param {Error} error - Original GraphQL error
 * @param {Array} graphqlErrors - Array of GraphQL error details
 * @returns {Error} - Enhanced error with GraphQL context
 */
function enhanceGraphQLError(error, graphqlErrors) {
  const enhancedError = new Error(error.message);
  enhancedError.originalError = error;
  enhancedError.graphqlErrors = graphqlErrors;
  enhancedError.type = 'GRAPHQL_ERROR';
  return enhancedError;
}

/**
 * Validate OpenCTI authentication
 * Makes a simple query to test API connectivity and authentication
 * @param {Object} options - Configuration options
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} - Authentication validation result
 */
async function validateAuthentication(options) {
  const Logger = logging.getLogger();

  const testQuery = `
    query tryAuthentication {
      me {
        id
        name
        user_email
      }
    }
  `;

  try {
    const response = await makeOpenCTIRequest(testQuery, {}, options);

    if (response.me) {
      return {
        success: true,
        user: response.me,
        message: 'Authentication successful'
      };
    } else {
      return {
        success: false,
        error: 'NO_USER_DATA',
        message: 'Authentication response did not contain user information'
      };
    }
  } catch (error) {
    Logger.error({ error: error.message }, 'Authentication validation failed');

    return {
      success: false,
      error: error.type || 'UNKNOWN_ERROR',
      message: error.message,
      help: isAuthRequiredError(error)
        ? 'Please verify your API key is correct and has sufficient permissions'
        : 'Please check your OpenCTI URL and network connectivity'
    };
  }
}

/**
 * Create standardized request options for OpenCTI API
 * @param {Object} options - Configuration options
 * @returns {Object} - Standardized request options
 */
function createRequestOptions(options) {
  return {
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Polarity-OpenCTI-Integration/1.0.0'
    },
    timeout: options.timeout || 30000,
    json: true
  };
}

module.exports = {
  makeOpenCTIRequest,
  validateAuthentication,
  createRequestOptions,
  enhanceRequestError,
  enhanceGraphQLError,
  requestWithDefaults,
  requestsInParallel
};
