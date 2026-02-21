import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly activeCount = signal(0);
  readonly isLoading = computed(() => this.activeCount() > 0);

  increment(): void {
    this.activeCount.update(n => n + 1);
  }

  decrement(): void {
    this.activeCount.update(n => Math.max(0, n - 1));
  }
}
