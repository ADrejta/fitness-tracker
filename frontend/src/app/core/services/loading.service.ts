import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeCount = 0;
  private _isLoading = signal(false);
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAFETY_TIMEOUT = 15_000;
  readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    // Reset stuck loading state when page regains visibility (e.g., iOS swipe refresh)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.activeCount > 0) {
        this.reset();
      }
    });
  }

  increment(): void {
    this.activeCount++;
    this._isLoading.set(true);
    this.startSafetyTimer();
  }

  decrement(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount === 0) {
      this._isLoading.set(false);
      this.clearSafetyTimer();
    }
  }

  reset(): void {
    this.activeCount = 0;
    this._isLoading.set(false);
    this.clearSafetyTimer();
  }

  private startSafetyTimer(): void {
    this.clearSafetyTimer();
    this.safetyTimer = setTimeout(() => {
      if (this.activeCount > 0) {
        this.reset();
      }
    }, this.SAFETY_TIMEOUT);
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}
