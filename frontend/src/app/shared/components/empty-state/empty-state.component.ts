import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      @if (icon) {
        <div class="empty-state__icon">
          <ng-content select="[empty-icon]"></ng-content>
        </div>
      }
      <h3 class="empty-state__title">{{ title }}</h3>
      @if (description) {
        <p class="empty-state__description">{{ description }}</p>
      }
      <div class="empty-state__action">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--spacing-2xl);
      color: var(--color-text-secondary);

      &__icon {
        width: 4rem;
        height: 4rem;
        margin-bottom: var(--spacing-md);
        color: var(--color-text-tertiary);

        ::ng-deep svg {
          width: 100%;
          height: 100%;
        }
      }

      &__title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin: 0 0 var(--spacing-xs);
      }

      &__description {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0 0 var(--spacing-lg);
        max-width: 280px;
      }

      &__action {
        display: flex;
        gap: var(--spacing-sm);
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() icon = true;
}
