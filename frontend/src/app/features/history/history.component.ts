import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, BadgeComponent, EmptyStateComponent, ButtonComponent, SkeletonComponent } from '../../shared/components';
import { WorkoutService, SettingsService } from '../../core/services';
import { Workout } from '../../core/models';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

interface WorkoutGroup {
  label: string;
  workouts: Workout[];
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageContainerComponent,
    CardComponent,
    BadgeComponent,
    EmptyStateComponent,
    ButtonComponent,
    SkeletonComponent
  ],
  template: `
    <app-page-container title="History" subtitle="Your workout history">
      @if (workoutService.isLoading() || isLoadingPage()) {
        <!-- Loading Skeletons -->
        <div class="skeleton-container">
          <app-skeleton variant="card"></app-skeleton>
          <app-skeleton variant="card"></app-skeleton>
          <app-skeleton variant="card"></app-skeleton>
        </div>
      } @else if (workoutGroups().length > 0) {
        <!-- Stats Summary -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-item__value">{{ workoutService.totalWorkouts() }}</span>
            <span class="stat-item__label">Total Workouts</span>
          </div>
          <div class="stat-item">
            <span class="stat-item__value">{{ workoutService.getWorkoutStreak() }}</span>
            <span class="stat-item__label">Current Streak</span>
          </div>
          <div class="stat-item">
            <span class="stat-item__value">{{ workoutService.getLongestStreak() }}</span>
            <span class="stat-item__label">Best Streak</span>
          </div>
        </div>

        <!-- Workout Groups -->
        <div class="workout-groups">
          @for (group of workoutGroups(); track group.label) {
            <div class="workout-group">
              <h3 class="workout-group__title">{{ group.label }}</h3>
              <div class="workout-group__list">
                @for (workout of group.workouts; track workout.id) {
                  <app-card [interactive]="true">
                    <a [routerLink]="['/history', workout.id]" class="workout-item">
                      <div class="workout-item__header">
                        <h4 class="workout-item__name">{{ workout.name }}</h4>
                        <span class="workout-item__date">{{ formatDate(workout.completedAt!) }}</span>
                      </div>
                      <div class="workout-item__details">
                        <div class="workout-item__stat">
                          <span class="workout-item__stat-value">{{ workout.exerciseCount ?? workout.exercises.length }}</span>
                          <span class="workout-item__stat-label">exercises</span>
                        </div>
                        <div class="workout-item__stat">
                          <span class="workout-item__stat-value">{{ workout.totalSets }}</span>
                          <span class="workout-item__stat-label">sets</span>
                        </div>
                        <div class="workout-item__stat">
                          <span class="workout-item__stat-value">{{ formatVolume(workout.totalVolume) }}</span>
                          <span class="workout-item__stat-label">volume</span>
                        </div>
                        <div class="workout-item__stat">
                          <span class="workout-item__stat-value">{{ formatDuration(workout.duration || 0) }}</span>
                          <span class="workout-item__stat-label">duration</span>
                        </div>
                      </div>
                      @if (workout.exercises.length) {
                        <div class="workout-item__exercises">
                          @for (exercise of workout.exercises.slice(0, 3); track exercise.id) {
                            <app-badge [size]="'sm'">{{ exercise.exerciseName }}</app-badge>
                          }
                          @if (workout.exercises.length > 3) {
                            <app-badge [size]="'sm'" [variant]="'default'">+{{ workout.exercises.length - 3 }}</app-badge>
                          }
                        </div>
                      }
                    </a>
                  </app-card>
                }
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button
              class="pagination__btn"
              [disabled]="currentPage() === 1"
              (click)="loadPage(currentPage() - 1)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Previous
            </button>
            <span class="pagination__info">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>
            <button
              class="pagination__btn"
              [disabled]="currentPage() === totalPages()"
              (click)="loadPage(currentPage() + 1)"
            >
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        }
      } @else {
        <app-empty-state
          title="No Workouts Yet"
          description="Complete your first workout to start tracking your progress!"
        >
          <div empty-icon>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <app-button routerLink="/workout" [queryParams]="{ start: 'true' }">Start Workout</app-button>
        </app-empty-state>
      }
    </app-page-container>
  `,
  styles: [`
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .stats-row {
      display: flex;
      justify-content: space-around;
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      &__value {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
      }

      &__label {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }
    }

    .workout-groups {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xl);
    }

    .workout-group {
      &__title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--spacing-md);
      }

      &__list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }
    }

    .workout-item {
      display: block;
      text-decoration: none;
      color: var(--color-text);

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--spacing-sm);
      }

      &__name {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        margin: 0;
      }

      &__date {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__details {
        display: flex;
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-sm);
      }

      &__stat {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-xs);
      }

      &__stat-value {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
      }

      &__stat-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__exercises {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
      }
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-md);
      margin-top: var(--spacing-xl);
      padding: var(--spacing-md);

      &__btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover:not(:disabled) {
          background: var(--color-background-secondary);
          border-color: var(--color-border);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      &__info {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }
    }
  `]
})
export class HistoryComponent implements OnInit {
  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);

  workoutGroups = signal<WorkoutGroup[]>([]);

  // Pagination state
  currentPage = signal(1);
  pageSize = signal(20);
  totalWorkouts = signal(0);
  isLoadingPage = signal(false);

  totalPages = computed(() => Math.ceil(this.totalWorkouts() / this.pageSize()) || 1);

  ngOnInit(): void {
    this.loadPage(1);
  }

  async loadPage(page: number): Promise<void> {
    this.isLoadingPage.set(true);
    try {
      const offset = (page - 1) * this.pageSize();
      const response = await this.workoutService.fetchWorkoutsPaginated({
        limit: this.pageSize(),
        offset,
        status: 'completed',
      });
      this.currentPage.set(page);
      this.totalWorkouts.set(response.total);
      this.groupWorkoutsFromList(response.workouts);
    } finally {
      this.isLoadingPage.set(false);
    }
  }

  private groupWorkoutsFromList(workouts: Workout[]): void {
    const groups: WorkoutGroup[] = [];

    const today: Workout[] = [];
    const yesterday: Workout[] = [];
    const thisWeek: Workout[] = [];
    const thisMonth: Workout[] = [];
    const older: Workout[] = [];

    workouts.forEach(workout => {
      const date = parseISO(workout.completedAt!);
      if (isToday(date)) {
        today.push(workout);
      } else if (isYesterday(date)) {
        yesterday.push(workout);
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        thisWeek.push(workout);
      } else if (isThisMonth(date)) {
        thisMonth.push(workout);
      } else {
        older.push(workout);
      }
    });

    if (today.length) groups.push({ label: 'Today', workouts: today });
    if (yesterday.length) groups.push({ label: 'Yesterday', workouts: yesterday });
    if (thisWeek.length) groups.push({ label: 'This Week', workouts: thisWeek });
    if (thisMonth.length) groups.push({ label: 'This Month', workouts: thisMonth });
    if (older.length) groups.push({ label: 'Older', workouts: older });

    this.workoutGroups.set(groups);
  }

  formatDate(dateString: string): string {
    const date = parseISO(dateString);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  }

  formatVolume(kg: number): string {
    if (kg < 1000) return `${Math.round(kg)} kg`;
    return `${(kg / 1000).toFixed(1)}t`;
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
}
