import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast"
          [class]="'toast--' + toast.type"
          (click)="dismiss(toast.id)"
        >
          <div class="toast__icon">
            @switch (toast.type) {
              @case ('success') {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              }
              @case ('error') {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              }
              @case ('warning') {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              }
              @default {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              }
            }
          </div>
          <span class="toast__message">{{ toast.message }}</span>
          <button
            class="toast__close"
            (click)="dismiss(toast.id); $event.stopPropagation()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: calc(var(--nav-height) + var(--spacing-md));
      left: 50%;
      transform: translateX(-50%);
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      max-width: calc(100vw - var(--spacing-lg) * 2);
      width: 400px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      cursor: pointer;
      animation: slideUp 0.2s ease-out;
      pointer-events: auto;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(1rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .toast__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .toast__message {
      flex: 1;
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .toast__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--color-text-tertiary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .toast__close:hover {
      background: var(--color-background-secondary);
      color: var(--color-text-secondary);
    }

    .toast--success {
      border-left: 3px solid var(--color-success-500);
    }
    .toast--success .toast__icon {
      color: var(--color-success-600);
    }

    .toast--error {
      border-left: 3px solid var(--color-danger-500);
    }
    .toast--error .toast__icon {
      color: var(--color-danger-600);
    }

    .toast--warning {
      border-left: 3px solid var(--color-warning-500);
    }
    .toast--warning .toast__icon {
      color: var(--color-warning-600);
    }

    .toast--info {
      border-left: 3px solid var(--color-primary-500);
    }
    .toast--info .toast__icon {
      color: var(--color-primary-600);
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  dismiss(id: string): void {
    this.toastService.remove(id);
  }
}
