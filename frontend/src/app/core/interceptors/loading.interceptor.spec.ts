import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { loadingInterceptor } from './loading.interceptor';
import { LoadingService } from '../services/loading.service';

describe('loadingInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loadingService: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    loadingService = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sets isLoading to true while a request is in flight', () => {
    http.get('/api/test').subscribe();

    expect(loadingService.isLoading()).toBe(true);

    httpMock.expectOne('/api/test').flush({});
  });

  it('sets isLoading to false after a successful request completes', () => {
    http.get('/api/test').subscribe();
    httpMock.expectOne('/api/test').flush({ ok: true });

    expect(loadingService.isLoading()).toBe(false);
  });

  it('sets isLoading to false after a failed request', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    httpMock
      .expectOne('/api/test')
      .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(loadingService.isLoading()).toBe(false);
  });

  it('stays loading while multiple concurrent requests are in flight', () => {
    http.get('/api/one').subscribe();
    http.get('/api/two').subscribe();

    expect(loadingService.isLoading()).toBe(true);

    httpMock.expectOne('/api/one').flush({});
    expect(loadingService.isLoading()).toBe(true); // second request still pending

    httpMock.expectOne('/api/two').flush({});
    expect(loadingService.isLoading()).toBe(false);
  });

  it('returns to false when one of mixed success/error requests finishes last', () => {
    http.get('/api/ok').subscribe();
    http.get('/api/fail').subscribe({ error: () => {} });

    httpMock.expectOne('/api/ok').flush({});
    expect(loadingService.isLoading()).toBe(true);

    httpMock
      .expectOne('/api/fail')
      .flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(loadingService.isLoading()).toBe(false);
  });
});
