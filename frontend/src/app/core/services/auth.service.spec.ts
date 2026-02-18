import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService, AuthResponse } from './auth.service';
import { environment } from '../../../environments/environment';

const mockRouter = { navigate: jest.fn() };

const mockAuthResponse: AuthResponse = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  user: { id: 'user-1', email: 'test@example.com' },
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe('initial state (no token)', () => {
    it('isAuthenticated is false', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('user signal is null', () => {
      expect(service.user()).toBeNull();
    });

    it('isLoading starts as false', () => {
      expect(service.isLoading()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Token accessors
  // ---------------------------------------------------------------------------
  describe('getAccessToken / getRefreshToken', () => {
    it('returns null when no tokens are stored', () => {
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });

    it('returns the stored access token', () => {
      localStorage.setItem('fitness_tracker_access_token', 'my-token');
      expect(service.getAccessToken()).toBe('my-token');
    });

    it('returns the stored refresh token', () => {
      localStorage.setItem('fitness_tracker_refresh_token', 'my-refresh');
      expect(service.getRefreshToken()).toBe('my-refresh');
    });
  });

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('POSTs to /auth/login with the provided credentials', () => {
      service.login({ email: 'test@example.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@example.com', password: 'pass' });
      req.flush(mockAuthResponse);
    });

    it('sets isAuthenticated to true on success', () => {
      service.login({ email: 'test@example.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('sets user signal to the returned user on success', () => {
      service.login({ email: 'test@example.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      expect(service.user()).toEqual(mockAuthResponse.user);
    });

    it('saves tokens to localStorage on success', () => {
      service.login({ email: 'test@example.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      expect(localStorage.getItem('fitness_tracker_access_token')).toBe('access-token-123');
      expect(localStorage.getItem('fitness_tracker_refresh_token')).toBe('refresh-token-456');
    });

    it('saves user to localStorage on success', () => {
      service.login({ email: 'test@example.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      const stored = JSON.parse(localStorage.getItem('fitness_tracker_user')!);
      expect(stored).toEqual(mockAuthResponse.user);
    });

    it('sets isLoading to false after a 401 error', fakeAsync(() => {
      service.login({ email: 'x', password: 'y' }).subscribe({ error: () => {} });
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(service.isLoading()).toBe(false);
    }));

    it('does not set isAuthenticated on error', fakeAsync(() => {
      service.login({ email: 'x', password: 'y' }).subscribe({ error: () => {} });
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(service.isAuthenticated()).toBe(false);
    }));
  });

  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('POSTs to /auth/register with the provided credentials', () => {
      service.register({ email: 'new@example.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'new@example.com', password: 'pass' });
      req.flush(mockAuthResponse);
    });

    it('sets isAuthenticated and user on success', () => {
      service.register({ email: 'new@example.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush(mockAuthResponse);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.user()).toEqual(mockAuthResponse.user);
    });
  });

  // ---------------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------------
  describe('logout', () => {
    beforeEach(() => {
      // Get into authenticated state via login
      service.login({ email: 'test@example.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
    });

    it('sets isAuthenticated to false', () => {
      service.logout();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('clears the user signal', () => {
      service.logout();
      expect(service.user()).toBeNull();
    });

    it('removes tokens from localStorage', () => {
      service.logout();
      expect(localStorage.getItem('fitness_tracker_access_token')).toBeNull();
      expect(localStorage.getItem('fitness_tracker_refresh_token')).toBeNull();
    });

    it('navigates to /login', () => {
      service.logout();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  // ---------------------------------------------------------------------------
  // refreshAccessToken
  // ---------------------------------------------------------------------------
  describe('refreshAccessToken', () => {
    it('returns null and triggers logout when there is no refresh token', fakeAsync(() => {
      let result: unknown;
      service.refreshAccessToken().subscribe(r => (result = r));
      tick();
      expect(result).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('POSTs to /auth/refresh with the stored refresh token', () => {
      localStorage.setItem('fitness_tracker_refresh_token', 'my-refresh');
      service.refreshAccessToken().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'my-refresh' });
      req.flush({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    });

    it('saves the new tokens to localStorage on success', () => {
      localStorage.setItem('fitness_tracker_refresh_token', 'my-refresh');
      service.refreshAccessToken().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/refresh`)
        .flush({ accessToken: 'new-access', refreshToken: 'new-refresh' });

      expect(localStorage.getItem('fitness_tracker_access_token')).toBe('new-access');
      expect(localStorage.getItem('fitness_tracker_refresh_token')).toBe('new-refresh');
    });

    it('logs out when the refresh call fails', fakeAsync(() => {
      localStorage.setItem('fitness_tracker_refresh_token', 'bad-token');
      service.refreshAccessToken().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/refresh`)
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    }));
  });
});
