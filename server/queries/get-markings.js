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
const { GET_MARKINGS } = require('./graphql-queries');
const {
  logging: { getLogger }
} = require('polarity-integration-utils');
const { createEnhancedErrorDetail } = require('../errorHandling/error-message-mapping');

let cachedMarkings;
let refreshMarkingsInterval;
const MARKINGS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in millisecond

/**
 * Search for OpenCTI labels matching the search term
 * @param {string} searchTerm - Search term for labels
 * @param {Object} options - Request options with OpenCTI configuration
 * @param {Object} [Logger] - Optional Logger instance, defaults to polarity Logger
 * @returns {Promise<Object>} GraphQL data with labels structure
 */
async function getMarkings(options) {
  const Logger = getLogger();
  try {
    if (cachedMarkings) {
      Logger.trace('Returning cached markings');
      return cachedMarkings;
    }

    const result = await makeOpenCTIRequest(GET_MARKINGS, {}, options);
    cachedMarkings = result.me?.allowed_marking;

    if (!cachedMarkings) {
      Logger.error({ result }, 'Could not retrieve markings');
    }

    // force the markings to be refreshed every 24 hours
    if (!refreshMarkingsInterval) {
      refreshMarkingsInterval = setInterval(() => {
        cachedMarkings = undefined;
      }, MARKINGS_CACHE_TTL_MS);
    }

    Logger.debug({ cachedMarkings }, 'Fetched Markings');

    return cachedMarkings;
  } catch (error) {
    Logger.error({ error }, 'Marking search failed');

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

module.exports = {
  getMarkings
};
