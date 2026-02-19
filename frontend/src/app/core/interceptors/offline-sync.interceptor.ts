import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SyncQueueService } from '../services/sync-queue.service';
import { ToastService } from '../services/toast.service';

export const offlineSyncInterceptor: HttpInterceptorFn = (req, next) => {
  const syncQueue = inject(SyncQueueService);
  const toast = inject(ToastService);

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isApi = req.url.includes('/api/v1/');
  const isAuth = req.url.includes('/auth/');

  if (!isMutation || !isApi || isAuth) return next(req);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        syncQueue.enqueue({ method: req.method, url: req.url, body: req.body });
        toast.info('Offline — request queued for sync', 4000);
      }
      return throwError(() => error);
    })
  );
};
