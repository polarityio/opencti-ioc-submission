/**
 * OpenCTI Observable Deletion Mutation
 * GraphQL implementation following polarity-integration-utils patterns
 */

const { logging } = require('polarity-integration-utils');
const {
  isAuthRequiredError,
  isGraphQLError,
  parseOpenCTIError
} = require('../errorHandling/opencti-errors');
const { makeOpenCTIRequest } = require('../core');
const { DELETE_MUTATIONS_BY_TYPE } = require('../queries/graphql-queries');

/**
 * Delete an IOC from OpenCTI
 * @param {string} idToDelete - ID of the observable to delete
 * @param {string} type - Type of the IOC to delete
 * @param {Object} options - Configuration options containing OpenCTI API details
 * @param {Object} [logger] - Optional logger instance, defaults to polarity logger
 * @returns {Promise<string>} - Deleted observable ID
 */
async function deleteIOCByType({ idToDelete, type, openCtiTypeHuman }, options) {
  const Logger = logging.getLogger();

  Logger.trace(
    {
      idToDelete,
      type,
      openCtiTypeHuman
    },
    'Deleting OpenCTI observable'
  );

  try {
    const variables = {
      id: idToDelete
    };

    const data = await makeOpenCTIRequest(
      DELETE_MUTATIONS_BY_TYPE[type],
      variables,
      options
    );

    const deletedIocId = data?.indicatorDelete || data?.stixCyberObservableEdit?.delete;

    Logger.trace({ deletedIocId }, 'OpenCTI observable deleted successfully');

    return { deletedIocId, openCtiTypeHuman };
  } catch (error) {
    Logger.error({ idToDelete, error }, 'OpenCTI observable deletion failed');

    // Handle OpenCTI-specific errors
    if (isAuthRequiredError(error)) {
      throw new Error(
        'Authentication failed: Invalid API key or insufficient permissions'
      );
    }

    if (isGraphQLError(error)) {
      const parsedError = parseOpenCTIError(error);
      throw new Error(`OpenCTI GraphQL error: ${parsedError.message}`);
    }

    throw error;
  }
}

module.exports = deleteIOCByType;
