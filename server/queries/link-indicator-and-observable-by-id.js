const { makeOpenCTIRequest } = require('../core');
const { LINK_INDICATOR_AND_OBSERVABLE_BY_ID_MUTATION } = require('./graphql-queries');
const {
  logging: { getLogger }
} = require('polarity-integration-utils');
const {
  isAuthRequiredError,
  isGraphQLError,
  parseOpenCTIError
} = require('../errorHandling/opencti-errors');
const { createEnhancedErrorDetail } = require('../errorHandling/error-message-mapping');

/**
 * Link an indicator and observable by their IDs
 * @param {string} indicatorId - ID of the indicator
 * @param {string} observableId - ID of the observable
 * @param {Object} options - Request options with OpenCTI configuration
 * @param {Object} [Logger] - Optional Logger instance, defaults to polarity Logger
 * @returns {Promise<Object>} GraphQL data with labels structure
 */
async function linkIndicatorAndObservableById(indicatorId, observableId, options) {
  const Logger = getLogger();
  try {
    Logger.trace({ indicatorId, observableId }, 'Linking indicator and observable by id');

    const variables = {
      indicatorId,
      observableId
    };

    await makeOpenCTIRequest(
      LINK_INDICATOR_AND_OBSERVABLE_BY_ID_MUTATION,
      variables,
      options
    );

    Logger.debug(
      {
        indicatorId,
        observableId
      },
      'Linking indicator and observable by id completed'
    );
  } catch (error) {
    Logger.error(
      {
        indicatorId,
        observableId,
        error
      },
      'OpenCTI link indicator and observable failed'
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

module.exports = { linkIndicatorAndObservableById };
