import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _activeRequests = 0;
  private _loading$ = new BehaviorSubject<boolean>(false);

  readonly isLoading$ = this._loading$.asObservable();

  increment(): void {
    this._activeRequests++;
    this._loading$.next(true);
  }

  decrement(): void {
    this._activeRequests = Math.max(0, this._activeRequests - 1);
    this._loading$.next(this._activeRequests > 0);
  }
}
