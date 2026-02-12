import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div
          class="modal"
          [class.modal--sm]="size === 'sm'"
          [class.modal--lg]="size === 'lg'"
          [class.modal--full]="size === 'full'"
          role="dialog"
          aria-modal="true"
        >
          @if (showHeader) {
            <div class="modal__header">
              <h2 class="modal__title">{{ title }}</h2>
              @if (showCloseButton) {
                <button
                  type="button"
                  class="modal__close"
                  (click)="close()"
                  aria-label="Close modal"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              }
            </div>
          }
          <div class="modal__body" [class.modal__body--no-padding]="noPadding">
            <ng-content></ng-content>
          </div>
          @if (showFooter) {
            <div class="modal__footer">
              <ng-content select="[modal-footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal-backdrop);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-md);
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease-out;
    }

    .modal {
      position: relative;
      z-index: var(--z-modal);
      width: 100%;
      max-width: 500px;
      max-height: calc(100vh - 2rem);
      max-height: calc(100dvh - 2rem);
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.2s ease-out;

      &--sm {
        max-width: 400px;
      }

      &--lg {
        max-width: 700px;
      }

      &--full {
        max-width: calc(100vw - 2rem);
        max-height: calc(100vh - 2rem);
        max-height: calc(100dvh - 2rem);
      }
    }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--color-border-light);
      flex-shrink: 0;
    }

    .modal__title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin: 0;
    }

    .modal__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-background-secondary);
        color: var(--color-text);
      }
    }

    .modal__body {
      padding: var(--spacing-lg);
      overflow-y: auto;
      flex: 1;

      &--no-padding {
        padding: 0;
      }
    }

    .modal__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-lg);
      border-top: 1px solid var(--color-border-light);
      background: var(--color-background-secondary);
      flex-shrink: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'full' = 'md';
  @Input() showHeader = true;
  @Input() showFooter = false;
  @Input() showCloseButton = true;
  @Input() closeOnOverlayClick = true;
  @Input() closeOnEscape = true;
  @Input() noPadding = false;

  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen && this.closeOnEscape) {
      this.close();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (this.closeOnOverlayClick && event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
