import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses">
      @if (hasHeader) {
        <div class="card__header">
          <ng-content select="[card-header]"></ng-content>
        </div>
      }
      <div class="card__body" [class.card__body--no-padding]="noPadding">
        <ng-content></ng-content>
      </div>
      @if (hasFooter) {
        <div class="card__footer">
          <ng-content select="[card-footer]"></ng-content>
        </div>
      }
    </div>
  `,
  styles: [`
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;

      &--raised {
        box-shadow: var(--shadow-sm);
      }

      &--interactive {
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          border-color: var(--color-gray-300);
          box-shadow: var(--shadow-md);
        }
      }

      &--highlight {
        border-color: var(--color-primary-300);
        background: var(--color-primary-50);
      }

      &--compact {
        .card__body {
          padding: var(--spacing-md);
        }
      }
    }

    .card__header {
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid var(--color-border-light);
      background: var(--color-background-secondary);
    }

    .card__body {
      padding: var(--spacing-lg);

      &--no-padding {
        padding: 0;
      }
    }

    .card__footer {
      padding: var(--spacing-md) var(--spacing-lg);
      border-top: 1px solid var(--color-border-light);
      background: var(--color-background-secondary);
    }
  `]
})
export class CardComponent {
  @Input() raised = false;
  @Input() interactive = false;
  @Input() highlight = false;
  @Input() compact = false;
  @Input() noPadding = false;
  @Input() hasHeader = false;
  @Input() hasFooter = false;

  get cardClasses(): string {
    const classes = ['card'];

    if (this.raised) classes.push('card--raised');
    if (this.interactive) classes.push('card--interactive');
    if (this.highlight) classes.push('card--highlight');
    if (this.compact) classes.push('card--compact');

    return classes.join(' ');
  }
}
