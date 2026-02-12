import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip auth header for login/register/refresh endpoints
  if (
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh')
  ) {
    return next(req);
  }

  const token = authService.getAccessToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        return authService.refreshAccessToken().pipe(
          switchMap((tokens) => {
            if (tokens) {
              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                },
              });
              return next(newReq);
            }
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
