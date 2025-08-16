/**
 * OpenCTI IOC Submission Integration - New Implementation
 * Following blink-ops patterns with polarity-integration-utils
 * TDD Implementation maintaining feature parity with original integration.js
 */

const {
  logging: { setLogger, getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

const {
  validateOptions,
  assembleLookupResults,
  onMessage: onMessageFunctions
} = require('./server');
const { splitOutIgnoredIps } = require('./server/core/dataTransformations');
const { searchIndicatorsAndObservables } = require('./server/queries');

/**
 * Main lookup function following blink-ops patterns
 * @param {Array} entities - Array of entities to process
 * @param {Object} options - Request options
 * @param {Function} callback - Callback function
 */
const doLookup = async (entities, { url, ..._options }, callback) => {
  const Logger = getLogger();
  try {
    Logger.debug({ entities }, 'Fixed Entities');

    let entitiesWithoutFalseUrls = entities.filter(
      (entity) => !(entity.isURL && entity.value.length >= 100)
    );

    Logger.debug({ entitiesWithoutFalseUrls }, 'Filtered Entities');

    // Normalize URL (remove trailing slash - feature parity)
    const options = {
      ..._options,
      url: url.endsWith('/') ? url.slice(0, -1) : url
    };

    const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
      entitiesWithoutFalseUrls
    );

    if (!entitiesPartition) {
      // If there are no entities to process, return the ignored IPs
      Logger.trace('No entities to process, returning ignored IPs only');
      callback(null, ignoredIpLookupResults);
      return;
    }

    const unifiedSearchResults = await searchIndicatorsAndObservables(
      entitiesPartition,
      options
    );

    const lookupResults = await assembleLookupResults(
      unifiedSearchResults,
      options,
      entitiesPartition
    );

    Logger.trace({ lookupResults }, 'Lookup Results');

    callback(null, lookupResults.concat(ignoredIpLookupResults));
  } catch (error) {
    const err = parseErrorToReadableJson(error);
    Logger.error({ error, formattedError: err }, 'Get Lookup Results Failed');
    callback({ detail: error.message || 'Lookup Failed', err });
  }
};

const onMessage = async ({ action, data: actionParams }, options, callback) => {
  const Logger = getLogger();

  // Handle unknown actions gracefully
  if (!onMessageFunctions[action]) {
    Logger.debug({ action }, 'Unknown action requested');
    return callback({ detail: 'Unknown action requested', action, actionParams });
  }

  try {
    const result = await onMessageFunctions[action](actionParams, options);
    Logger.trace({result}, `onMessage ${action} result`);
    callback(null, result);
  } catch (error) {
    Logger.error({ error }, `Error executing onMessage function ${action}`);
    callback({
      detail: error.message
        ? error.message
        : `Error executing onMessage function ${action}`,
      error
    });
  }
};

// Export following exact blink-ops pattern
module.exports = {
  startup: setLogger,
  validateOptions,
  doLookup,
  onMessage
};
