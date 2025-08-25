/**
 * Search Identities Action Function - OpenCTI Implementation
 * Handle identity (i.e., author) autocomplete using OpenCTI identities API
 */
const { searchIdentities: searchIdentitiesQuery } = require('../queries');
const { logging } = require('polarity-integration-utils');

/**
 * Handle search identities search action for OpenCTI identity search
 * @param {Object} actionParams - Action parameters containing search term
 * @param {Object} options - Request options with OpenCTI configuration
 */
const searchIdentities = async (actionParams, options) => {
  const Logger = logging.getLogger();
  Logger.trace({ actionParams }, 'OpenCTI search identities action');

  const searchTerm = actionParams?.term;

  try {
    Logger.debug({ searchTerm }, 'Searching OpenCTI identities');

    // Search for OpenCTI labels matching the term
    const identityResults = await searchIdentitiesQuery(searchTerm, options);

    // Transform OpenCTI label results to autocomplete format
    const identities = (identityResults?.identities?.edges || []).map((identity) => ({
      id: identity?.node?.id,
      name: identity?.node?.name,
      entityType: identity?.node?.entity_type
    }));

    Logger.debug(
      {
        searchTerm,
        resultCount: identities.length
      },
      'OpenCTI identity search completed'
    );

    return {
      identities,
      searchTerm,
      success: true
    };
  } catch (error) {
    Logger.error(
      {
        error,
        searchTerm
      },
      'OpenCTI identity search error'
    );

    // Handle specific OpenCTI search errors
    let userMessage = 'Failed to search identities';
    if (error.message && error.message.includes('permission')) {
      userMessage = 'You do not have permission to search labels';
    } else if (error.message && error.message.includes('timeout')) {
      userMessage = 'Identity search timed out - try a more specific term';
    }

    throw new Error(error.message || userMessage);
  }
};

module.exports = searchIdentities;
