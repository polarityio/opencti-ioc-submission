/**
 * User Options Validation Utils - Server Implementation
 * Following blink-ops patterns with polarity-integration-utils
 */

const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });

/**
 * Validates string options according to OpenCTI requirements
 * @param {Object} stringOptionsErrorMessages - Error messages for each option
 * @param {Object} options - User configuration options  
 * @param {Array} otherErrors - Existing errors to append to
 * @returns {Array} Array of validation errors
 */
const validateStringOptions = (stringOptionsErrorMessages, options, otherErrors = []) =>
  reduce((agg, message, optionName) => {
    const isString = typeof options[optionName].value === 'string';
    const isEmptyString = isString && fp.isEmpty(options[optionName].value);

    return !isString || isEmptyString
      ? agg.concat({
          key: optionName,
          message
        })
      : agg;
  }, otherErrors)(stringOptionsErrorMessages);

/**
 * Validates URL option for OpenCTI API endpoint
 * @param {Object} options - User configuration options
 * @param {string} optionName - Name of the URL option to validate
 * @param {Array} otherErrors - Existing errors to append to
 * @returns {Array} Array of validation errors
 */
const validateUrlOption = (options, optionName = 'url', otherErrors = []) => {
  const urlValue = options[optionName]?.value;
  
  // Handle non-string values gracefully (fix for discovered bugs)
  if (typeof urlValue !== 'string') {
    return otherErrors; // Let string validation catch this
  }
  
  return urlValue && urlValue.endsWith('//')
    ? otherErrors.concat({
        key: optionName,
        message: 'Your Url must not end with a //'
      })
    : otherErrors;
};

/**
 * Validates search return types configuration
 * @param {Array} searchReturnTypes - Array of selected return types
 * @returns {Array} - Array of validation errors
 */
const validateSearchReturnTypes = (searchReturnTypes) => {
  const errors = [];
  
  // Only validate if the option is explicitly provided
  if (searchReturnTypes === undefined || searchReturnTypes === null) {
    return errors; // Allow undefined/null for backward compatibility
  }
  
  if (!Array.isArray(searchReturnTypes)) {
    errors.push({
      key: 'searchReturnTypes',
      message: 'Search Return Types must be an array'
    });
    return errors;
  }

  // Allow empty array for backward compatibility - will default to both types
  if (searchReturnTypes.length === 0) {
    return errors; // No error for empty array
  }

  const validTypes = ['indicators', 'observables'];
  const invalidTypes = searchReturnTypes.filter(type => 
    !validTypes.includes(type.value || type)
  );

  if (invalidTypes.length > 0) {
    errors.push({
      key: 'searchReturnTypes',
      message: `Invalid search return types: ${invalidTypes.join(', ')}. Valid options: ${validTypes.join(', ')}`
    });
  }


  return errors;
};

/**
 * Validates deletion permissions configuration
 * @param {Array} deletionPermissions - Array of deletion permissions
 * @returns {Array} - Array of validation errors
 */
const validateDeletionPermissions = (deletionPermissions) => {
  const errors = [];
  
  if (!Array.isArray(deletionPermissions)) {
    errors.push({
      key: 'deletionPermissions',
      message: 'Deletion Permissions must be an array'
    });
    return errors;
  }

  const validPermissions = ['indicators', 'observables'];
  const invalidPermissions = deletionPermissions.filter(permission => 
    !validPermissions.includes(permission.value || permission)
  );

  if (invalidPermissions.length > 0) {
    errors.push({
      key: 'deletionPermissions',
      message: `Invalid deletion permissions: ${invalidPermissions.join(', ')}. Valid options: ${validPermissions.join(', ')}`
    });
  }

  return errors;
};

/**
 * Validates field submission restrictions configuration
 * @param {Array} fieldRestrictions - Array of field restriction settings
 * @returns {Array} - Array of validation errors
 */
const validateFieldRestrictions = (fieldRestrictions) => {
  const errors = [];
  
  if (!Array.isArray(fieldRestrictions)) {
    errors.push({
      key: 'submissionFieldRestrictions',
      message: 'Field Submission Restrictions must be an array'
    });
    return errors;
  }

  const validRestrictions = [
    'score_required', 'score_disabled',
    'description_required', 'description_disabled',
    'labels_required', 'labels_disabled',
    'markings_enabled'
  ];

  const invalidRestrictions = fieldRestrictions.filter(restriction => 
    !validRestrictions.includes(restriction.value || restriction)
  );

  if (invalidRestrictions.length > 0) {
    errors.push({
      key: 'submissionFieldRestrictions',
      message: `Invalid field restrictions: ${invalidRestrictions.join(', ')}`
    });
  }

  // Check for conflicting restrictions
  const restrictionValues = fieldRestrictions.map(r => r.value || r);
  const conflictingPairs = [
    ['score_required', 'score_disabled'],
    ['description_required', 'description_disabled'],
    ['labels_required', 'labels_disabled']
  ];

  conflictingPairs.forEach(([required, disabled]) => {
    if (restrictionValues.includes(required) && restrictionValues.includes(disabled)) {
      errors.push({
        key: 'submissionFieldRestrictions',
        message: `Conflicting field restrictions: cannot have both ${required} and ${disabled}`
      });
    }
  });

  return errors;
};

