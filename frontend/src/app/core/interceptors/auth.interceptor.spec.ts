import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

const mockAuthService = {
  getAccessToken: jest.fn(),
  refreshAccessToken: jest.fn(),
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------------------------------------------------------------------------
  // Auth endpoint bypass — no Authorization header injected
  // ---------------------------------------------------------------------------
  describe('auth endpoint bypass', () => {
    it.each([
      ['http://api.test/auth/login'],
      ['http://api.test/auth/register'],
      ['http://api.test/auth/refresh'],
    ])('does not add Authorization header for %s', (url) => {
      mockAuthService.getAccessToken.mockReturnValue('some-token');
      http.post(url, {}).subscribe();
      const req = httpMock.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('does not call refreshAccessToken on /auth/refresh 401', () => {
      mockAuthService.getAccessToken.mockReturnValue('token');
      http.post('http://api.test/auth/refresh', {}).subscribe({ error: () => {} });
      httpMock
        .expectOne('http://api.test/auth/refresh')
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      expect(mockAuthService.refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Token injection
  // ---------------------------------------------------------------------------
  describe('token injection', () => {
    it('adds Authorization: Bearer header when a token exists', () => {
      mockAuthService.getAccessToken.mockReturnValue('my-access-token');
      http.get('http://api.test/workouts').subscribe();
      const req = httpMock.expectOne('http://api.test/workouts');
      expect(req.request.headers.get('Authorization')).toBe('Bearer my-access-token');
      req.flush([]);
    });

    it('does not add Authorization header when there is no token', () => {
      mockAuthService.getAccessToken.mockReturnValue(null);
      http.get('http://api.test/workouts').subscribe();
      const req = httpMock.expectOne('http://api.test/workouts');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 401 handling — token refresh + retry
  // ---------------------------------------------------------------------------
  describe('401 handling', () => {
    it('calls refreshAccessToken when a 401 is received', () => {
      mockAuthService.getAccessToken.mockReturnValue('expired');
      mockAuthService.refreshAccessToken.mockReturnValue(of(null));

      http.get('http://api.test/workouts').subscribe({ error: () => {} });
      httpMock
        .expectOne('http://api.test/workouts')
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(mockAuthService.refreshAccessToken).toHaveBeenCalled();
    });

    it('retries the request with the new token after a successful refresh', () => {
      mockAuthService.getAccessToken.mockReturnValue('old-token');
      mockAuthService.refreshAccessToken.mockReturnValue(
        of({ accessToken: 'new-token', refreshToken: 'new-refresh' })
      );

      let response: unknown;
      http.get('http://api.test/workouts').subscribe((data) => (response = data));

      httpMock
        .expectOne('http://api.test/workouts')
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      const retryReq = httpMock.expectOne('http://api.test/workouts');
      expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
      retryReq.flush([{ id: 1 }]);

      expect(response).toEqual([{ id: 1 }]);
    });

    it('propagates the original error when refresh returns null', () => {
      mockAuthService.getAccessToken.mockReturnValue('expired');
      mockAuthService.refreshAccessToken.mockReturnValue(of(null));

      let caughtError: unknown;
      http.get('http://api.test/workouts').subscribe({ error: (e) => (caughtError = e) });

      httpMock
        .expectOne('http://api.test/workouts')
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(caughtError).toBeDefined();
    });

    it('does not retry on non-401 errors', () => {
      mockAuthService.getAccessToken.mockReturnValue('token');

      let caughtError: unknown;
      http.get('http://api.test/workouts').subscribe({ error: (e) => (caughtError = e) });

      httpMock
        .expectOne('http://api.test/workouts')
        .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(mockAuthService.refreshAccessToken).not.toHaveBeenCalled();
      expect(caughtError).toBeDefined();
    });

    it('does not retry on 403 errors', () => {
      mockAuthService.getAccessToken.mockReturnValue('token');

      http.get('http://api.test/workouts').subscribe({ error: () => {} });
      httpMock
        .expectOne('http://api.test/workouts')
        .flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(mockAuthService.refreshAccessToken).not.toHaveBeenCalled();
    });
  });
});
