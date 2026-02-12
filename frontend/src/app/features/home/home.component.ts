import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { ButtonComponent, CardComponent, BadgeComponent, ProgressComponent } from '../../shared/components';
import { WorkoutService, TemplateService, StatisticsService, SettingsService } from '../../core/services';
import { format, isToday, isYesterday } from 'date-fns';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageContainerComponent,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    ProgressComponent
  ],
  template: `
    <app-page-container>
      <!-- Welcome Section -->
      <section class="welcome">
        <h1 class="welcome__title">{{ greeting }}</h1>
        <p class="welcome__subtitle">{{ motivationalMessage }}</p>
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions">
        @if (workoutService.hasActiveWorkout()) {
          <app-card [raised]="true" [interactive]="true" class="quick-actions__resume">
            <a routerLink="/workout" class="quick-actions__resume-link">
              <div class="quick-actions__resume-content">
                <div class="quick-actions__resume-indicator"></div>
                <div>
                  <h3 class="quick-actions__resume-title">Workout in Progress</h3>
                  <p class="quick-actions__resume-subtitle">{{ workoutService.activeWorkout()?.name }}</p>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </app-card>
        } @else {
          <app-button [fullWidth]="true" size="lg" (clicked)="startNewWorkout()">
            <span class="quick-actions__start-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Start Workout
            </span>
          </app-button>
        }
      </section>

      <!-- Weekly Summary -->
      <section class="section">
        <div class="section__header">
          <h2 class="section__title">This Week</h2>
        </div>
        <div class="stats-grid">
          <app-card [compact]="true">
            <div class="stat-card">
              <span class="stat-card__value">{{ statisticsService.thisWeekWorkouts().length }}</span>
              <span class="stat-card__label">Workouts</span>
            </div>
          </app-card>
          <app-card [compact]="true">
            <div class="stat-card">
              <span class="stat-card__value">{{ formatVolume(statisticsService.thisWeekVolume()) }}</span>
              <span class="stat-card__label">Volume</span>
            </div>
          </app-card>
          <app-card [compact]="true">
            <div class="stat-card">
              <span class="stat-card__value">{{ statisticsService.currentStreak() }}</span>
              <span class="stat-card__label">Day Streak</span>
            </div>
          </app-card>
          <app-card [compact]="true">
            <div class="stat-card">
              <span class="stat-card__value">{{ formatDuration(statisticsService.thisWeekDuration()) }}</span>
              <span class="stat-card__label">Time</span>
            </div>
          </app-card>
        </div>
      </section>

      <!-- Recent Templates -->
      @if (templateService.recentTemplates().length > 0) {
        <section class="section">
          <div class="section__header">
            <h2 class="section__title">Quick Start</h2>
            <a routerLink="/templates" class="section__link">View all</a>
          </div>
          <div class="templates-list">
            @for (template of templateService.recentTemplates().slice(0, 3); track template.id) {
              <app-card [interactive]="true" [compact]="true" (click)="startFromTemplate(template.id)">
                <div class="template-item">
                  <div class="template-item__info">
                    <h4 class="template-item__name">{{ template.name }}</h4>
                    <span class="template-item__meta">{{ template.exercises.length }} exercises</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </app-card>
            }
          </div>
        </section>
      }

      <!-- Recent Workouts -->
      <section class="section">
        <div class="section__header">
          <h2 class="section__title">Recent Workouts</h2>
          @if (workoutService.completedWorkouts().length > 0) {
            <a routerLink="/history" class="section__link">View all</a>
          }
        </div>

        @if (workoutService.recentWorkouts().length > 0) {
          <div class="workouts-list">
            @for (workout of workoutService.recentWorkouts(); track workout.id) {
              <app-card [interactive]="true">
                <a [routerLink]="['/history', workout.id]" class="workout-item">
                  <div class="workout-item__main">
                    <h4 class="workout-item__name">{{ workout.name }}</h4>
                    <span class="workout-item__date">{{ formatWorkoutDate(workout.completedAt!) }}</span>
                  </div>
                  <div class="workout-item__stats">
                    <div class="workout-item__stat">
                      <span class="workout-item__stat-value">{{ workout.exerciseCount ?? workout.exercises.length }}</span>
                      <span class="workout-item__stat-label">exercises</span>
                    </div>
                    <div class="workout-item__stat">
                      <span class="workout-item__stat-value">{{ workout.totalSets }}</span>
                      <span class="workout-item__stat-label">sets</span>
                    </div>
                    <div class="workout-item__stat">
                      <span class="workout-item__stat-value">{{ settingsService.formatWeight(workout.totalVolume, false) }}</span>
                      <span class="workout-item__stat-label">{{ settingsService.weightUnit() }}</span>
                    </div>
                  </div>
                </a>
              </app-card>
            }
          </div>
        } @else {
          <app-card>
            <div class="empty-workouts">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14.4 14.4 9.6 9.6"></path>
                <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"></path>
                <path d="m21.5 21.5-1.4-1.4"></path>
                <path d="M3.9 3.9 2.5 2.5"></path>
                <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"></path>
              </svg>
              <h3>No workouts yet</h3>
              <p>Start your first workout to track your progress!</p>
              <app-button (clicked)="startNewWorkout()">Start Workout</app-button>
            </div>
          </app-card>
        }
      </section>

      <!-- Quick Links -->
      <section class="section">
        <div class="quick-links">
          <a routerLink="/body-stats" class="quick-link">
            <div class="quick-link__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20v-6"></path>
                <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
                <path d="M12 4v4"></path>
              </svg>
            </div>
            <span>Body Stats</span>
          </a>
          <a routerLink="/statistics" class="quick-link">
            <div class="quick-link__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="20" x2="12" y2="10"></line>
                <line x1="18" y1="20" x2="18" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="16"></line>
              </svg>
            </div>
            <span>Statistics</span>
          </a>
          <a routerLink="/templates" class="quick-link">
            <div class="quick-link__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </div>
            <span>Templates</span>
          </a>
          <a routerLink="/exercises" class="quick-link">
            <div class="quick-link__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.4 14.4 9.6 9.6"></path>
                <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"></path>
              </svg>
            </div>
            <span>Exercises</span>
          </a>
        </div>

        <!-- Tools -->
        <div class="tools-row">
          <a routerLink="/tools/plate-calculator" class="tool-link">
            <div class="tool-link__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                <line x1="6" y1="6" x2="6" y2="18"></line>
                <line x1="18" y1="6" x2="18" y2="18"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
              </svg>
            </div>
            <div class="tool-link__content">
              <span class="tool-link__name">Plate Calculator</span>
              <span class="tool-link__description">Calculate plates for your barbell</span>
            </div>
            <svg class="tool-link__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
        </div>
      </section>
    </app-page-container>
  `,
  styles: [`
    .welcome {
      margin-bottom: var(--spacing-lg);

      &__title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
        margin-bottom: var(--spacing-xs);
      }

      &__subtitle {
        color: var(--color-text-secondary);
        font-size: var(--font-size-base);
      }
    }

    .quick-actions {
      margin-bottom: var(--spacing-xl);

      &__start-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }

      &__resume-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-decoration: none;
        color: var(--color-text);
      }

      &__resume-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
      }

      &__resume-indicator {
        width: 12px;
        height: 12px;
        background: var(--color-success-500);
        border-radius: var(--radius-full);
        animation: pulse 2s infinite;
      }

      &__resume-title {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        margin: 0;
      }

      &__resume-subtitle {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0;
      }
    }

    .section {
      margin-bottom: var(--spacing-xl);

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--spacing-md);
      }

      &__title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin: 0;
      }

      &__link {
        font-size: var(--font-size-sm);
        color: var(--color-primary-600);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);

      @media (min-width: 640px) {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      &__value {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
        line-height: 1.2;
      }

      &__label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }
    }

    .templates-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .template-item {
      display: flex;
      align-items: center;
      justify-content: space-between;

      &__info {
        flex: 1;
      }

      &__name {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        margin: 0 0 2px;
      }

      &__meta {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      svg {
        color: var(--color-primary-600);
      }
    }

    .workouts-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .workout-item {
      display: block;
      text-decoration: none;
      color: var(--color-text);

      &__main {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--spacing-sm);
      }

      &__name {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        margin: 0;
      }

      &__date {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__stats {
        display: flex;
        gap: var(--spacing-lg);
      }

      &__stat {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-xs);
      }

      &__stat-value {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
      }

      &__stat-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }
    }

    .empty-workouts {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--spacing-lg);
      color: var(--color-text-secondary);

      svg {
        margin-bottom: var(--spacing-md);
        color: var(--color-text-tertiary);
      }

      h3 {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin: 0 0 var(--spacing-xs);
      }

      p {
        margin: 0 0 var(--spacing-md);
      }
    }

    .quick-links {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-sm);
    }

    .quick-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      text-decoration: none;
      color: var(--color-text-secondary);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
      font-size: var(--font-size-xs);
      text-align: center;

      &:hover {
        background: var(--color-background-secondary);
        color: var(--color-text);
        border-color: var(--color-gray-300);
      }

      &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        background: var(--color-primary-50);
        color: var(--color-primary-600);
        border-radius: var(--radius-lg);
      }
    }

    .tools-row {
      margin-top: var(--spacing-md);
    }

    .tool-link {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      text-decoration: none;
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-background-secondary);
        border-color: var(--color-gray-300);
      }

      &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        background: var(--color-primary-50);
        color: var(--color-primary-600);
        border-radius: var(--radius-lg);
        flex-shrink: 0;
      }

      &__content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      &__name {
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
      }

      &__description {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__arrow {
        color: var(--color-text-tertiary);
        flex-shrink: 0;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class HomeComponent {
  workoutService = inject(WorkoutService);
  templateService = inject(TemplateService);
  statisticsService = inject(StatisticsService);
  settingsService = inject(SettingsService);
  private router = inject(Router);

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  readonly motivationalMessage = (() => {
    const messages = [
      'Ready to crush your workout?',
      'Time to get stronger!',
      'Every rep counts!',
      'Push your limits today!',
      'Consistency is key!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  })();

  formatWorkoutDate(dateString: string): string {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  }

  formatVolume(kg: number): string {
    if (kg < 1000) return `${Math.round(kg)}`;
    return `${(kg / 1000).toFixed(1)}k`;
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  startNewWorkout(): void {
    this.router.navigate(['/workout'], { queryParams: { start: 'true' } });
  }

  startFromTemplate(templateId: string): void {
    this.templateService.startWorkoutFromTemplate(templateId);
    this.router.navigate(['/workout']);
  }
}
