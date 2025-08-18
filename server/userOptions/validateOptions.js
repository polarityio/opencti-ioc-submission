/**
 * User Options Validation - Server Implementation
 * Following blink-ops patterns with polarity-integration-utils
 * OpenCTI IOC Submission Configuration Validation
 */

const {
  validateStringOptions,
  validateUrlOption,
  validateDeletionPermissions,
  validateFieldRestrictions,
  validateDefaultValues,
  validateSearchBehavior
} = require('./utils');

/**
 * Validates user configuration options for OpenCTI integration
 * @param {Object} options - User configuration options
 * @param {Function} callback - Callback function (err, errors)
 */
const validateOptions = async (options, callback) => {
  try {
    const stringOptionsErrorMessages = {
      url: 'You must provide a valid URL for your OpenCTI Instance',
      // authorId: 'You must provide a valid Author UUID for your OpenCTI Account',
      apiKey: 'You must provide a valid API Token for your OpenCTI Account'
    };

    const stringValidationErrors = validateStringOptions(
      stringOptionsErrorMessages,
      options
    );

    const urlValidationError = validateUrlOption(options, 'url');

    // Validate new user options - handle both test format and Polarity format
    const getOptionValue = (option, defaultValue) => {
      if (option === null || option === undefined) return defaultValue !== undefined ? defaultValue : [];
      if (option && option.value !== undefined) return option.value;
      return option; // Direct value for tests
    };

    const deletionPermissionsErrors = validateDeletionPermissions(
      getOptionValue(options.deletionPermissions)
    );
    const fieldRestrictionsErrors = validateFieldRestrictions(
      getOptionValue(options.submissionFieldRestrictions)
    );
    const defaultValuesErrors = validateDefaultValues(
      getOptionValue(options.defaultSubmissionValues)
    );
    const searchBehaviorErrors = validateSearchBehavior(
      getOptionValue(options.searchBehavior)
    );

    // Validate boolean options
    const booleanValidationErrors = [];
    
    // Only validate automaticLinking if it's explicitly provided
    if (options.automaticLinking !== undefined) {
      const automaticLinkingValue = getOptionValue(options.automaticLinking, undefined);
      if (typeof automaticLinkingValue !== 'boolean') {
        booleanValidationErrors.push({
          key: 'automaticLinking',
          message: 'Automatic Relationship Creation must be a boolean value'
        });
      }
    }

    const errors = stringValidationErrors
      .concat(urlValidationError)
      .concat(deletionPermissionsErrors)
      .concat(fieldRestrictionsErrors)
      .concat(defaultValuesErrors)
      .concat(searchBehaviorErrors)
      .concat(booleanValidationErrors);

    callback(null, errors);
  } catch (error) {
    callback(error);
  }
};

module.exports = validateOptions;
