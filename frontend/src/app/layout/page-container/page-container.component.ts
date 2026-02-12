import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page" [class.page--full]="fullWidth" [class.page--no-padding]="noPadding">
      <div class="container">
        @if (title) {
          <div class="page-header">
            <h1 class="page-header__title">{{ title }}</h1>
            @if (subtitle) {
              <p class="page-header__subtitle">{{ subtitle }}</p>
            }
          </div>
        }
        <ng-content></ng-content>
      </div>
    </main>
  `,
  styles: [`
    .page {
      padding: var(--spacing-lg) 0;
      padding-bottom: calc(var(--nav-height) + var(--spacing-xl) + env(safe-area-inset-bottom, 0));
      min-height: calc(100vh - var(--header-height));
      min-height: calc(100dvh - var(--header-height));

      @media (min-width: 1024px) {
        padding-bottom: var(--spacing-xl);
      }

      &--full {
        .container {
          max-width: none;
        }
      }

      &--no-padding {
        padding: 0;
        padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 0));

        @media (min-width: 1024px) {
          padding-bottom: 0;
        }
      }
    }
  `]
})
export class PageContainerComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() fullWidth = false;
  @Input() noPadding = false;
}
