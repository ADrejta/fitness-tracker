import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkoutService, AuthService } from '../../core/services';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="header">
      <div class="header__container">
        <a routerLink="/" class="header__logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6.5 6.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0"></path>
            <path d="M2 21v-2a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v2"></path>
            <path d="M15.5 6.5a3.5 3.5 0 1 1-7 0"></path>
            <path d="M6.5 12h11"></path>
            <path d="M6.5 12a2.5 2.5 0 0 0 0 5"></path>
            <path d="M17.5 12a2.5 2.5 0 0 1 0 5"></path>
          </svg>
          <span class="header__title">FitTrack</span>
        </a>

        <div class="header__actions">
          @if (workoutService.hasActiveWorkout()) {
            <a routerLink="/workout" class="header__workout-indicator">
              <span class="header__workout-dot"></span>
              <span>Workout in progress</span>
            </a>
          }

          @if (authService.isAuthenticated()) {
            <div class="header__user">
              <span class="header__user-dot header__user-dot--online"></span>
              <span class="header__user-name">{{ authService.user()?.email }}</span>
            </div>
          } @else {
            <a routerLink="/login" class="header__login-btn">
              Log in
            </a>
          }

          <a routerLink="/settings" class="header__settings" aria-label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </a>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      height: var(--header-height);
    }

    .header__container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      max-width: var(--max-content-width);
      margin: 0 auto;
      padding: 0 var(--spacing-md);
    }

    .header__logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--color-text);
      text-decoration: none;
      font-weight: var(--font-weight-bold);

      svg {
        color: var(--color-primary-600);
      }
    }

    .header__title {
      font-size: var(--font-size-lg);
    }

    .header__actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .header__workout-indicator {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-success-700);
      background: var(--color-success-100);
      border-radius: var(--radius-full);
      text-decoration: none;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-success-200);
      }
    }

    .header__workout-dot {
      width: 8px;
      height: 8px;
      background: var(--color-success-500);
      border-radius: var(--radius-full);
      animation: pulse 2s infinite;
    }

    .header__user {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      border-radius: var(--radius-full);
      text-decoration: none;
      color: var(--color-text-secondary);
      background: var(--color-background-secondary);
    }

    .header__user-name {
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header__login-btn {
      display: flex;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: white;
      background: var(--color-primary-600);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary-700);
      }
    }

    .header__user-dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      flex-shrink: 0;

      &--online {
        background: var(--color-success-500);
      }

      &--offline {
        background: var(--color-text-tertiary);
      }
    }

    .header__settings {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      color: var(--color-text-secondary);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-background-secondary);
        color: var(--color-text);
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `]
})
export class HeaderComponent {
  workoutService = inject(WorkoutService);
  authService = inject(AuthService);
}
