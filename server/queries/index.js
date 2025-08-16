/**
 * Server Queries Index - OpenCTI GraphQL Implementation
 * Exports all query and mutation functions for OpenCTI integration
 */

// OpenCTI GraphQL Query and Mutation modules
const { searchIndicatorsAndObservables } = require('./search-indicators-and-observables');

const { searchTags } = require('./search-tags');

module.exports = {
  searchIndicatorsAndObservables,
  searchTags
};