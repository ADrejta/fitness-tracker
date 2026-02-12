import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-wrapper">
      @if (label || showValue) {
        <div class="progress-header">
          @if (label) {
            <span class="progress-label">{{ label }}</span>
          }
          @if (showValue) {
            <span class="progress-value">{{ displayValue }}</span>
          }
        </div>
      }
      <div [class]="trackClasses" role="progressbar" [attr.aria-valuenow]="value" [attr.aria-valuemin]="0" [attr.aria-valuemax]="max">
        <div [class]="barClasses" [style.width.%]="percentage"></div>
      </div>
    </div>
  `,
  styles: [`
    .progress-wrapper {
      width: 100%;
    }

    .progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-xs);
    }

    .progress-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
    }

    .progress-value {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .progress-track {
      width: 100%;
      background: var(--color-gray-200);
      border-radius: var(--radius-full);
      overflow: hidden;

      &--sm {
        height: 0.375rem;
      }

      &--md {
        height: 0.5rem;
      }

      &--lg {
        height: 0.75rem;
      }
    }

    .progress-bar {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.3s ease;

      &--primary {
        background: var(--color-primary-500);
      }

      &--success {
        background: var(--color-success-500);
      }

      &--warning {
        background: var(--color-warning-500);
      }

      &--danger {
        background: var(--color-danger-500);
      }

      &--animated {
        background-image: linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.15) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, 0.15) 50%,
          rgba(255, 255, 255, 0.15) 75%,
          transparent 75%,
          transparent
        );
        background-size: 1rem 1rem;
        animation: progress-animation 1s linear infinite;
      }
    }

    @keyframes progress-animation {
      0% {
        background-position: 1rem 0;
      }
      100% {
        background-position: 0 0;
      }
    }
  `]
})
export class ProgressComponent {
  @Input() value = 0;
  @Input() max = 100;
  @Input() variant: ProgressVariant = 'primary';
  @Input() size: ProgressSize = 'md';
  @Input() label = '';
  @Input() showValue = false;
  @Input() animated = false;
  @Input() valueFormat: 'percentage' | 'fraction' | 'value' = 'percentage';

  get percentage(): number {
    return Math.min(100, Math.max(0, (this.value / this.max) * 100));
  }

  get displayValue(): string {
    switch (this.valueFormat) {
      case 'fraction':
        return `${this.value}/${this.max}`;
      case 'value':
        return `${this.value}`;
      case 'percentage':
      default:
        return `${Math.round(this.percentage)}%`;
    }
  }

  get trackClasses(): string {
    return `progress-track progress-track--${this.size}`;
  }

  get barClasses(): string {
    const classes = [
      'progress-bar',
      `progress-bar--${this.variant}`
    ];

    if (this.animated) classes.push('progress-bar--animated');

    return classes.join(' ');
  }
}
