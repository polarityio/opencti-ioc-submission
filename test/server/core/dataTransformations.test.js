const dataTransformations = require('../../../server/core/dataTransformations');

describe('Server Data Transformations', () => {
  describe('getKeys', () => {
    test('should extract specified keys from array of objects', () => {
      const items = [
        { id: 1, name: 'test1', value: 'value1' },
        { id: 2, name: 'test2', value: 'value2' }
      ];
      const keys = ['id', 'name'];
      
      const result = dataTransformations.getKeys(keys, items);
      
      expect(result).toEqual([
        { id: 1, name: 'test1' },
        { id: 2, name: 'test2' }
      ]);
    });

    test('should extract specified keys from single object', () => {
      const item = { id: 1, name: 'test', value: 'value' };
      const keys = ['id', 'name'];
      
      const result = dataTransformations.getKeys(keys, item);
      
      expect(result).toEqual({ id: 1, name: 'test' });
    });

    test('should handle empty array', () => {
      const result = dataTransformations.getKeys(['id'], []);
      expect(result).toEqual([]);
    });

    test('should handle missing keys', () => {
      const items = [{ id: 1, name: 'test' }];
      const keys = ['id', 'missing'];
      
      const result = dataTransformations.getKeys(keys, items);
      
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('groupEntities', () => {
    test('should group IP entities correctly', () => {
      const entities = [
        { isIP: true, isDomain: false, type: 'IPv4' },
        { isIP: true, isDomain: false, type: 'IPv6' }
      ];
      
      const result = dataTransformations.groupEntities(entities);
      
      expect(result.ip).toHaveLength(2);
    });

    test('should group domain entities correctly', () => {
      const entities = [
        { isIP: false, isDomain: true, type: 'domain' }
      ];
      
      const result = dataTransformations.groupEntities(entities);
      
      expect(result.domain).toHaveLength(1);
    });

    test('should group hash entities correctly', () => {
      const entities = [
        { isIP: false, isDomain: false, type: 'MD5' },
        { isIP: false, isDomain: false, type: 'SHA1' },
        { isIP: false, isDomain: false, type: 'SHA256' }
      ];
      
      const result = dataTransformations.groupEntities(entities);
      
      expect(result.md5).toHaveLength(1);
      expect(result.sha1).toHaveLength(1);
      expect(result.sha256).toHaveLength(1);
    });

    test('should group MAC entities correctly', () => {
      const entities = [
        { isIP: false, isDomain: false, type: 'MAC' }
      ];
      
      const result = dataTransformations.groupEntities(entities);
      
      expect(result.mac).toHaveLength(1);
    });

    test('should exclude unknown types', () => {
      const entities = [
        { isIP: false, isDomain: false, type: 'unknown' },
        { isIP: true, isDomain: false, type: 'IPv4' }
      ];
      
      const result = dataTransformations.groupEntities(entities);
      
      expect(result.unknown).toBeUndefined();
      expect(result.ip).toHaveLength(1);
    });

    test('should handle empty entities array', () => {
      const result = dataTransformations.groupEntities([]);
      expect(result).toEqual({});
    });
  });

  describe('splitOutIgnoredIps', () => {
    test('should separate ignored IPs from other entities', () => {
      const entities = [
        { isIP: true, value: '127.0.0.1' },
        { isIP: true, value: '192.168.1.1' },
        { isIP: false, isDomain: true, value: 'example.com' }
      ];
      
      const result = dataTransformations.splitOutIgnoredIps(entities);
      
      expect(result.entitiesPartition).toHaveLength(2);
      expect(result.ignoredIpLookupResults).toHaveLength(1);
      expect(result.ignoredIpLookupResults[0].entity.value).toBe('127.0.0.1');
    });

    test('should handle all ignored IPs', () => {
      const entities = [
        { isIP: true, value: '127.0.0.1' },
        { isIP: true, value: '255.255.255.255' },
        { isIP: true, value: '0.0.0.0' }
      ];
      
      const result = dataTransformations.splitOutIgnoredIps(entities);
      
      expect(result.entitiesPartition).toBeUndefined();
      expect(result.ignoredIpLookupResults).toHaveLength(3);
    });

    test('should handle no ignored IPs', () => {
      const entities = [
        { isIP: true, value: '192.168.1.1' },
        { isIP: false, isDomain: true, value: 'example.com' }
      ];
      
      const result = dataTransformations.splitOutIgnoredIps(entities);
      
      expect(result.entitiesPartition).toHaveLength(2);
      expect(result.ignoredIpLookupResults).toHaveLength(0);
    });

    test('should handle non-IP entities', () => {
      const entities = [
        { isIP: false, isDomain: true, value: 'example.com' },
        { isIP: false, isDomain: false, type: 'MD5', value: 'hash' }
      ];
      
      const result = dataTransformations.splitOutIgnoredIps(entities);
      
      expect(result.entitiesPartition).toHaveLength(2);
      expect(result.ignoredIpLookupResults).toHaveLength(0);
    });

    test('should handle empty entities array', () => {
      const result = dataTransformations.splitOutIgnoredIps([]);
      
      expect(result.entitiesPartition).toBeUndefined();
      expect(result.ignoredIpLookupResults).toHaveLength(0);
    });
  });

  describe('Module Exports', () => {
    test('should export all required functions', () => {
      expect(dataTransformations).toHaveProperty('getKeys');
      expect(dataTransformations).toHaveProperty('groupEntities');
      expect(dataTransformations).toHaveProperty('splitOutIgnoredIps');
    });
  });
}); 