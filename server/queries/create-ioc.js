/**
 * OpenCTI Indicator Creation Mutation
 * GraphQL implementation following polarity-integration-utils patterns
 */

const { logging } = require('polarity-integration-utils');
const {
  isAuthRequiredError,
  isGraphQLError,
  parseOpenCTIError
} = require('../errorHandling/opencti-errors');
const {
  STIX_PATTERNS,
  ENTITY_TYPE_BY_OBSERVABLE_TYPE,
  ENTITY_TYPE_BY_OBSERVABLE_SUBMISSION_KEY
} = require('../core/constants');
const { makeOpenCTIRequest } = require('../core');
const { CREATE_MUTATIONS_BY_TYPE } = require('./graphql-queries');
const { createUnifiedItemList } = require('../core/dataTransformations');

/**
 * Create a new indicator in OpenCTI
 * @param {Object} entity - Polarity entity object with value and type
 * @param {Object} indicatorData - Additional indicator data (description, labels, etc.)
 * @param {Object} options - Configuration options containing OpenCTI API details
 * @returns {Promise<Object>} - Created indicator data
 */
async function createIOC(
  { typeToCreate, iocToCreate, description, score, labels },
  options
) {
  const Logger = logging.getLogger();

  try {
    const variables = createVariablesByType(
      typeToCreate,
      iocToCreate,
      description,
      score,
      labels,
      options
    );

    Logger.trace(
      {
        typeToCreate,
        iocToCreate,
        description,
        score,
        labels,
        variables
      },
      'Creating OpenCTI indicator'
    );

    const data = await makeOpenCTIRequest(
      CREATE_MUTATIONS_BY_TYPE[typeToCreate],
      variables,
      options
    );

    const createdIoc = formatCreatedIoc(data, typeToCreate, iocToCreate, options);

    Logger.trace(
      {
        typeToCreate,
        iocToCreate,
        description,
        score,
        labels,
        data,
        createdIoc
      },
      'OpenCTI ioc created successfully'
    );

    return createdIoc;
  } catch (error) {
    Logger.error(
      {
        typeToCreate,
        iocToCreate,
        description,
        score,
        labels,
        error
      },
      'OpenCTI ioc creation failed'
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

const createVariablesByType = (
  typeToCreate,
  iocToCreate,
  description,
  score,
  labels,
  options
) =>
  ['indicator', 'observable'].includes(typeToCreate)
    ? {
        ...(typeToCreate === 'indicator' && {
          name: iocToCreate.entityValue,
          pattern: generateStixPattern(iocToCreate),
          pattern_type: 'stix',
          observableType: getObservableType(iocToCreate)

          /** Remaining Properties in GraphQL Input for Create Indicator Mutation
           *  Left in for future feature development
           *
           * confidence: Int,
           * objectMarking: UUID[],
           * externalReferences: UUID[],
           * indicator_types: [],
           * killChainPhases: KillChainPhase[],
           * x_mitre_platforms: Platform[],
           * valid_from: Date,
           * valid_until: Date,
           * createObservables: Boolean,
           * x_opencti_detection: Boolean,
           */
        }),

        ...(typeToCreate === 'observable' && {
          type: getObservableType(iocToCreate),
          ...getObservableProperties(iocToCreate)
        }),

        description,
        score: parseInt(score),
        labels,
        createdBy: null
      }
    : false;

/**
 * Generate STIX pattern for the entity
 * @param {Object} entity - Polarity entity object
 * @returns {string} - STIX 2.1 pattern
 */
function generateStixPattern({ entityType, entityValue }) {
  // Use the STIX pattern functions from constants
  const patternFunction = STIX_PATTERNS[entityType];

  if (!patternFunction) {
    throw new Error(`Unsupported entity type for STIX pattern generation: ${entityType}`);
  }

  // Call the pattern function with the entity value
  return patternFunction(entityValue);
}

const getObservableType = ({ entityType }) => ENTITY_TYPE_BY_OBSERVABLE_TYPE[entityType];
const getObservableProperties = ({ entityType, entityValue }) => {
  const key = ENTITY_TYPE_BY_OBSERVABLE_SUBMISSION_KEY[entityType];
  if (entityType === 'MD5' || entityType === 'SHA1' || entityType === 'SHA256') {
    return {
      [key]: { name: entityValue }
    };
  } else {
    return {
      [key]: { value: entityValue }
    };
  }
};

/**
 * Get the ID of the edited IOC
 * @param {Object} data - The data from the OpenCTI API
 * @param {string} type - The type of the IOC
 * @returns {any} - The ID of the edited IOC
 */
const formatCreatedIoc = (data, type, iocToCreate, options) => {
  const Logger = logging.getLogger();

  // TODO: this is very brittle and we need a better way to signal that these
  // are the values we need.
  // createUnifiedItemList needs just the value, type, and types
  // which are given by iocToCreate
  const entity = {
    value: iocToCreate.entityValue,
    type: iocToCreate.entityType,
    types: [iocToCreate.entityType]
  };

  const unifiedList =
    type === 'indicator'
      ? createUnifiedItemList([data.indicatorAdd], [], entity, options)
      : type === 'observable'
      ? createUnifiedItemList([], [data.stixCyberObservableAdd], entity, options)
      : null;

  const createdIoc =
    Array.isArray(unifiedList) && unifiedList.length > 0 && unifiedList[0];

  Logger.trace(
    {
      createdIoc,
      type,
      data,
      unifiedList
    },
    'Created IOC'
  );

  if (createdIoc.type === 'indicator' && iocToCreate.id) {
    createdIoc.relatedObservableId = iocToCreate.id;
  } else if (createdIoc.type === 'observable' && iocToCreate.id) {
    createdIoc.relatedIndicatorId = iocToCreate.id;
  }

  return createdIoc;
};

module.exports = {
  createIOC
};
