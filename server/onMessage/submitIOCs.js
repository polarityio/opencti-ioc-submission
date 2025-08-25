/**
 * OpenCTI Observable Creation Mutation
 * GraphQL implementation following polarity-integration-utils patterns
 */

const { logging } = require('polarity-integration-utils');
const {
  isAuthRequiredError,
  isGraphQLError,
  parseOpenCTIError
} = require('../errorHandling/opencti-errors');
const { createIOC } = require('../queries/create-ioc');
const {
  linkIndicatorAndObservableById
} = require('../queries/link-indicator-and-observable-by-id');
const editIOCByType = require('./editIOCByType');

// const { SEARCH_TAGS_QUERY } = require('../queries/graphql-queries');

/**
 * Create a new observable in OpenCTI
 * @param {Object} entity - Polarity entity object with value and type
 * @param {Object} observableData - Additional observable data (description, labels, etc.)
 * @param {Object} options - Configuration options containing OpenCTI API details
 * @param {Object} [logger] - Optional logger instance, defaults to polarity logger
 * @returns {Promise<Object>} - Created observable data
 */
async function submitIOCs({ iocsToEditAndCreate, description, score, labels, markings, authorId }, options) {
  const Logger = logging.getLogger();

  Logger.trace(
    {
      iocsToEditAndCreate,
      description,
      score,
      labels,
      markings,
      authorId
    },
    'Submitting IOCs to OpenCTI'
  );

  try {
    // Create new indicators and observables
    const newIocs = iocsToEditAndCreate.filter(
      (ioc) => ioc.__submitAsObservable || ioc.__submitAsIndicator
    );

    Logger.trace({ newIocs }, 'IOCs to Create');

    const newIocsResults = (
      await Promise.all(
        newIocs.map(async (ioc) => {
          const pendingCreatedIndicator = ioc.__submitAsIndicator
            ? createIOC(
                {
                  typeToCreate: 'indicator',
                  iocToCreate: ioc,
                  description,
                  score,
                  labels,
                  markings,
                  authorId
                },
                options
              )
            : null;

          const pendingCreatedObservable = ioc.__submitAsObservable
            ? createIOC(
                {
                  typeToCreate: 'observable',
                  iocToCreate: ioc,
                  description,
                  score,
                  labels,
                  markings,
                  authorId
                },
                options
              )
            : null;

          const [createdIndicator, createdObservable] = await Promise.all([
            pendingCreatedIndicator,
            pendingCreatedObservable
          ]);

          await doAutoLinkingControlFlow(createdIndicator, createdObservable, options);

          return [].concat(createdIndicator || []).concat(createdObservable || []);
        })
      )
    ).flat();

    const response = {
      createdIocs: newIocsResults
    };

    Logger.trace(
      {
        labels,
        newIocs,
        newIocsResults,
        response
      },
      'OpenCTI observable created successfully'
    );

    return response;
  } catch (error) {
    Logger.error(
      {
        iocsToEditAndCreate,
        description,
        score,
        labels,
        error
      },
      'OpenCTI Submit IOCs Failed'
    );

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

const doAutoLinkingControlFlow = async (createdIndicator, createdObservable, options) => {
  const Logger = logging.getLogger();

  const autoLinkingEnabled = options.automaticLinking;

  if (!autoLinkingEnabled) {
    return;
  }

  Logger.trace({ createdObservable, createdIndicator }, 'doAutoLinkingControlFlow');

  if (createdIndicator && createdObservable) {
    await linkIndicatorAndObservableById(
      createdIndicator.id,
      createdObservable.id,
      options
    );
  }

  if (createdIndicator && createdIndicator.relatedObservableId) {
    await linkIndicatorAndObservableById(
      createdIndicator.id,
      createdIndicator.relatedObservableId,
      options
    );
  } else if (createdObservable && createdObservable.relatedIndicatorId) {
    await linkIndicatorAndObservableById(
      createdObservable.relatedIndicatorId,
      createdObservable.id,
      options
    );
  }
};

module.exports = submitIOCs;
