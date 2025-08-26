const { logging } = require('polarity-integration-utils');
const {
  isAuthRequiredError,
  isGraphQLError,
  parseOpenCTIError
} = require('../errorHandling/opencti-errors');
const { makeOpenCTIRequest } = require('../core');
const { GET_INDICATOR, GET_OBSERVABLE } = require('./graphql-queries');
const { createEnhancedErrorDetail } = require('../errorHandling/error-message-mapping');
const { createUnifiedItemList } = require('../core/dataTransformations');

const getIndicatorOrObservableById = async (type, id, entity, options) => {
  const Logger = logging.getLogger();

  const variables = {
    search: '',
    filters: {
      filters: [
        {
          key: 'id',
          operator: 'eq',
          values: id,
          mode: 'or'
        }
      ],
      filterGroups: [],
      mode: 'or'
    }
  };

  try {
    const response = await makeOpenCTIRequest(
      type === 'observable' ? GET_OBSERVABLE : GET_INDICATOR,
      variables,
      options
    );

    // Either `indicators` or `observables` will have results
    const indicators = (response?.indicators?.edges || []).map((edge) => edge.node);

    const observables = (response?.stixCyberObservables?.edges || []).map((edge) => edge.node);

    const unifiedItems = createUnifiedItemList(indicators, observables, entity, options);
    
    if(unifiedItems.length === 0){
      throw Error(`No ${type} with id ${id} found`);
    }

    Logger.trace({ getByIdResult: unifiedItems }, 'getIndicatorOrObservableById result');

    return unifiedItems[0];
  } catch (error) {
    Logger.error(
      {
        error,
        entity: entity.value,
        entityType: entity.type,
        options: {
          url: options.url,
          hasApiKey: !!options.apiKey
        }
      },
      'OpenCTI search indicators and observables failed'
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
};

module.exports = {
  getIndicatorOrObservableById
};
