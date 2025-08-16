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
const {
  buildEditMutationForType,
  buildCreateLabelsMutation
} = require('../queries/graphql-queries');

/**
 * Delete an IOC from OpenCTI
 * @param {string} idToEdit - ID of the observable to delete
 * @param {string} type - Type of the IOC to delete
 * @param {Object} options - Configuration options containing OpenCTI API details
 * @param {Object} [logger] - Optional logger instance, defaults to polarity logger
 * @returns {Promise<string>} - Deleted observable ID
 */
async function editIOCByType({ idToEdit, type, score, description, labels }, options) {
  const Logger = logging.getLogger();

  Logger.trace(
    {
      idToEdit,
      type,
      score,
      description,
      labels
    },
    'Editing OpenCTI observable'
  );

  try {
    const [descriptionAndLabelsMutation, scoreMutation] = buildEditMutationForType(
      type,
      idToEdit,
      description,
      score,
      labels
    );
    const [descriptionAndLabelsData, scoreData] = await Promise.all([
      descriptionAndLabelsMutation
        ? makeOpenCTIRequest(descriptionAndLabelsMutation, {}, options)
        : null,
      scoreMutation ? makeOpenCTIRequest(scoreMutation, {}, options) : null
    ]);

    const editedIocId = getEditedIocId(descriptionAndLabelsData, scoreData, type);

    Logger.trace(
      {
        editedIocId,
        descriptionAndLabelsMutation,
        scoreMutation,
        descriptionAndLabelsData,
        scoreData
      },
      'OpenCTI observable edited successfully'
    );

    // TODO: This is being returned as null and is not used by the front end
    // Figure out if this is needed or not
    return { editedIocId };
  } catch (error) {
    Logger.error(
      {
        idToEdit,
        type,
        score,
        description,
        labels,
        error
      },
      'OpenCTI observable deletion failed'
    );

    if (error.message.includes('You cannot update incompatible attribute')) {
      const errorMessage = 'You cannot update IOCs that dont belong to your Org';
      throw new Error(errorMessage);
    }

    // Handle OpenCTI-specific errors
    if (isAuthRequiredError(error)) {
      const errorMessage =
        'Authentication failed: Invalid API key or insufficient permissions';
      throw new Error(errorMessage);
    }

    if (isGraphQLError(error)) {
      const parsedError = parseOpenCTIError(error);
      const errorMessage = `OpenCTI GraphQL error: ${parsedError.message}`;
      throw new Error(errorMessage);
    }

    throw error;
  }
}

/**
 * Get the ID of the edited IOC
 * @param {Object} data - The data from the OpenCTI API
 * @param {string} type - The type of the IOC
 * @returns {string} - The ID of the edited IOC
 */
const getEditedIocId = (descriptionAndLabelsData, scoreData, type) => {
  const indicatorScoreId = scoreData?.score?.id;
  const observableScoreId = scoreData?.stixCyberObservableEdit?.score?.id;

  const indicatorDescriptionId = descriptionAndLabelsData?.description?.id;
  const observableDescriptionId =
    descriptionAndLabelsData?.stixCyberObservableEdit?.description?.id;

  const indicatorLabelsId = descriptionAndLabelsData?.labels?.added?.id;
  const observableLabelsId = descriptionAndLabelsData?.labels?.added?.id;

  return (
    indicatorScoreId ||
    indicatorDescriptionId ||
    observableScoreId ||
    observableDescriptionId ||
    indicatorLabelsId ||
    observableLabelsId ||
    indicatorLabelsId ||
    observableLabelsId ||
    null
  );
};

module.exports = editIOCByType;
