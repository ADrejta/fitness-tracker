import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, BehaviorSubject, skip, take, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'fitness_tracker_access_token';
const REFRESH_TOKEN_KEY = 'fitness_tracker_refresh_token';
const USER_KEY = 'fitness_tracker_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private httpBackend = inject(HttpBackend);
  private router = inject(Router);

  private _user = signal<User | null>(this.loadUser());
  private _isAuthenticated = signal<boolean>(this.hasValidToken());
  private _isLoading = signal<boolean>(false);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor() {
    if (this.hasValidToken()) {
      this.loadCurrentUser();
    }
  }

  private loadUser(): User | null {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  private hasValidToken(): boolean {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  private saveUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private clearAuth(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this._isAuthenticated.set(false);
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, request)
      .pipe(
        tap((response) => {
          this.saveTokens(response.accessToken, response.refreshToken);
          this.saveUser(response.user);
          this._isAuthenticated.set(true);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._isLoading.set(false);
          throw error;
        })
      );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(
        tap((response) => {
          this.saveTokens(response.accessToken, response.refreshToken);
          this.saveUser(response.user);
          this._isAuthenticated.set(true);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._isLoading.set(false);
          throw error;
        })
      );
  }

  logout(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  refreshAccessToken(): Observable<TokenResponse | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return of(null);
    }

    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        skip(1),
        take(1),
        map(token => token ? { accessToken: token, refreshToken: this.getRefreshToken()! } : null)
      );
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject.next(null);

    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((tokens) => {
          this.saveTokens(tokens.accessToken, tokens.refreshToken);
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(tokens.accessToken);
        }),
        catchError((error) => {
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(null);
          this.logout();
          return of(null);
        })
      );
  }

  private loadCurrentUser(): void {
    const token = this.getAccessToken();
    const http = new HttpClient(this.httpBackend);
    http.get<User>(`${environment.apiUrl}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: (user) => {
        this.saveUser(user);
        this._isAuthenticated.set(true);
      },
      error: (error) => {
        if (error.status === 401 || error.status === 403) {
          this.clearAuth();
        } else {
          console.warn('Failed to verify user, keeping existing session:', error.status);
        }
      },
    });
  }
}
