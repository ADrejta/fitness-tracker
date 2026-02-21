import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  it('starts as not loading', () => {
    expect(service.isLoading()).toBe(false);
  });

  it('is loading after increment', () => {
    service.increment();
    expect(service.isLoading()).toBe(true);
  });

  it('is not loading after increment then decrement', () => {
    service.increment();
    service.decrement();
    expect(service.isLoading()).toBe(false);
  });

  it('stays loading while multiple requests are in flight', () => {
    service.increment();
    service.increment();
    service.decrement();
    expect(service.isLoading()).toBe(true);

    service.decrement();
    expect(service.isLoading()).toBe(false);
  });

  it('handles excess decrements without going below zero', () => {
    service.increment();
    service.decrement();
    service.decrement(); // excess — should be a no-op
    expect(service.isLoading()).toBe(false);

    // A single increment must bring it back to true (count is 1, not -1)
    service.increment();
    expect(service.isLoading()).toBe(true);
  });

  it('decrement when already at zero keeps isLoading false', () => {
    service.decrement();
    expect(service.isLoading()).toBe(false);
  });
});
