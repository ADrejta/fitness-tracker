import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeCount = 0;
  private _isLoading = signal(false);
  private _isSlowLoading = signal(false);
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAFETY_TIMEOUT = 15_000;
  private readonly SLOW_THRESHOLD = 5_000;
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSlowLoading = this._isSlowLoading.asReadonly();

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
    this.startSlowTimer();
  }

  decrement(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount === 0) {
      this._isLoading.set(false);
      this._isSlowLoading.set(false);
      this.clearSafetyTimer();
      this.clearSlowTimer();
    }
  }

  reset(): void {
    this.activeCount = 0;
    this._isLoading.set(false);
    this._isSlowLoading.set(false);
    this.clearSafetyTimer();
    this.clearSlowTimer();
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

  private startSlowTimer(): void {
    if (this.slowTimer) return; // already waiting
    this.slowTimer = setTimeout(() => {
      if (this.activeCount > 0) {
        this._isSlowLoading.set(true);
      }
    }, this.SLOW_THRESHOLD);
  }

  private clearSlowTimer(): void {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
  }
}
