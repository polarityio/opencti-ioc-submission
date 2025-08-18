/**
 * User Options Module - Server Implementation
 * Following blink-ops patterns
 */

const validateOptions = require('./validateOptions');
const { 
  isDeletionAllowed, 
  getPermissionsForItemType, 
  hasAnyDeletionPermissions 
} = require('./utils');

module.exports = { 
  validateOptions,
  // Permission utility functions
  isDeletionAllowed,
  getPermissionsForItemType,
  hasAnyDeletionPermissions
}; 