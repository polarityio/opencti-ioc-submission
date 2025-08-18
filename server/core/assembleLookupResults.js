/**
 * Assembly Lookup Results - OpenCTI Implementation
 * Main data assembly function for Polarity integration responses
 * Handles indicator and observable lookup responses from OpenCTI
 */

const {
  logging: { getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

/**
 * Main assembly function following blink-ops patterns for OpenCTI
 * Implements unified single-list interface with computed properties
 * @param {Array} unifiedSearchResults - Array of search results from OpenCTI
 * @param {Object} options - Request options
 * @param {Array} entities - Array of entities that were processed
 */
const assembleLookupResults = async (unifiedSearchResults, options, entities) => {
  const Logger = getLogger();

  try {
    Logger.trace({ unifiedSearchResults }, 'Starting OpenCTI lookup assembly');

    const foundItems = unifiedSearchResults.some(
      (result) => result.isIndicator || result.isObservable
    );
    const newEntities = unifiedSearchResults.some(
      (result) => !result.isIndicator && !result.isObservable
    );

    const lookupResults = [
      {
        entity: {
          ...entities[0],
          value: 'OpenCTI IOC Submission'
        },
        displayValue: 'OpenCTI IOC Submission',
        isVolatile: true,
        data: {
          summary: [
            ...(foundItems ? ['Items Found'] : []),
            ...(newEntities ? ['New Items'] : [])
          ],
          details: {
            // Ed's unified data structure for single list interface (Design Meeting requirement)
            unifiedResults: unifiedSearchResults,

            // OpenCTI-specific configuration
            apiUrl: options.url,
            canCreate: true,
            canAssociate: options.allowAssociation || false
          }
        }
      }
    ];

    return lookupResults;
  } catch (error) {
    const err = parseErrorToReadableJson(error);
    Logger.error(
      {
        error: error.message,
        stack: error.stack,
        formattedError: err
      },
      'OpenCTI Assembly Lookup Results Failed'
    );

    // Re-throw the error to preserve the original error details
    throw error;
  }
};

module.exports = assembleLookupResults;
