import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    jest.useRealTimers();
    service.clear();
  });

  // ---------------------------------------------------------------------------
  // show
  // ---------------------------------------------------------------------------
  describe('show', () => {
    it('adds a toast with the given message and type', () => {
      service.show('Hello', 'success');
      expect(service.toasts()).toHaveLength(1);
      expect(service.toasts()[0]).toMatchObject({ message: 'Hello', type: 'success' });
    });

    it('returns a non-empty id string', () => {
      const id = service.show('Hello');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('defaults to info type', () => {
      service.show('Hello');
      expect(service.toasts()[0].type).toBe('info');
    });

    it('defaults to 3000 ms duration', () => {
      service.show('Hello');
      expect(service.toasts()[0].duration).toBe(3000);
    });

    it('stores the provided duration on the toast object', () => {
      service.show('Hello', 'success', 7000);
      expect(service.toasts()[0].duration).toBe(7000);
    });

    it('auto-removes the toast after its duration', () => {
      jest.useFakeTimers();
      service.show('Bye', 'info', 1000);
      expect(service.toasts()).toHaveLength(1);
      jest.advanceTimersByTime(1000);
      expect(service.toasts()).toHaveLength(0);
    });

    it('does not auto-remove when duration is 0', () => {
      jest.useFakeTimers();
      service.show('Sticky', 'info', 0);
      jest.advanceTimersByTime(60_000);
      expect(service.toasts()).toHaveLength(1);
    });

    it('stacks multiple toasts in order', () => {
      service.show('First', 'info', 0);
      service.show('Second', 'info', 0);
      service.show('Third', 'info', 0);
      const messages = service.toasts().map(t => t.message);
      expect(messages).toEqual(['First', 'Second', 'Third']);
    });

    it('assigns a unique id to each toast', () => {
      service.show('A', 'info', 0);
      service.show('B', 'info', 0);
      service.show('C', 'info', 0);
      const ids = service.toasts().map(t => t.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Convenience shortcuts
  // ---------------------------------------------------------------------------
  describe('success / error / warning / info shortcuts', () => {
    it('success() uses type "success" and default duration 3000', () => {
      service.success('Done!');
      expect(service.toasts()[0]).toMatchObject({ type: 'success', duration: 3000, message: 'Done!' });
    });

    it('error() uses type "error" and default duration 5000', () => {
      service.error('Oops!');
      expect(service.toasts()[0]).toMatchObject({ type: 'error', duration: 5000 });
    });

    it('warning() uses type "warning" and default duration 4000', () => {
      service.warning('Careful!');
      expect(service.toasts()[0]).toMatchObject({ type: 'warning', duration: 4000 });
    });

    it('info() uses type "info" and default duration 3000', () => {
      service.info('FYI');
      expect(service.toasts()[0]).toMatchObject({ type: 'info', duration: 3000 });
    });

    it('shortcuts accept a custom duration override', () => {
      service.success('Quick', 500);
      expect(service.toasts()[0].duration).toBe(500);
    });

    it('shortcuts return the toast id', () => {
      const id = service.success('Done!');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('removes the toast with the matching id', () => {
      const id = service.show('Remove me', 'info', 0);
      service.remove(id);
      expect(service.toasts()).toHaveLength(0);
    });

    it('removes only the matching toast, leaving others intact', () => {
      service.show('Keep', 'info', 0);
      const id = service.show('Remove me', 'info', 0);
      service.show('Also keep', 'info', 0);
      service.remove(id);
      expect(service.toasts()).toHaveLength(2);
      expect(service.toasts().map(t => t.message)).toEqual(['Keep', 'Also keep']);
    });

    it('is a no-op for an id that does not exist', () => {
      service.show('Hello', 'info', 0);
      service.remove('nonexistent-id');
      expect(service.toasts()).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------
  describe('clear', () => {
    it('empties all toasts', () => {
      service.show('A', 'info', 0);
      service.show('B', 'info', 0);
      service.show('C', 'info', 0);
      service.clear();
      expect(service.toasts()).toHaveLength(0);
    });

    it('is safe to call when there are no toasts', () => {
      expect(() => service.clear()).not.toThrow();
      expect(service.toasts()).toHaveLength(0);
    });
  });
});
