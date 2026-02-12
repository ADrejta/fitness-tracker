import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'info', duration = 3000): string {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, message, duration };

    this._toasts.update((current) => [...current, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  success(message: string, duration = 3000): string {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): string {
    return this.show(message, 'error', duration);
  }

  warning(message: string, duration = 4000): string {
    return this.show(message, 'warning', duration);
  }

  info(message: string, duration = 3000): string {
    return this.show(message, 'info', duration);
  }

  remove(id: string): void {
    this._toasts.update((current) => current.filter((t) => t.id !== id));
  }

  clear(): void {
    this._toasts.set([]);
  }
}
