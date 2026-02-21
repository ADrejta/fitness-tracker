import { HttpInterceptorFn } from '@angular/common/http';
import { ApplicationRef, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  const appRef = inject(ApplicationRef);
  loadingService.increment();
  return next(req).pipe(
    finalize(() => {
      loadingService.decrement();
      appRef.tick();
    })
  );
};
