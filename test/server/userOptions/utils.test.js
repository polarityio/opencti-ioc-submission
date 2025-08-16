/**
 * User Options Utils Test Suite - Complete Coverage
 * Testing all validation functions and permission utilities
 */

const {
  validateStringOptions,
  validateUrlOption,
  validateSearchReturnTypes,
  validateDeletionPermissions,
  validateFieldRestrictions,
  validateDefaultValues,
  validateSearchBehavior,
  isDeletionAllowed,
  getPermissionsForItemType,
  hasAnyDeletionPermissions
} = require('../../../server/userOptions/utils');

describe('User Options Utils - Complete Coverage', () => {
  describe('validateStringOptions Function', () => {
    it('should validate string options and return errors for invalid values', () => {
      const stringOptionsErrorMessages = {
        url: 'URL is required',
        apiKey: 'API Key is required'
      };
      const options = {
        url: { value: '' },
        apiKey: { value: 123 }
      };
      const result = validateStringOptions(stringOptionsErrorMessages, options);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ key: 'url', message: 'URL is required' });
      expect(result[1]).toEqual({ key: 'apiKey', message: 'API Key is required' });
    });

    it('should return empty array for valid string options', () => {
      const stringOptionsErrorMessages = {
        url: 'URL is required',
        apiKey: 'API Key is required'
      };
      const options = {
        url: { value: 'https://example.com' },
        apiKey: { value: 'valid-key' }
      };
      const result = validateStringOptions(stringOptionsErrorMessages, options);
      
      expect(result).toHaveLength(0);
    });

    it('should append to existing errors array', () => {
      const stringOptionsErrorMessages = { url: 'URL is required' };
      const options = { url: { value: '' } };
      const existingErrors = [{ key: 'other', message: 'Other error' }];
      
      const result = validateStringOptions(stringOptionsErrorMessages, options, existingErrors);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ key: 'other', message: 'Other error' });
      expect(result[1]).toEqual({ key: 'url', message: 'URL is required' });
    });
  });

  describe('validateUrlOption Function', () => {
    it('should reject URLs ending with //', () => {
      const options = { url: { value: 'https://example.com//' } };
      const result = validateUrlOption(options);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: 'url',
        message: 'Your Url must not end with a //'
      });
    });

    it('should accept valid URLs', () => {
      const options = { url: { value: 'https://example.com' } };
      const result = validateUrlOption(options);
      
      expect(result).toHaveLength(0);
    });

    it('should handle non-string URL values gracefully', () => {
      const options = { url: { value: 123 } };
      const result = validateUrlOption(options);
      
      expect(result).toHaveLength(0); // Let string validation catch this
    });

    it('should handle custom option name', () => {
      const options = { customUrl: { value: 'https://example.com//' } };
      const result = validateUrlOption(options, 'customUrl');
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('customUrl');
    });

    it('should append to existing errors array', () => {
      const options = { url: { value: 'https://example.com//' } };
      const existingErrors = [{ key: 'other', message: 'Other error' }];
      const result = validateUrlOption(options, 'url', existingErrors);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('validateSearchReturnTypes Function', () => {
    it('should allow undefined searchReturnTypes for backward compatibility', () => {
      const result = validateSearchReturnTypes(undefined);
      expect(result).toHaveLength(0);
    });

    it('should allow null searchReturnTypes for backward compatibility', () => {
      const result = validateSearchReturnTypes(null);
      expect(result).toHaveLength(0);
    });

    it('should reject non-array searchReturnTypes', () => {
      const result = validateSearchReturnTypes('not-an-array');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: 'searchReturnTypes',
        message: 'Search Return Types must be an array'
      });
    });

    it('should allow empty array for backward compatibility', () => {
      const result = validateSearchReturnTypes([]);
      expect(result).toHaveLength(0);
    });

    it('should validate valid search return types', () => {
      const result = validateSearchReturnTypes(['indicators', 'observables']);
      expect(result).toHaveLength(0);
    });

    it('should validate valid search return types with value property', () => {
      const result = validateSearchReturnTypes([
        { value: 'indicators' },
        { value: 'observables' }
      ]);
      expect(result).toHaveLength(0);
    });

    it('should reject invalid search return types', () => {
      const result = validateSearchReturnTypes(['invalid-type', 'another-invalid']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('searchReturnTypes');
      expect(result[0].message).toContain('Invalid search return types: invalid-type, another-invalid');
    });
  });

  describe('validateDeletionPermissions Function', () => {
    it('should reject non-array deletionPermissions', () => {
      const result = validateDeletionPermissions('not-an-array');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: 'deletionPermissions',
        message: 'Deletion Permissions must be an array'
      });
    });

    it('should validate valid deletion permissions', () => {
      const result = validateDeletionPermissions(['indicators', 'observables']);
      expect(result).toHaveLength(0);
    });

    it('should validate valid deletion permissions with value property', () => {
      const result = validateDeletionPermissions([
        { value: 'indicators' },
        { value: 'observables' }
      ]);
      expect(result).toHaveLength(0);
    });

    it('should reject invalid deletion permissions', () => {
      const result = validateDeletionPermissions(['invalid-permission']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('deletionPermissions');
      expect(result[0].message).toContain('Invalid deletion permissions: invalid-permission');
    });
  });

  describe('validateFieldRestrictions Function', () => {
    it('should reject non-array fieldRestrictions', () => {
      const result = validateFieldRestrictions('not-an-array');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: 'submissionFieldRestrictions',
        message: 'Field Submission Restrictions must be an array'
      });
    });

    it('should validate valid field restrictions', () => {
      const result = validateFieldRestrictions(['score_required', 'description_disabled']);
      expect(result).toHaveLength(0);
    });

    it('should reject invalid field restrictions', () => {
      const result = validateFieldRestrictions(['invalid_restriction']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('submissionFieldRestrictions');
      expect(result[0].message).toContain('Invalid field restrictions: invalid_restriction');
    });

    it('should detect conflicting field restrictions', () => {
      const result = validateFieldRestrictions(['score_required', 'score_disabled']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('submissionFieldRestrictions');
      expect(result[0].message).toContain('Conflicting field restrictions: cannot have both score_required and score_disabled');
    });

    it('should detect multiple conflicting pairs', () => {
      const result = validateFieldRestrictions([
        'score_required', 'score_disabled',
        'description_required', 'description_disabled'
      ]);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('validateDefaultValues Function', () => {
    it('should reject non-array defaultValues', () => {
      const result = validateDefaultValues('not-an-array');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: 'defaultSubmissionValues',
        message: 'Default Submission Values must be an array'
      });
    });

    it('should validate valid default values', () => {
      const result = validateDefaultValues(['score_50', 'confidence_medium']);
      expect(result).toHaveLength(0);
    });

    it('should reject invalid default values', () => {
      const result = validateDefaultValues(['invalid_default']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('defaultSubmissionValues');
      expect(result[0].message).toContain('Invalid default values: invalid_default');
    });

    it('should reject multiple score defaults', () => {
      const result = validateDefaultValues(['score_25', 'score_50']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('defaultSubmissionValues');
      expect(result[0].message).toBe('Only one default score value can be selected');
    });

    it('should reject multiple confidence defaults', () => {
      const result = validateDefaultValues(['confidence_low', 'confidence_high']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('defaultSubmissionValues');
      expect(result[0].message).toBe('Only one default confidence value can be selected');
    });
  });

  describe('validateSearchBehavior Function', () => {
    it('should reject non-array searchBehavior', () => {
      const result = validateSearchBehavior('not-an-array');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: 'searchBehavior',
        message: 'Search Behavior Options must be an array'
      });
    });

    it('should validate valid search behaviors', () => {
      const result = validateSearchBehavior(['case_sensitive', 'exact_match_only']);
      expect(result).toHaveLength(0);
    });

    it('should reject invalid search behaviors', () => {
      const result = validateSearchBehavior(['invalid_behavior']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('searchBehavior');
      expect(result[0].message).toContain('Invalid search behaviors: invalid_behavior');
    });

    it('should detect conflicting sort options', () => {
      const result = validateSearchBehavior(['sort_by_date', 'sort_by_score']);
      
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('searchBehavior');
      expect(result[0].message).toBe('Cannot sort by both date and score - please select only one sort option');
    });
  });

  describe('isDeletionAllowed Function', () => {
    it('should return false for null options', () => {
      const result = isDeletionAllowed(null, 'indicator');
      expect(result).toBe(false);
    });

    it('should return false for undefined options', () => {
      const result = isDeletionAllowed(undefined, 'indicator');
      expect(result).toBe(false);
    });

    it('should return false when deletionPermissions is missing', () => {
      const options = {};
      const result = isDeletionAllowed(options, 'indicator');
      expect(result).toBe(false);
    });

    it('should return false when deletionPermissions is not an array', () => {
      const options = { deletionPermissions: 'not-an-array' };
      const result = isDeletionAllowed(options, 'indicator');
      expect(result).toBe(false);
    });

    it('should return true when item type is in deletion permissions', () => {
      const options = { deletionPermissions: ['indicators'] };
      const result = isDeletionAllowed(options, 'indicator');
      expect(result).toBe(true);
    });

    it('should return true when item type is in deletion permissions (with value property)', () => {
      const options = { deletionPermissions: [{ value: 'indicators' }] };
      const result = isDeletionAllowed(options, 'indicator');
      expect(result).toBe(true);
    });

    it('should return false when item type is not in deletion permissions', () => {
      const options = { deletionPermissions: ['observables'] };
      const result = isDeletionAllowed(options, 'indicator');
      expect(result).toBe(false);
    });

    it('should handle both indicators and observables', () => {
      const options = { deletionPermissions: ['indicators', 'observables'] };
      expect(isDeletionAllowed(options, 'indicator')).toBe(true);
      expect(isDeletionAllowed(options, 'observable')).toBe(true);
    });
  });

  describe('getPermissionsForItemType Function', () => {
    it('should return permissions object with canDelete based on isDeletionAllowed', () => {
      const options = { deletionPermissions: ['indicators'] };
      const result = getPermissionsForItemType(options, 'indicator');
      
      expect(result).toEqual({
        canDelete: true,
        canEdit: true,
        canView: true
      });
    });

    it('should return false for canDelete when not allowed', () => {
      const options = { deletionPermissions: ['observables'] };
      const result = getPermissionsForItemType(options, 'indicator');
      
      expect(result).toEqual({
        canDelete: false,
        canEdit: true,
        canView: true
      });
    });
  });

  describe('hasAnyDeletionPermissions Function', () => {
    it('should return true when user can delete indicators', () => {
      const options = { deletionPermissions: ['indicators'] };
      const result = hasAnyDeletionPermissions(options);
      expect(result).toBe(true);
    });

    it('should return true when user can delete observables', () => {
      const options = { deletionPermissions: ['observables'] };
      const result = hasAnyDeletionPermissions(options);
      expect(result).toBe(true);
    });

    it('should return true when user can delete both', () => {
      const options = { deletionPermissions: ['indicators', 'observables'] };
      const result = hasAnyDeletionPermissions(options);
      expect(result).toBe(true);
    });

    it('should return false when user cannot delete anything', () => {
      const options = { deletionPermissions: [] };
      const result = hasAnyDeletionPermissions(options);
      expect(result).toBe(false);
    });

    it('should return false for null options', () => {
      const result = hasAnyDeletionPermissions(null);
      expect(result).toBe(false);
    });
  });
}); 