/**
 * OpenCTI Indicators and Observables Search Query
 * GraphQL implementation following polarity-integration-utils patterns
 */

const { logging } = require('polarity-integration-utils');
const {
  isAuthRequiredError,
  isGraphQLError,
  parseOpenCTIError
} = require('../errorHandling/opencti-errors');
const { makeOpenCTIRequest } = require('../core');
const { buildSearchQuery } = require('./graphql-queries');
const { createEnhancedErrorDetail } = require('../errorHandling/error-message-mapping');
const {
  createUnifiedItemList,
  getSpecificPolarityEntityType
} = require('../core/dataTransformations');
const { ENTITY_TYPE_TO_OPENCTI_HUMAN_READABLE_TYPE } = require('../core/constants');

const searchIndicatorsAndObservables = async (entities, options) => {
  const Logger = logging.getLogger();

  const unifiedSearchResults = await Promise.all(
    entities.map(async (entity) => {
      Logger.trace({ entity: entity.value, type: entity.type }, 'Processing entity');

      // Search for both indicators and observables simultaneously
      const searchResults = await searchIndicatorsAndObservablesForEntity(
        entity,
        options
      );

      // Extract arrays from edges structure
      const indicators = (searchResults?.indicators?.edges || []).map(
        (edge) => edge.node
      );
      const observables = (searchResults?.observables?.edges || []).map(
        (edge) => edge.node
      );

      Logger.trace(
        {
          indicators: indicators.length,
          observables: observables.length
        },
        'Search results received'
      );

      // Create unified data structure with computed properties
      const unifiedData = createUnifiedDataStructure(
        entity,
        indicators,
        observables,
        options
      );

      return unifiedData;
    })
  );

  // In certain circumstances we can have duplicate results e.g., when searching on a
  // domain and a URL containing that domain both entities can match on the same
  // indicator/observable in OpenCTI.
  // This snippet creates a Map to deduplicate items based on their `id` property,
  // or assign a unique key for items without an id (searches without a result in OpenCTI)
  const uniqueUnifiedResults = Array.from(
    new Map(
      unifiedSearchResults
        .flat()
        .map((item) => (item.id ? [item.id, item] : [Symbol(), item]))
    ).values()
  );

  return uniqueUnifiedResults;
};

/**
 * Search for indicators and observables matching the entity value
 * @param {Object} entity - Polarity entity object with value and type
 * @param {Object} options - Configuration options containing OpenCTI API details
 * @param {Object} [logger] - Optional logger instance, defaults to polarity logger
 * @returns {Promise<Object>} - Combined search results
 */
async function searchIndicatorsAndObservablesForEntity(entity, options) {
  const Logger = logging.getLogger();

  Logger.trace(
    {
      entity: entity.value,
      type: entity.type
    },
    'Searching OpenCTI for indicators and observables'
  );

  try {
    // Build dynamic query based on enabled search types
    const query = buildSearchQuery();

    Logger.trace(
      {
        entity: entity.value,
        query,
        options: {
          url: options.url,
          hasApiKey: !!options.apiKey,
          apiKeyLength: options.apiKey ? options.apiKey.length : 0,
          authorId: options.authorId
        }
      },
      'Search configuration determined'
    );

    const variables = {
      search: `"${entity.value}"`,
      filters: {
        filters: [],
        filterGroups: [],
        mode: 'or'
      }
    };

    if (options.exactMatchSearching) {
      variables.filters = {
        mode: 'or',
        filters: [
          {
            key: 'name',
            operator: 'eq',
            values: [entity.value],
            mode: 'or'
          },
          {
            key: 'value',
            operator: 'eq',
            values: [entity.value],
            mode: 'or'
          }
        ],
        filterGroups: []
      };
    }

    const response = await makeOpenCTIRequest(query, variables, options);

    Logger.trace(
      {
        indicators: response.indicators?.edges?.length || 0,
        observables: response.stixCyberObservables?.edges?.length || 0
      },
      'OpenCTI search completed successfully'
    );

    // Return results with consistent structure, even if some searches were disabled
    return {
      indicators: response.indicators || { edges: [] },
      observables: response.stixCyberObservables || { edges: [] }
    };
  } catch (error) {
    Logger.error(
      {
        entity: entity.value,
        entityType: entity.type,
        error: error.message,
        stack: error.stack,
        options: {
          url: options.url,
          hasApiKey: !!options.apiKey
        }
      },
      'OpenCTI search failed'
    );

    // Handle OpenCTI-specific errors
    if (isAuthRequiredError(error)) {
      const enhancedDetail = createEnhancedErrorDetail(error, 'Authentication required');
      throw new Error(enhancedDetail);
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

/**
 * Create unified data structure with computed properties for single-list interface
 * Implements CTO design meeting specifications for icon-based differentiation
 * @param {Object} entity - Entity being processed
 * @param {Array} indicators - OpenCTI indicators from GraphQL
 * @param {Array} observables - OpenCTI observables from GraphQL
 * @param {Object} options - Request options
 * @returns {Object} Unified data structure with computed properties
 */
function createUnifiedDataStructure(entity, indicators, observables, options) {
  const Logger = logging.getLogger();

  let unifiedItems = createUnifiedItemList(indicators, observables, entity, options);

  if (unifiedItems.length === 0) {
    const specificEntityType = getSpecificPolarityEntityType(entity);
    unifiedItems = [
      {
        foundInOpenCTI: false,
        isIndicator: false,
        isObservable: false,
        entityValue: entity.value,
        entityType: specificEntityType,
        openCtiTypeHuman:
          ENTITY_TYPE_TO_OPENCTI_HUMAN_READABLE_TYPE[specificEntityType] || 'unknown type'
      }
    ];
  }

  Logger.trace(
    { entity: entity.value, unified: unifiedItems.length },
    'Created unified data structure'
  );

  return unifiedItems;
}

module.exports = {
  searchIndicatorsAndObservables,
  createUnifiedDataStructure
};
