/**
 * Search Tags Action Function - OpenCTI Implementation
 * Handle tag autocomplete using OpenCTI labels API
 */
const { searchTags: searchTagsQuery } = require('../queries');
const { logging } = require('polarity-integration-utils');

/**
 * Handle search tags action for OpenCTI tag search
 * @param {Object} actionParams - Action parameters containing search term
 * @param {Object} options - Request options with OpenCTI configuration
 * @param {Object} Logger - Logger instance
 * @param {Function} callback - Callback function
 */
const searchTags = async (actionParams, options) => {
  const Logger = logging.getLogger();
  Logger.trace({ actionParams }, 'OpenCTI search tags action');

  const searchTerm = actionParams?.term || actionParams?.query || '';
  const selectedTags = actionParams?.selectedTags || [];

  try {
    Logger.debug({ searchTerm }, 'Searching OpenCTI labels');

    // Search for OpenCTI labels matching the term
    const labelResults = await searchTagsQuery(searchTerm, options, Logger);

    // Transform OpenCTI label results to autocomplete format
    const tags = (labelResults?.labels?.edges || [])
      .map((label) => ({
        id: label?.node?.id,
        value: label?.node?.value,
        color: label?.node?.color || '#4f81bd'
      }))
      .filter((tag) => !selectedTags.some((selectedTag) => selectedTag.id === tag.id));

    Logger.debug(
      {
        searchTerm,
        resultCount: tags.length
      },
      'OpenCTI label search completed'
    );

    return {
      tags,
      searchTerm,
      success: true
    };
  } catch (searchTagsError) {
    Logger.error(
      {
        searchTagsError,
        searchTerm
      },
      'OpenCTI label search error'
    );

    // Handle specific OpenCTI search errors
    let userMessage = 'Failed to search labels';
    if (searchTagsError.message && searchTagsError.message.includes('permission')) {
      userMessage = 'You do not have permission to search labels';
    } else if (searchTagsError.message && searchTagsError.message.includes('timeout')) {
      userMessage = 'Label search timed out - try a more specific term';
    }

    throw new Error(searchTagsError.message || userMessage);
  }
};

module.exports = searchTags;
