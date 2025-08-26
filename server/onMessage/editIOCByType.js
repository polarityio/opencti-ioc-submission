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
  getIndicatorOrObservableById
} = require('../queries/get-indicator-observable-by-id');
const {
  EDIT_OBSERVABLE,
  EDIT_INDICATOR_MARKINGS,
  EDIT_INDICATOR_DESCRIPTION,
  EDIT_INDICATOR_SCORE,
  EDIT_INDICATOR_AUTHOR
} = require('../queries/graphql-queries');

async function editIOCByType(
  { idToEdit, type, score, description, labels, authorId, markings, entity },
  options
) {
  const Logger = logging.getLogger();

  Logger.trace(
    {
      idToEdit,
      type,
      score,
      description,
      labels,
      authorId,
      markings
    },
    'Editing OpenCTI observable'
  );

  try {
    if (type === 'observable') {
      // the patch variables control whether a specific field will be updated by the
      // graphql.  Because the fields are defined as non-null in the graphql schema,
      // we set the values to empty strings if the value is `null` which prevents
      // them from being updated.
      // (null here indicates the value should not be updated)
      const variables = {
        patchAuthor: authorId !== null ? true : false,
        patchMarkings: markings !== null ? true : false,
        patchScore: score !== null ? true : false,
        patchDescription: description !== null ? true : false,
        id: idToEdit,
        authorId: authorId === null ? '' : authorId,
        markings: markings === null ? '' : markings,
        description: description === null ? '' : description,
        score: score === null ? '' : score
      };
      Logger.trace({ variables }, 'Edit Observable Variables');

      await makeOpenCTIRequest(EDIT_OBSERVABLE, variables, options);
      const updatedObservable = await getIndicatorOrObservableById(
        'observable',
        idToEdit,
        entity,
        options
      );

      Logger.trace({ updatedObservable }, 'Edit Observable result');
      return updatedObservable;
    } else if (type === 'indicator') {
      const updateTasks = [];
      
      if (authorId !== null) {
        updateTasks.push(
          makeOpenCTIRequest(EDIT_INDICATOR_AUTHOR, { id: idToEdit, authorId }, options)
        );
      }
      if (markings !== null) {
        updateTasks.push(
          makeOpenCTIRequest(EDIT_INDICATOR_MARKINGS, { id: idToEdit, markings }, options)
        );
      }
      if (description !== null) {
        updateTasks.push(
          makeOpenCTIRequest(
            EDIT_INDICATOR_DESCRIPTION,
            { id: idToEdit, description },
            options
          )
        );
      }
      if (score !== null) {
        updateTasks.push(
          makeOpenCTIRequest(EDIT_INDICATOR_SCORE, { id: idToEdit, score }, options)
        );
      }

      await Promise.all(updateTasks);
      const updatedIndicator = await getIndicatorOrObservableById(
        'indicator',
        idToEdit,
        entity,
        options
      );

      Logger.trace({ updatedIndicator }, 'Edit Indicator result');
      return updatedIndicator;
    } else {
      throw new Error(`Unexpected type ${type} when editing IOC`);
    }
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

module.exports = editIOCByType;
