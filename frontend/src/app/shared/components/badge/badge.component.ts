import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses">
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: var(--font-weight-medium);
      border-radius: var(--radius-full);
      white-space: nowrap;

      // Sizes
      &--sm {
        padding: 0.125rem 0.5rem;
        font-size: var(--font-size-xs);
      }

      &--md {
        padding: 0.25rem 0.625rem;
        font-size: var(--font-size-sm);
      }

      // Variants
      &--default {
        background: var(--color-gray-100);
        color: var(--color-gray-700);
      }

      &--primary {
        background: var(--color-primary-100);
        color: var(--color-primary-700);
      }

      &--success {
        background: var(--color-success-100);
        color: var(--color-success-700);
      }

      &--warning {
        background: var(--color-warning-100);
        color: var(--color-warning-700);
      }

      &--danger {
        background: var(--color-danger-100);
        color: var(--color-danger-700);
      }

      &--info {
        background: var(--color-primary-50);
        color: var(--color-primary-600);
      }

      &--pill {
        border-radius: var(--radius-full);
      }

      &--outline {
        background: transparent;
        border: 1px solid currentColor;

        &.badge--default {
          border-color: var(--color-gray-300);
          color: var(--color-gray-600);
        }

        &.badge--primary {
          border-color: var(--color-primary-300);
          color: var(--color-primary-600);
        }

        &.badge--success {
          border-color: var(--color-success-300);
          color: var(--color-success-600);
        }

        &.badge--warning {
          border-color: var(--color-warning-300);
          color: var(--color-warning-600);
        }

        &.badge--danger {
          border-color: var(--color-danger-300);
          color: var(--color-danger-600);
        }
      }
    }
  `]
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';
  @Input() size: BadgeSize = 'md';
  @Input() pill = true;
  @Input() outline = false;

  get badgeClasses(): string {
    const classes = [
      'badge',
      `badge--${this.variant}`,
      `badge--${this.size}`
    ];

    if (this.pill) classes.push('badge--pill');
    if (this.outline) classes.push('badge--outline');

    return classes.join(' ');
  }
}
