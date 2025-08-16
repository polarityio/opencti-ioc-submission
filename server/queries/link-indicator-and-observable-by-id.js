const { makeOpenCTIRequest } = require('../core');
const { LINK_INDICATOR_AND_OBSERVABLE_BY_ID_MUTATION } = require('./graphql-queries');
const {
  logging: { getLogger }
} = require('polarity-integration-utils');

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
    Logger.error({ error }, 'Error in linkIndicatorAndObservableById');
  }
}

module.exports = { linkIndicatorAndObservableById };
