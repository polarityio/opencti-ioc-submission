/**
 * Server Core - Request Infrastructure Exports
 * Following blink-ops patterns with centralized request exports only
 * Note: assembleLookupResults is kept separate to avoid circular dependencies
 */

const { 
  makeOpenCTIRequest, 
  validateAuthentication, 
  createRequestOptions,
  enhanceRequestError,
  enhanceGraphQLError 
} = require('./request');

module.exports = {
  makeOpenCTIRequest,
  validateAuthentication,
  createRequestOptions,
  enhanceRequestError,
  enhanceGraphQLError
}; 