/**
 * Validates default submission values configuration
 * @param {Array} defaultValues - Array of default value settings
 * @returns {Array} - Array of validation errors
 */
const validateDefaultValues = (defaultValues) => {
  const errors = [];
  
  if (!Array.isArray(defaultValues)) {
    errors.push({
      key: 'defaultSubmissionValues',
      message: 'Default Submission Values must be an array'
    });
    return errors;
  }

  const validDefaults = [
    'score_25', 'score_50', 'score_75', 'score_100',
    'confidence_low', 'confidence_medium', 'confidence_high', 'confidence_certain'
  ];

  const invalidDefaults = defaultValues.filter(defaultVal => 
    !validDefaults.includes(defaultVal.value || defaultVal)
  );

  if (invalidDefaults.length > 0) {
    errors.push({
      key: 'defaultSubmissionValues',
      message: `Invalid default values: ${invalidDefaults.join(', ')}`
    });
  }

  // Check for multiple score defaults
  const scoreDefaults = defaultValues.filter(val => 
    (val.value || val).startsWith('score_')
  );
  if (scoreDefaults.length > 1) {
    errors.push({
      key: 'defaultSubmissionValues',
      message: 'Only one default score value can be selected'
    });
  }

  // Check for multiple confidence defaults
  const confidenceDefaults = defaultValues.filter(val => 
    (val.value || val).startsWith('confidence_')
  );
  if (confidenceDefaults.length > 1) {
    errors.push({
      key: 'defaultSubmissionValues',
      message: 'Only one default confidence value can be selected'
    });
  }

  return errors;
};

/**
 * Validates search behavior configuration
 * @param {Array} searchBehavior - Array of search behavior options
 * @returns {Array} - Array of validation errors
 */
const validateSearchBehavior = (searchBehavior) => {
  const errors = [];
  
  if (!Array.isArray(searchBehavior)) {
    errors.push({
      key: 'searchBehavior',
      message: 'Search Behavior Options must be an array'
    });
    return errors;
  }

  const validBehaviors = [
    'case_sensitive', 'exact_match_only', 'include_related',
    'sort_by_date', 'sort_by_score'
  ];

  const invalidBehaviors = searchBehavior.filter(behavior => 
    !validBehaviors.includes(behavior.value || behavior)
  );

  if (invalidBehaviors.length > 0) {
    errors.push({
      key: 'searchBehavior',
      message: `Invalid search behaviors: ${invalidBehaviors.join(', ')}`
    });
  }

  // Check for conflicting sort options
  const behaviorValues = searchBehavior.map(b => b.value || b);
  if (behaviorValues.includes('sort_by_date') && behaviorValues.includes('sort_by_score')) {
    errors.push({
      key: 'searchBehavior',
      message: 'Cannot sort by both date and score - please select only one sort option'
    });
  }

  return errors;
};

/**
 * Check if deletion is allowed for a specific item type based on user permissions
 * @param {Object} options - User configuration options containing deletionPermissions
 * @param {string} itemType - Type of item to check ('indicator' or 'observable')
 * @returns {boolean} - Whether deletion is allowed for the specified item type
 */
const isDeletionAllowed = (options, itemType) => {
  // Handle null/undefined options gracefully
  if (!options || !options.deletionPermissions) {
    return false;
  }

  // Ensure deletionPermissions is an array
  if (!Array.isArray(options.deletionPermissions)) {
    return false;
  }

  // Check if the specific item type is allowed
  const allowedTypes = options.deletionPermissions.map(
    (perm) => (perm.value || perm).replace(/s$/, '') // Remove plural 's' to normalize
  );

  return allowedTypes.includes(itemType);
};

/**
 * Get user permissions for a specific item type
 * @param {Object} options - User configuration options
 * @param {string} itemType - Type of item ('indicator' or 'observable')
 * @returns {Object} - Permission object with boolean flags for each permission type
 */
const getPermissionsForItemType = (options, itemType) => {
  return {
    canDelete: isDeletionAllowed(options, itemType),
    canEdit: true, // Always allowed for now
    canView: true  // Always allowed for now
  };
};

/**
 * Check if user has any deletion permissions (indicators OR observables)
 * @param {Object} options - User options containing deletionPermissions
 * @returns {boolean} - Whether user can delete any type of item
 */
const hasAnyDeletionPermissions = (options) => {
  return isDeletionAllowed(options, 'indicator') || isDeletionAllowed(options, 'observable');
};

module.exports = {
  validateStringOptions,
  validateUrlOption,
  validateSearchReturnTypes,
  validateDeletionPermissions,
  validateFieldRestrictions,
  validateDefaultValues,
  validateSearchBehavior,
  // Permission utility functions
  isDeletionAllowed,
  getPermissionsForItemType,
  hasAnyDeletionPermissions
}; 