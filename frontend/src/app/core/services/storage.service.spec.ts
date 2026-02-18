import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

const PREFIX = 'fitness_tracker_';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe('get', () => {
    it('returns the default value when the key does not exist', () => {
      expect(service.get('missing', 'default')).toBe('default');
    });

    it('returns the default value when the key is present but JSON is malformed', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(`${PREFIX}bad`, 'not { valid json');
      expect(service.get('bad', 'fallback')).toBe('fallback');
    });

    it('returns a stored string', () => {
      localStorage.setItem(`${PREFIX}greeting`, JSON.stringify('hello'));
      expect(service.get('greeting', '')).toBe('hello');
    });

    it('returns a stored object', () => {
      localStorage.setItem(`${PREFIX}user`, JSON.stringify({ id: 1, name: 'Alice' }));
      expect(service.get('user', null)).toEqual({ id: 1, name: 'Alice' });
    });

    it('returns a stored array', () => {
      localStorage.setItem(`${PREFIX}items`, JSON.stringify([1, 2, 3]));
      expect(service.get('items', [])).toEqual([1, 2, 3]);
    });

    it('returns a stored number', () => {
      localStorage.setItem(`${PREFIX}count`, JSON.stringify(42));
      expect(service.get('count', 0)).toBe(42);
    });

    it('returns a stored boolean', () => {
      localStorage.setItem(`${PREFIX}flag`, JSON.stringify(false));
      expect(service.get('flag', true)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // set
  // ---------------------------------------------------------------------------
  describe('set', () => {
    it('serialises the value under the prefixed key and returns true', () => {
      const result = service.set('myKey', { a: 1 });
      expect(result).toBe(true);
      expect(localStorage.getItem(`${PREFIX}myKey`)).toBe('{"a":1}');
    });

    it('overwrites an existing value', () => {
      service.set('x', 1);
      service.set('x', 2);
      expect(service.get('x', 0)).toBe(2);
    });

    it('round-trips through get correctly', () => {
      const data = { nested: { value: [1, 2, 3] } };
      service.set('complex', data);
      expect(service.get('complex', null)).toEqual(data);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('removes the item from localStorage and returns true', () => {
      localStorage.setItem(`${PREFIX}myKey`, '"value"');
      const result = service.remove('myKey');
      expect(result).toBe(true);
      expect(localStorage.getItem(`${PREFIX}myKey`)).toBeNull();
    });

    it('returns true even when the key did not exist', () => {
      expect(service.remove('nonexistent')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------
  describe('clear', () => {
    it('removes all fitness_tracker_ keys and returns true', () => {
      service.set('a', 1);
      service.set('b', 2);
      const result = service.clear();
      expect(result).toBe(true);
      expect(localStorage.getItem(`${PREFIX}a`)).toBeNull();
      expect(localStorage.getItem(`${PREFIX}b`)).toBeNull();
    });

    it('does not remove keys that do not have the prefix', () => {
      localStorage.setItem('other_app_key', '"keep me"');
      service.set('a', 1);
      service.clear();
      expect(localStorage.getItem('other_app_key')).toBe('"keep me"');
    });
  });

  // ---------------------------------------------------------------------------
  // exportData
  // ---------------------------------------------------------------------------
  describe('exportData', () => {
    it('returns valid JSON', () => {
      service.set('settings', { unit: 'kg' });
      expect(() => JSON.parse(service.exportData())).not.toThrow();
    });

    it('includes all fitness_tracker_ keys without the prefix', () => {
      service.set('settings', { unit: 'kg' });
      service.set('workouts', [{ id: '1' }]);
      const exported = JSON.parse(service.exportData());
      expect(exported['settings']).toEqual({ unit: 'kg' });
      expect(exported['workouts']).toEqual([{ id: '1' }]);
    });

    it('does not include keys from other applications', () => {
      localStorage.setItem('foreign_key', '"irrelevant"');
      service.set('data', 'mine');
      const exported = JSON.parse(service.exportData());
      expect(Object.keys(exported)).not.toContain('foreign_key');
    });

    it('returns an empty object when no data has been stored', () => {
      const exported = JSON.parse(service.exportData());
      expect(exported).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // importData
  // ---------------------------------------------------------------------------
  describe('importData', () => {
    it('stores all keys from the JSON and returns true', () => {
      const result = service.importData(JSON.stringify({ foo: 'bar', count: 42 }));
      expect(result).toBe(true);
      expect(service.get('foo', null)).toBe('bar');
      expect(service.get('count', null)).toBe(42);
    });

    it('returns false and does not throw for invalid JSON', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = service.importData('not valid json {');
      expect(result).toBe(false);
    });

    it('round-trips with exportData', () => {
      service.set('profile', { name: 'Bob', age: 30 });
      const exported = service.exportData();

      service.clear();
      service.importData(exported);

      expect(service.get('profile', null)).toEqual({ name: 'Bob', age: 30 });
    });
  });

  // ---------------------------------------------------------------------------
  // getStorageSize
  // ---------------------------------------------------------------------------
  describe('getStorageSize', () => {
    it('returns 0 used bytes when no fitness_tracker_ keys are stored', () => {
      const { used } = service.getStorageSize();
      expect(used).toBe(0);
    });

    it('returns a positive used value after storing data', () => {
      service.set('data', 'hello world');
      const { used } = service.getStorageSize();
      expect(used).toBeGreaterThan(0);
    });

    it('reports the standard 5 MB available limit', () => {
      const { available } = service.getStorageSize();
      expect(available).toBe(5 * 1024 * 1024);
    });

    it('does not count keys from other applications', () => {
      localStorage.setItem('unrelated', 'x'.repeat(100));
      const { used } = service.getStorageSize();
      expect(used).toBe(0);
    });
  });
});
