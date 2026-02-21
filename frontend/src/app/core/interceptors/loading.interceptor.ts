import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  loadingService.increment();
  try {
    return next(req).pipe(finalize(() => loadingService.decrement()));
  } catch (err) {
    loadingService.decrement();
    throw err;
  }
};
