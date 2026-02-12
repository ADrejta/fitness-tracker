import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [class]="buttonClasses"
      [disabled]="disabled || loading"
      (click)="handleClick($event)"
    >
      @if (loading) {
        <span class="btn__spinner"></span>
      }
      @if (iconLeft && !loading) {
        <span class="btn__icon btn__icon--left">
          <ng-content select="[icon-left]"></ng-content>
        </span>
      }
      <span class="btn__text">
        <ng-content></ng-content>
      </span>
      @if (iconRight) {
        <span class="btn__icon btn__icon--right">
          <ng-content select="[icon-right]"></ng-content>
        </span>
      }
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      font-family: var(--font-family);
      font-weight: var(--font-weight-medium);
      border-radius: var(--radius-lg);
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;

      &:focus-visible {
        outline: 2px solid var(--color-primary-500);
        outline-offset: 2px;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      // Sizes
      &--sm {
        padding: 0.375rem 0.75rem;
        font-size: var(--font-size-sm);
        min-height: 2rem;
      }

      &--md {
        padding: 0.5rem 1rem;
        font-size: var(--font-size-base);
        min-height: 2.5rem;
      }

      &--lg {
        padding: 0.75rem 1.5rem;
        font-size: var(--font-size-lg);
        min-height: 3rem;
      }

      // Variants
      &--primary {
        background: var(--color-primary-600);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-primary-700);
        }

        &:active:not(:disabled) {
          background: var(--color-primary-800);
        }
      }

      &--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);

        &:hover:not(:disabled) {
          background: var(--color-background-secondary);
          border-color: var(--color-gray-400);
        }

        &:active:not(:disabled) {
          background: var(--color-background-tertiary);
        }
      }

      &--ghost {
        background: transparent;
        color: var(--color-text);

        &:hover:not(:disabled) {
          background: var(--color-background-secondary);
        }

        &:active:not(:disabled) {
          background: var(--color-background-tertiary);
        }
      }

      &--danger {
        background: var(--color-danger-600);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-danger-700);
        }

        &:active:not(:disabled) {
          background: var(--color-danger-800);
        }
      }

      &--success {
        background: var(--color-success-600);
        color: white;

        &:hover:not(:disabled) {
          background: var(--color-success-700);
        }

        &:active:not(:disabled) {
          background: var(--color-success-800);
        }
      }

      &--full-width {
        width: 100%;
      }

      &--icon-only {
        padding: 0;
        aspect-ratio: 1;

        &.btn--sm { width: 2rem; }
        &.btn--md { width: 2.5rem; }
        &.btn--lg { width: 3rem; }

        .btn__text {
          display: none;
        }
      }
    }

    .btn__spinner {
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .btn__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125em;

      ::ng-deep svg {
        width: 1em;
        height: 1em;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;
  @Input() iconLeft = false;
  @Input() iconRight = false;
  @Input() iconOnly = false;

  @Output() clicked = new EventEmitter<MouseEvent>();

  get buttonClasses(): string {
    const classes = [
      'btn',
      `btn--${this.variant}`,
      `btn--${this.size}`
    ];

    if (this.fullWidth) classes.push('btn--full-width');
    if (this.iconOnly) classes.push('btn--icon-only');

    return classes.join(' ');
  }

  handleClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}
