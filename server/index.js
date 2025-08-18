/**
 * Server - Centralized Index
 * Following blink-ops patterns with centralized exports
 */

// Core functions
const core = require('./core');
const assembleLookupResults = require('./core/assembleLookupResults');

// Query functions
const queries = require('./queries');

// OnMessage action functions
const onMessage = require('./onMessage');

// User options
const validateOptions = require('./userOptions/validateOptions');

// Authentication testing
const { tryAuthentication, validateAuthConfig } = require('./core/tryAuthentication');

module.exports = {
  // Core exports
  core,
  assembleLookupResults,
  
  // Query exports
  queries,
  
  // OnMessage action functions (individual functions for integration-new.js)
  onMessage,
  
  // User options
  validateOptions,
  
  // Authentication testing
  tryAuthentication,
  validateAuthConfig
}; 