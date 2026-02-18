import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

const mockRoute = {} as ActivatedRouteSnapshot;
const mockState = {} as RouterStateSnapshot;

const mockRouter = { navigate: jest.fn() };
const mockAuthService = { isAuthenticated: jest.fn() };

describe('authGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('returns true when the user is not authenticated (guest access allowed)', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('returns true when the user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('never navigates away', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});

describe('guestGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('returns true when the user is not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => guestGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('returns false when the user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => guestGuard(mockRoute, mockState));
    expect(result).toBe(false);
  });

  it('navigates to / when the user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    TestBed.runInInjectionContext(() => guestGuard(mockRoute, mockState));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('does not navigate when the user is not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    TestBed.runInInjectionContext(() => guestGuard(mockRoute, mockState));
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
