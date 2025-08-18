/**
 * OpenCTI Tags/Labels Search Query
 * GraphQL implementation following polarity-integration-utils patterns
 */
const {
  isAuthRequiredError,
  isGraphQLError,
  parseOpenCTIError
} = require('../errorHandling/opencti-errors');
const { makeOpenCTIRequest } = require('../core');
const { SEARCH_TAGS_QUERY } = require('./graphql-queries');

/**
 * Search for OpenCTI labels matching the search term
 * @param {string} searchTerm - Search term for labels
 * @param {Object} options - Request options with OpenCTI configuration
 * @param {Object} [Logger] - Optional Logger instance, defaults to polarity Logger
 * @returns {Promise<Object>} GraphQL data with labels structure
 */
async function searchTags(searchTerm, options, Logger, callback) {
  try {
    if (Logger) {
      Logger.trace({ searchTerm }, 'Searching OpenCTI tags/labels');
    }

    const variables = {
      search: searchTerm,
      first: 50
    };

    const data = await makeOpenCTIRequest(
      SEARCH_TAGS_QUERY,
      variables,
      options
    );

    if (Logger) {
      Logger.debug(
        {
          searchTerm,
          foundLabels: data?.labels?.edges || [],
          resultCount: data?.labels?.edges?.length || 0,
          totalCount: data?.labels?.pageInfo?.globalCount || 0
        },
        'OpenCTI labels search completed'
      );
    }

    if (callback) {
      callback(null, data);
    }
    
    return data;
  } catch (error) {
    if (Logger) {
      Logger.error({
        searchTerm,
        error: error.message
      }, 'OpenCTI labels search failed');
    }

    // Handle specific OpenCTI errors
    if (isAuthRequiredError(error)) {
      callback({...error, message: 'Authentication required'});
      return;
    }

    // Handle permission errors specifically (before general GraphQL errors)
    if (error.body?.errors?.some((e) => e.extensions?.code === 'FORBIDDEN')) {
      callback({...error, message: 'Insufficient permissions'});
      return;
    }

    if (isGraphQLError(error)) {
      callback({...error, message: 'GraphQL validation error'});
      return;
    }

    callback({...error, message: 'OpenCTI labels search failed'});
    return;
  }
}

module.exports = { searchTags, SEARCH_TAGS_QUERY };
