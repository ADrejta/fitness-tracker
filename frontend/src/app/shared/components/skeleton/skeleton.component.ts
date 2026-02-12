import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skeleton"
      [class.skeleton--text]="variant === 'text'"
      [class.skeleton--title]="variant === 'title'"
      [class.skeleton--avatar]="variant === 'avatar'"
      [class.skeleton--card]="variant === 'card'"
      [style.width]="width"
      [style.height]="height"
    >
      @if (variant === 'card') {
        <div class="skeleton__card-content">
          <div class="skeleton__line skeleton__line--title"></div>
          <div class="skeleton__line skeleton__line--text"></div>
          <div class="skeleton__line skeleton__line--text skeleton__line--short"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--color-background-secondary) 25%,
        var(--color-surface) 50%,
        var(--color-background-secondary) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-md);
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton--text {
      height: 1rem;
      width: 100%;
    }

    .skeleton--title {
      height: 1.5rem;
      width: 60%;
    }

    .skeleton--avatar {
      width: 3rem;
      height: 3rem;
      border-radius: var(--radius-full);
    }

    .skeleton--card {
      padding: var(--spacing-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      min-height: 120px;
    }

    .skeleton__card-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .skeleton__line {
      height: 1rem;
      background: linear-gradient(
        90deg,
        var(--color-background-secondary) 25%,
        var(--color-border) 50%,
        var(--color-background-secondary) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);
    }

    .skeleton__line--title {
      width: 50%;
      height: 1.25rem;
      margin-bottom: var(--spacing-xs);
    }

    .skeleton__line--text {
      width: 100%;
    }

    .skeleton__line--short {
      width: 40%;
    }
  `]
})
export class SkeletonComponent {
  @Input() variant: 'text' | 'title' | 'avatar' | 'card' = 'text';
  @Input() width?: string;
  @Input() height?: string;
}
