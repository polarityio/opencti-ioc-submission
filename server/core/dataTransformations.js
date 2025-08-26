const _ = require('lodash');

const {
  IGNORED_IPS,
  ENTITY_TYPE_TO_OPENCTI_HUMAN_READABLE_TYPE
} = require('./constants');
const { hasAnyDeletionPermissions } = require('../userOptions');
const { logging } = require('polarity-integration-utils');

/**
 * Separate ignored IPs from entities to be processed
 * @param {Array} _entitiesPartition - Entities to partition
 * @returns {Object} Partitioned entities and ignored IP results
 */
const splitOutIgnoredIps = (_entitiesPartition) => {
  const { ignoredIPs, entitiesPartition } = _.groupBy(
    _entitiesPartition,
    ({ isIP, value }) =>
      !isIP || (isIP && !IGNORED_IPS.has(value)) ? 'entitiesPartition' : 'ignoredIPs'
  );

  return {
    entitiesPartition,
    ignoredIpLookupResults: _.map(ignoredIPs, (entity) => ({
      entity,
      data: null
    }))
  };
};

/**
 * Transform OpenCTI indicators and observables into unified data structure
 * @param {Array} indicators - OpenCTI indicators
 * @param {Array} observables - OpenCTI observables
 * @param {Object} entity - Original entity
 * @param {Object} options - Configuration options
 * @returns {Array} Unified list with computed properties
 */
const createUnifiedItemList = (indicators, observables, entity, options = {}) => {
  const Logger = logging.getLogger();

  Logger.trace({ indicators, observables, entity, options }, 'createUnifiedItemList');

  const specificEntityType = getSpecificPolarityEntityType(entity);
  const openCtiTypeHuman =
    ENTITY_TYPE_TO_OPENCTI_HUMAN_READABLE_TYPE[specificEntityType] || 'unknown type';

  const transformedIndicators = indicators.map((indicator) => ({
    id: indicator.id,
    openCtiType: indicator.entity_type,
    openCtiTypeHuman,
    pattern: indicator.pattern,
    patternType: indicator.pattern_type,
    confidence: indicator.confidence,
    description: indicator.description || '',
    name: indicator.name || indicator.pattern,
    displayName: indicator.name || entity.value,
    type: 'indicator',
    icon: 'fingerprint',
    displayType: 'Indicator',
    webLink: `${options.url}/dashboard/observations/indicators/${indicator.id}`,
    confidence: indicator.confidence || 50,
    score: indicator.x_opencti_score || 50,
    labels: indicator.objectLabel || [],
    createdAt: indicator.created_at,
    updatedAt: indicator.updated_at,
    // createdBy is displayed as "Author" in UI
    createdBy: indicator.createdBy ? {name: indicator.createdBy.name, entityType: indicator.createdBy.entity_type} : { name: '--' },
    creators: Array.isArray(indicator.creators)
      ? indicator.creators.map((creator) => creator.name)
      : '--',
    markings: indicator.objectMarking,
    foundInOpenCTI: true,
    isIndicator: true,
    isObservable: false,
    itemType: 'indicator',
    entityValue: entity.value,
    entityType: getSpecificPolarityEntityType(entity),
    canEdit: true,
    canDelete: hasAnyDeletionPermissions(options),
    __submitAsIndicator: indicator.__submitAsIndicator || false,
    //__submitAsIndicator: false,
    __submitAsObservable: indicator.__submitAsObservable || false,
    //__submitAsObservable: false
    __toBeSubmitted: indicator.__submitAsIndicator || false
  }));

  const transformedObservables = observables.map((observable) => ({
    id: observable.id,
    openCtiType: observable.entity_type,
    openCtiTypeHuman,
    name: observable.observable_value || entity.value,
    displayName: observable.observable_value || entity.value,
    observableValue: observable.observable_value,
    description: observable.x_opencti_description || '',
    webLink: `${options.url}/dashboard/observations/observables/${observable.id}`,
    score: observable.x_opencti_score || 50,
    labels: observable.objectLabel || [],
    createdAt: observable.created_at,
    updatedAt: observable.updated_at,
    // createdBy is displayed as "Author" in UI
    createdBy: observable.createdBy ? {name: observable.createdBy.name, entityType: observable.createdBy.entity_type} : { name: '--' },
    creators: Array.isArray(observable.creators)
      ? observable.creators.map((creator) => creator.name)
      : '--',
    markings: observable.objectMarking,
    foundInOpenCTI: true,
    hashes: observable.hashes || [],
    type: 'observable',
    icon: 'binoculars',
    displayType: 'Observable',
    itemType: 'observable',
    isIndicator: false,
    isObservable: true,
    entityValue: entity.value,
    entityType: specificEntityType,
    canEdit: true,
    canDelete: hasAnyDeletionPermissions(options),
    __submitAsIndicator: observable.__submitAsIndicator || false,
    __submitAsObservable: observable.__submitAsObservable || false,
    // __submitAsIndicator: false,
    // __submitAsObservable: false,
    __toBeSubmitted: observable.__submitAsObservable || false
  }));

  // Combine and sort by creation date (newest first)
  const unifiedList = [...transformedIndicators, ...transformedObservables];

  unifiedList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return unifiedList;
};

/**
 * Given an entity, returns the specific entity type of that entity
 * For example, if an entity is a `hash`, this method will return the specific
 * hash.
 *
 * Note that if an entity is also annotated it will include the `string` type
 * but the more specific type will take precedent.  As a result, the only
 * special check needed is for hashes.
 *
 * @param entity
 */
const getSpecificPolarityEntityType = (entity) => {
  if (entity.types.includes('MD5')) {
    return 'MD5';
  }

  if (entity.types.includes('SHA1')) {
    return 'SHA1';
  }

  if (entity.types.includes('SHA256')) {
    return 'SHA256';
  }

  return entity.type;
};

/**
 * Map entity type to OpenCTI observable type
 * @param {Object} entity - Entity to map
 * @returns {string} OpenCTI observable type
 */
const mapEntityToObservableType = (entity) => {
  const typeMapping = {
    IPv4: 'IPv4-Addr',
    IPv6: 'IPv6-Addr',
    domain: 'Domain-Name',
    email: 'Email-Addr',
    MAC: 'Mac-Addr',
    url: 'Url',
    MD5: 'File',
    SHA1: 'File',
    SHA256: 'File',
    cve: 'Vulnerability'
  };

  return typeMapping[entity.type] || 'Unknown';
};

module.exports = {
  splitOutIgnoredIps,
  createUnifiedItemList,
  mapEntityToObservableType,
  getSpecificPolarityEntityType
};
