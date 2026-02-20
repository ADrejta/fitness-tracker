import { Injectable, signal, computed, untracked } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _activeRequests = signal(0);
  readonly isLoading = computed(() => this._activeRequests() > 0);

  increment(): void {
    untracked(() => this._activeRequests.update(n => n + 1));
  }

  decrement(): void {
    untracked(() => this._activeRequests.update(n => Math.max(0, n - 1)));
  }
}
