import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, BadgeComponent, EmptyStateComponent, ButtonComponent, ProgressComponent } from '../../shared/components';
import { StatisticsService, WorkoutService, SettingsService, ExerciseService, AuthService } from '../../core/services';
import { ExerciseProgress, ExerciseWithHistory } from '../../core/services/statistics.service';
import { PersonalRecord } from '../../core/models';
import { format, parseISO } from 'date-fns';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PageContainerComponent,
    CardComponent,
    BadgeComponent,
    EmptyStateComponent,
    ButtonComponent,
    ProgressComponent
  ],
  template: `
    <app-page-container title="Statistics" subtitle="Track your training progress">
      @if (workoutService.completedWorkouts().length > 0) {
        <!-- Summary Stats -->
        <div class="stats-grid">
          <app-card>
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.4 14.4 9.6 9.6"></path>
                  <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"></path>
                </svg>
              </div>
              <div class="stat-card__content">
                <span class="stat-card__value">{{ statisticsService.totalWorkouts() }}</span>
                <span class="stat-card__label">Total Workouts</span>
              </div>
            </div>
          </app-card>

          <app-card>
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--success">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                  <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
              </div>
              <div class="stat-card__content">
                <span class="stat-card__value">{{ formatVolume(statisticsService.totalVolume()) }}</span>
                <span class="stat-card__label">Total Volume</span>
              </div>
            </div>
          </app-card>

          <app-card>
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4"></path>
                  <path d="m16.2 7.8 2.9-2.9"></path>
                  <path d="M18 12h4"></path>
                  <path d="m16.2 16.2 2.9 2.9"></path>
                  <path d="M12 18v4"></path>
                  <path d="m4.9 19.1 2.9-2.9"></path>
                  <path d="M2 12h4"></path>
                  <path d="m4.9 4.9 2.9 2.9"></path>
                </svg>
              </div>
              <div class="stat-card__content">
                <span class="stat-card__value">{{ statisticsService.currentStreak() }}</span>
                <span class="stat-card__label">Day Streak</span>
              </div>
            </div>
          </app-card>

          <app-card>
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--danger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div class="stat-card__content">
                <span class="stat-card__value">{{ formatDuration(statisticsService.averageWorkoutDuration()) }}</span>
                <span class="stat-card__label">Avg Duration</span>
              </div>
            </div>
          </app-card>
        </div>

        <!-- Weekly Volume Chart (Simple Bar Chart) -->
        <app-card class="chart-card">
          <h3 class="chart-title">Weekly Volume Trend</h3>
          <div class="simple-chart">
            @for (data of volumeTrend; track data.label) {
              <div class="chart-bar-container">
                <div
                  class="chart-bar"
                  [style.height.%]="getBarHeight(data.volume, maxVolume)"
                  [title]="data.volume + ' kg'"
                ></div>
                <span class="chart-bar-label">{{ data.label }}</span>
              </div>
            }
          </div>
        </app-card>

        <!-- Workout Frequency Chart -->
        <app-card class="chart-card">
          <h3 class="chart-title">Workouts per Week</h3>
          <div class="simple-chart">
            @for (data of frequencyTrend; track data.week) {
              <div class="chart-bar-container">
                <div
                  class="chart-bar chart-bar--green"
                  [style.height.%]="getBarHeight(data.count, maxFrequency)"
                  [title]="data.count + ' workouts'"
                ></div>
                <span class="chart-bar-label">{{ data.week }}</span>
              </div>
            }
          </div>
        </app-card>

        <!-- Muscle Group Distribution -->
        <app-card class="chart-card">
          <h3 class="chart-title">Muscle Group Distribution</h3>
          <div class="muscle-groups">
            @for (data of muscleGroupData(); track data.muscleGroup) {
              <div class="muscle-group-item">
                <div class="muscle-group-item__header">
                  <span class="muscle-group-item__name">{{ data.label }}</span>
                  <span class="muscle-group-item__value">{{ data.setCount }} sets ({{ data.percentage }}%)</span>
                </div>
                <div class="muscle-group-item__bar">
                  <div
                    class="muscle-group-item__fill"
                    [style.width.%]="data.percentage"
                  ></div>
                </div>
              </div>
            }
          </div>
        </app-card>

        <!-- Exercise Progress Chart -->
        <app-card class="chart-card">
          <div class="exercise-progress-header">
            <h3 class="chart-title">Exercise Progress</h3>
            <select
              class="exercise-select"
              [ngModel]="selectedExerciseId()"
              (ngModelChange)="selectExercise($event)"
            >
              <option value="">Select an exercise</option>
              @for (exercise of exercisesWithHistory(); track exercise.id) {
                <option [value]="exercise.id">{{ exercise.name }}</option>
              }
            </select>
          </div>

          @if (selectedExerciseProgress()) {
            <div class="progress-chart-container">
              <!-- Chart Type Toggle -->
              <div class="chart-type-toggle">
                <button
                  class="toggle-btn"
                  [class.toggle-btn--active]="chartType() === 'weight'"
                  (click)="chartType.set('weight')"
                >
                  Max Weight
                </button>
                <button
                  class="toggle-btn"
                  [class.toggle-btn--active]="chartType() === 'e1rm'"
                  (click)="chartType.set('e1rm')"
                >
                  Est. 1RM
                </button>
                <button
                  class="toggle-btn"
                  [class.toggle-btn--active]="chartType() === 'volume'"
                  (click)="chartType.set('volume')"
                >
                  Volume
                </button>
              </div>

              <!-- Line Chart -->
              <div class="line-chart">
                <div class="line-chart__y-axis">
                  <span>{{ getYAxisMax() }}</span>
                  <span>{{ getYAxisMid() }}</span>
                  <span>0</span>
                </div>
                <div class="line-chart__content">
                  <svg class="line-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <!-- Grid lines -->
                    <line x1="0" y1="50" x2="100" y2="50" class="grid-line" />

                    <!-- Progress line -->
                    <polyline
                      [attr.points]="getChartPoints()"
                      class="progress-line"
                      fill="none"
                    />

                    <!-- Data points -->
                    @for (point of getDataPoints(); track point.index) {
                      <circle
                        [attr.cx]="point.x"
                        [attr.cy]="point.y"
                        r="2"
                        class="data-point"
                      >
                        <title>{{ point.label }}: {{ point.value }} {{ chartType() === 'volume' ? 'kg' : settingsService.weightUnit() }}</title>
                      </circle>
                    }
                  </svg>
                  <div class="line-chart__x-axis">
                    @for (label of getXAxisLabels(); track label) {
                      <span>{{ label }}</span>
                    }
                  </div>
                </div>
              </div>

              <!-- Progress Summary -->
              <div class="progress-summary">
                @if (getProgressChange() !== null) {
                  <div class="progress-stat">
                    <span class="progress-stat__label">Progress</span>
                    <span
                      class="progress-stat__value"
                      [class.progress-stat__value--positive]="getProgressChange()! > 0"
                      [class.progress-stat__value--negative]="getProgressChange()! < 0"
                    >
                      {{ getProgressChange()! > 0 ? '+' : '' }}{{ getProgressChange() }}%
                    </span>
                  </div>
                }
                <div class="progress-stat">
                  <span class="progress-stat__label">Sessions</span>
                  <span class="progress-stat__value">{{ selectedExerciseProgress()!.dataPoints.length }}</span>
                </div>
                <div class="progress-stat">
                  <span class="progress-stat__label">Best {{ chartType() === 'weight' ? 'Weight' : chartType() === 'e1rm' ? '1RM' : 'Volume' }}</span>
                  <span class="progress-stat__value">{{ getBestValue() }} {{ chartType() === 'volume' ? 'kg' : settingsService.weightUnit() }}</span>
                </div>
              </div>
            </div>
          } @else {
            <div class="no-exercise-selected">
              <p>Select an exercise to view your progress over time</p>
            </div>
          }
        </app-card>

        <!-- Personal Records -->
        <div class="section">
          <h3 class="section-title">Personal Records</h3>
          @if (workoutService.personalRecords().length > 0) {
            <div class="pr-columns">
              <!-- Max Weight Column -->
              <div class="pr-column">
                <h4 class="pr-column__title">Max Weight</h4>
                <div class="pr-list">
                  @for (pr of getMaxWeightPRs(); track pr.id) {
                    <div class="pr-row">
                      <span class="pr-row__exercise">{{ pr.exerciseName }}</span>
                      <div class="pr-row__value">
                        <span class="pr-row__number">{{ formatPrValue(pr) }}</span>
                        <span class="pr-row__unit">{{ settingsService.weightUnit() }}</span>
                        @if (pr.reps) {
                          <span class="pr-row__reps">&#64; {{ pr.reps }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Estimated 1RM Column -->
              <div class="pr-column">
                <h4 class="pr-column__title">Estimated 1RM</h4>
                <div class="pr-list">
                  @for (pr of getEstimated1RMPRs(); track pr.id) {
                    <div class="pr-row">
                      <span class="pr-row__exercise">{{ pr.exerciseName }}</span>
                      <div class="pr-row__value">
                        <span class="pr-row__number">{{ formatPrValue(pr) }}</span>
                        <span class="pr-row__unit">{{ settingsService.weightUnit() }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <p class="no-data">Complete more workouts to see your personal records!</p>
          }
        </div>
      } @else {
        <app-empty-state
          title="No Data Yet"
          description="Complete your first workout to start tracking your statistics!"
        >
          <div empty-icon>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="12" y1="20" x2="12" y2="10"></line>
              <line x1="18" y1="20" x2="18" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="16"></line>
            </svg>
          </div>
          <app-button routerLink="/workout" [queryParams]="{ start: 'true' }">Start Workout</app-button>
        </app-empty-state>
      }
    </app-page-container>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);

      @media (min-width: 640px) {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);

      &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        border-radius: var(--radius-lg);

        &--primary {
          background: var(--color-primary-100);
          color: var(--color-primary-600);
        }

        &--success {
          background: var(--color-success-100);
          color: var(--color-success-600);
        }

        &--warning {
          background: var(--color-warning-100);
          color: var(--color-warning-600);
        }

        &--danger {
          background: var(--color-danger-100);
          color: var(--color-danger-600);
        }
      }

      &__content {
        display: flex;
        flex-direction: column;
      }

      &__value {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
        line-height: 1.2;
      }

      &__label {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }
    }

    .chart-card {
      margin-bottom: var(--spacing-lg);
    }

    .chart-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin: 0 0 var(--spacing-md);
    }

    .simple-chart {
      display: flex;
      align-items: flex-end;
      gap: var(--spacing-xs);
      height: 150px;
      padding-top: var(--spacing-md);
    }

    .chart-bar-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .chart-bar {
      width: 100%;
      max-width: 40px;
      background: var(--color-primary-500);
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      margin-top: auto;
      min-height: 4px;
      transition: height 0.3s ease;

      &--green {
        background: var(--color-success-500);
      }
    }

    .chart-bar-label {
      font-size: 10px;
      color: var(--color-text-tertiary);
      margin-top: var(--spacing-xs);
      white-space: nowrap;
    }

    .muscle-groups {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .muscle-group-item {
      &__header {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-xs);
      }

      &__name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
      }

      &__value {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__bar {
        height: 8px;
        background: var(--color-gray-200);
        border-radius: var(--radius-full);
        overflow: hidden;
      }

      &__fill {
        height: 100%;
        background: var(--color-primary-500);
        border-radius: var(--radius-full);
        transition: width 0.3s ease;
      }
    }

    .section {
      margin-top: var(--spacing-lg);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .section-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin: 0;
    }

    .show-all-btn {
      font-size: var(--font-size-sm);
      color: var(--color-primary-600);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;

      &:hover {
        text-decoration: underline;
      }
    }

    .pr-grid {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: var(--spacing-sm);

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .pr-item {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-sm);
      }

      &__exercise {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__body {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-sm);
      }

      &__value {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-xs);
      }

      &__number {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
      }

      &__unit {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__reps {
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
      }

      &__date {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }
    }

    /* Exercise Progress Section */
    .exercise-progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
      flex-wrap: wrap;
    }

    .exercise-select {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      min-width: 180px;

      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
      }
    }

    .progress-chart-container {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .chart-type-toggle {
      display: flex;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs);
      background: var(--color-background-secondary);
      border-radius: var(--radius-md);
      width: fit-content;
    }

    .toggle-btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text);
      }

      &--active {
        background: var(--color-surface);
        color: var(--color-primary-600);
        box-shadow: var(--shadow-sm);
      }
    }

    .line-chart {
      display: flex;
      gap: var(--spacing-sm);
      height: 200px;
    }

    .line-chart__y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      text-align: right;
      min-width: 40px;
      padding: var(--spacing-xs) 0;
    }

    .line-chart__content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .line-chart__svg {
      flex: 1;
      background: var(--color-background-secondary);
      border-radius: var(--radius-md);
    }

    .grid-line {
      stroke: var(--color-border-light);
      stroke-width: 0.5;
      stroke-dasharray: 2, 2;
    }

    .progress-line {
      stroke: var(--color-primary-500);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .data-point {
      fill: var(--color-primary-600);
      cursor: pointer;

      &:hover {
        r: 4;
      }
    }

    .line-chart__x-axis {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      padding-top: var(--spacing-xs);
    }

    .progress-summary {
      display: flex;
      gap: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--color-background-secondary);
      border-radius: var(--radius-md);
    }

    .progress-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;

      &__label {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      &__value {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);

        &--positive {
          color: var(--color-success-600);
        }

        &--negative {
          color: var(--color-danger-600);
        }
      }
    }

    .no-exercise-selected {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 150px;
      color: var(--color-text-tertiary);
      text-align: center;
    }

    .pr-columns {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--spacing-lg);
      margin-top: var(--spacing-md);

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .pr-column {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--spacing-md);
      border: 1px solid var(--color-border-light);

      &__title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 var(--spacing-md);
        padding-bottom: var(--spacing-sm);
        border-bottom: 1px solid var(--color-border-light);
      }
    }

    .pr-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .pr-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-xs) 0;

      &__exercise {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-right: var(--spacing-sm);
      }

      &__value {
        display: flex;
        align-items: baseline;
        gap: 2px;
        flex-shrink: 0;
      }

      &__number {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-bold);
        color: var(--color-primary-600);
      }

      &__unit {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      &__reps {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        margin-left: 2px;
      }
    }

    .no-data {
      text-align: center;
      color: var(--color-text-secondary);
      padding: var(--spacing-lg);
    }
  `]
})
export class StatisticsComponent implements OnInit {
  statisticsService = inject(StatisticsService);
  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);
  exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);

  muscleGroupData = computed(() => this.statisticsService.muscleGroupDistribution());
  volumeTrend: { label: string; volume: number }[] = [];
  frequencyTrend: { week: string; count: number }[] = [];
  maxVolume = 0;
  maxFrequency = 0;

  // Exercise Progress Chart
  selectedExerciseId = signal<string>('');
  chartType = signal<'weight' | 'e1rm' | 'volume'>('weight');
  showAllPRs = false;
  private _selectedExerciseProgress = signal<ExerciseProgress | null>(null);

  selectedExerciseProgress = this._selectedExerciseProgress.asReadonly();

  // Use API for exercises with history if authenticated, otherwise compute locally
  exercisesWithHistory = computed(() => {
    if (this.authService.isAuthenticated()) {
      return this.statisticsService.exercisesWithHistory();
    }

    // Fallback to local computation for non-authenticated users
    const completedWorkouts = this.workoutService.completedWorkouts();
    const exerciseIds = new Set<string>();

    completedWorkouts.forEach(workout => {
      (workout.exercises || []).forEach(ex => {
        if (ex.sets.some(s => s.isCompleted && !s.isWarmup)) {
          exerciseIds.add(ex.exerciseTemplateId);
        }
      });
    });

    return Array.from(exerciseIds)
      .map(id => {
        const template = this.exerciseService.getExerciseById(id);
        if (!template) return null;
        return { id: template.id, name: template.name, workoutCount: 0 };
      })
      .filter((ex): ex is NonNullable<typeof ex> => ex !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    this.volumeTrend = this.statisticsService.getWeeklyVolumeTrend(8);
    this.maxVolume = Math.max(...this.volumeTrend.map(d => d.volume), 1);

    this.frequencyTrend = this.statisticsService.getWorkoutsPerWeek(8);
    this.maxFrequency = Math.max(...this.frequencyTrend.map(d => d.count), 1);

    // Auto-select first exercise if available (with a slight delay for API data)
    setTimeout(() => {
      const exercises = this.exercisesWithHistory();
      if (exercises.length > 0) {
        this.selectExercise(exercises[0].id);
      }
    }, 500);
  }

  async selectExercise(exerciseId: string): Promise<void> {
    this.selectedExerciseId.set(exerciseId);
    if (!exerciseId) {
      this._selectedExerciseProgress.set(null);
      return;
    }

    // Load exercise progress from API or local
    const progress = await this.statisticsService.getExerciseProgressFromApi(exerciseId);
    this._selectedExerciseProgress.set(progress);
  }

  getBarHeight(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.max(5, (value / max) * 100);
  }

  formatVolume(kg: number): string {
    if (kg < 1000) return `${Math.round(kg)} kg`;
    if (kg < 1000000) return `${(kg / 1000).toFixed(1)}t`;
    return `${(kg / 1000000).toFixed(1)}kt`;
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }

  getPrTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'max-weight': 'Max Weight',
      'max-reps': 'Max Reps',
      'max-volume': 'Max Volume',
      'estimated-1rm': 'Est. 1RM'
    };
    return labels[type] || type;
  }

  // Exercise Progress Chart Methods
  getChartPoints(): string {
    const progress = this.selectedExerciseProgress();
    if (!progress || progress.dataPoints.length === 0) return '';

    const dataPoints = progress.dataPoints;
    const values = this.getChartValues();
    const maxValue = Math.max(...values, 1);

    return dataPoints.map((point, index) => {
      const x = dataPoints.length === 1 ? 50 : (index / (dataPoints.length - 1)) * 100;
      const y = 100 - (values[index] / maxValue) * 90 - 5;
      return `${x},${y}`;
    }).join(' ');
  }

  getDataPoints(): { index: number; x: number; y: number; label: string; value: number }[] {
    const progress = this.selectedExerciseProgress();
    if (!progress || progress.dataPoints.length === 0) return [];

    const dataPoints = progress.dataPoints;
    const values = this.getChartValues();
    const maxValue = Math.max(...values, 1);

    return dataPoints.map((point, index) => ({
      index,
      x: dataPoints.length === 1 ? 50 : (index / (dataPoints.length - 1)) * 100,
      y: 100 - (values[index] / maxValue) * 90 - 5,
      label: format(parseISO(point.date), 'MMM d'),
      value: Math.round(values[index] * 10) / 10
    }));
  }

  getChartValues(): number[] {
    const progress = this.selectedExerciseProgress();
    if (!progress) return [];

    const type = this.chartType();
    return progress.dataPoints.map(point => {
      if (type === 'weight') return point.maxWeight;
      if (type === 'e1rm') return point.estimated1RM;
      return point.totalVolume;
    });
  }

  getYAxisMax(): string {
    const values = this.getChartValues();
    const max = Math.max(...values, 1);
    return Math.round(max).toString();
  }

  getYAxisMid(): string {
    const values = this.getChartValues();
    const max = Math.max(...values, 1);
    return Math.round(max / 2).toString();
  }

  getXAxisLabels(): string[] {
    const progress = this.selectedExerciseProgress();
    if (!progress || progress.dataPoints.length === 0) return [];

    const dataPoints = progress.dataPoints;
    if (dataPoints.length <= 5) {
      return dataPoints.map(p => format(parseISO(p.date), 'MMM d'));
    }

    // Show first, middle, and last
    const first = format(parseISO(dataPoints[0].date), 'MMM d');
    const last = format(parseISO(dataPoints[dataPoints.length - 1].date), 'MMM d');
    return [first, '', last];
  }

  getProgressChange(): number | null {
    const values = this.getChartValues();
    if (values.length < 2) return null;

    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0) return null;

    return Math.round(((last - first) / first) * 100);
  }

  getBestValue(): number {
    const values = this.getChartValues();
    if (values.length === 0) return 0;
    return Math.round(Math.max(...values) * 10) / 10;
  }

  // PR Methods
  getMaxWeightPRs() {
    return this.workoutService.personalRecords()
      .filter(pr => pr.type === 'max-weight')
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }

  getEstimated1RMPRs() {
    return this.workoutService.personalRecords()
      .filter(pr => pr.type === 'estimated-1rm')
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }

  getDisplayedPRs() {
    const prs = this.workoutService.personalRecords();
    // Sort by date (most recent first)
    const sorted = [...prs].sort((a, b) =>
      new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
    );
    return this.showAllPRs ? sorted : sorted.slice(0, 10);
  }

  formatPrValue(pr: PersonalRecord): string {
    if (pr.type === 'estimated-1rm') {
      return Math.round(pr.value).toString();
    }
    return pr.value.toString();
  }

  formatPrDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM d, yyyy');
  }
}
