import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeCount = 0;
  private _isLoading = signal(false);
  readonly isLoading = this._isLoading.asReadonly();

  increment(): void {
    this.activeCount++;
    this._isLoading.set(true);
  }

  decrement(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount === 0) {
      this._isLoading.set(false);
    }
  }
}
