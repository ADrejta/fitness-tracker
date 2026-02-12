import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WorkoutService } from '../../core/services';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="nav">
      @for (item of navItems; track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="nav__item--active"
          [routerLinkActiveOptions]="{ exact: item.path === '/' }"
          class="nav__item"
        >
          <span class="nav__icon" [innerHTML]="item.icon"></span>
          <span class="nav__label">{{ item.label }}</span>
        </a>
      }
      <button
        class="nav__item nav__item--primary"
        [class.nav__item--active]="workoutService.hasActiveWorkout()"
        (click)="handleWorkoutClick()"
      >
        <span class="nav__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </span>
        <span class="nav__label">{{ workoutService.hasActiveWorkout() ? 'Continue' : 'Start' }}</span>
      </button>
    </nav>
  `,
  styles: [`
    .nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: var(--z-sticky);
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: var(--nav-height);
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      padding: 0 var(--spacing-sm);
      padding-bottom: env(safe-area-inset-bottom, 0);

      @media (min-width: 1024px) {
        display: none;
      }
    }

    .nav__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-width: 4rem;
      padding: var(--spacing-xs);
      color: var(--color-text-tertiary);
      text-decoration: none;
      border: none;
      background: none;
      cursor: pointer;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-text-secondary);
      }

      &--active {
        color: var(--color-primary-600);
      }

      &--primary {
        position: relative;
        color: var(--color-primary-600);

        .nav__icon {
          background: var(--color-primary-600);
          color: white;
          border-radius: var(--radius-full);
          padding: var(--spacing-xs);
        }

        &.nav__item--active .nav__icon {
          background: var(--color-success-600);
          animation: pulse-ring 2s infinite;
        }
      }
    }

    .nav__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;

      ::ng-deep svg {
        width: 20px;
        height: 20px;
      }
    }

    .nav__label {
      font-size: 10px;
      font-weight: var(--font-weight-medium);
    }

    @keyframes pulse-ring {
      0% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      }
    }
  `]
})
export class NavigationComponent {
  workoutService = inject(WorkoutService);

  navItems: NavItem[] = [
    {
      path: '/',
      label: 'Home',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`
    },
    {
      path: '/history',
      label: 'History',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
    },
    {
      path: '/statistics',
      label: 'Stats',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`
    },
    {
      path: '/exercises',
      label: 'Exercises',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.4 14.4 9.6 9.6"></path><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"></path><path d="m21.5 21.5-1.4-1.4"></path><path d="M3.9 3.9 2.5 2.5"></path><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"></path></svg>`
    }
  ];

  handleWorkoutClick(): void {
    if (this.workoutService.hasActiveWorkout()) {
      window.location.href = '/workout';
    } else {
      window.location.href = '/workout?start=true';
    }
  }
}
