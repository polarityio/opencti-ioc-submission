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
const { SEARCH_IDENTITIES_QUERY } = require('./graphql-queries');
const { createEnhancedErrorDetail } = require('../errorHandling/error-message-mapping');
const { logging } = require('polarity-integration-utils');

/**
 * Search for OpenCTI labels matching the search term
 * @param {string} searchTerm - Search term for labels
 * @param {Object} options - Request options with OpenCTI configuration
 * @param {Object} [Logger] - Optional Logger instance, defaults to polarity Logger
 * @returns {Promise<Object>} GraphQL data with labels structure
 */
async function searchIdentities(searchTerm, options) {
  const Logger = logging.getLogger();
  try {
    Logger.trace({ searchTerm }, 'Searching OpenCTI identities');

    const variables = {
      types: ['Individual', 'Organization', 'System'],
      search: searchTerm,
      first: 50
    };

    const data = await makeOpenCTIRequest(SEARCH_IDENTITIES_QUERY, variables, options);

    Logger.debug(
      {
        searchTerm,
        foundIdentities: data?.identities?.edges || [],
        resultCount: data?.identities?.edges?.length || 0,
        totalCount: data?.identities?.pageInfo?.globalCount || 0
      },
      'OpenCTI identity search completed'
    );

    return data;
  } catch (error) {
    Logger.error(
      {
        searchTerm,
        error
      },
      'OpenCTI identity search failed'
    );

    // Handle specific OpenCTI errors
    if (isAuthRequiredError(error)) {
      const enhancedDetail = createEnhancedErrorDetail(error, 'Authentication required');
      throw new Error(enhancedDetail);
    }

    // Handle permission errors specifically (before general GraphQL errors)
    if (error.body?.errors?.some((e) => e.extensions?.code === 'FORBIDDEN')) {
      throw new Error(`Insufficient Permissions`);
    }

    if (isGraphQLError(error)) {
      const parsedError = parseOpenCTIError(error);
      const graphqlMessage = error.message || parsedError.message || 'GraphQL error';
      const enhancedDetail = createEnhancedErrorDetail(error, graphqlMessage);
      throw new Error(enhancedDetail);
    }

    throw error;
  }
}

module.exports = { searchIdentities };
