import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../../layout';
import { CardComponent, BadgeComponent, ButtonComponent, ModalComponent } from '../../../shared/components';
import { WorkoutService, SettingsService, ExerciseService, TemplateService, ToastService } from '../../../core/services';
import { Workout } from '../../../core/models';
import { format, parseISO } from 'date-fns';

@Component({
  selector: 'app-workout-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageContainerComponent,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    ModalComponent
  ],
  template: `
    @if (workout()) {
      <app-page-container>
        <div class="workout-detail">
          <!-- Header -->
          <div class="detail-header">
            <button class="detail-header__back" routerLink="/history">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div class="detail-header__info">
              <h1 class="detail-header__title">{{ workout()!.name }}</h1>
              <span class="detail-header__date">{{ formatFullDate(workout()!.completedAt!) }}</span>
            </div>
            <button class="detail-header__menu" (click)="showMenu = !showMenu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>

            @if (showMenu) {
              <div class="detail-header__dropdown">
                <button (click)="repeatWorkout()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                  </svg>
                  Repeat workout
                </button>
                <button (click)="saveAsTemplate()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                  Save as template
                </button>
                <button class="danger" (click)="showDeleteModal = true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                  </svg>
                  Delete workout
                </button>
              </div>
            }
          </div>

          <!-- Summary Stats -->
          <div class="summary-stats">
            <div class="summary-stat">
              <span class="summary-stat__value">{{ workout()!.exercises.length }}</span>
              <span class="summary-stat__label">Exercises</span>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__value">{{ workout()!.totalSets }}</span>
              <span class="summary-stat__label">Sets</span>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__value">{{ settingsService.formatWeight(workout()!.totalVolume, false) }}</span>
              <span class="summary-stat__label">{{ settingsService.weightUnit() }} Volume</span>
            </div>
            <div class="summary-stat">
              <span class="summary-stat__value">{{ formatDuration(workout()!.duration || 0) }}</span>
              <span class="summary-stat__label">Duration</span>
            </div>
          </div>

          <!-- Notes -->
          @if (workout()!.notes) {
            <div class="notes-section">
              <h2 class="section-title">Notes</h2>
              <app-card>
                <p class="notes-text">{{ workout()!.notes }}</p>
              </app-card>
            </div>
          }

          <!-- Exercises -->
          <div class="exercises-section">
            <h2 class="section-title">Exercises</h2>
            <div class="exercises-list">
              @for (exercise of workout()!.exercises; track exercise.id) {
                <app-card>
                  <div class="exercise-detail">
                    <div class="exercise-detail__header">
                      <h3 class="exercise-detail__name">{{ exercise.exerciseName }}</h3>
                      <div class="exercise-detail__tags">
                        @for (muscle of getMuscleGroups(exercise.exerciseTemplateId).slice(0, 2); track muscle) {
                          <app-badge [size]="'sm'">{{ exerciseService.getMuscleGroupLabel(muscle) }}</app-badge>
                        }
                      </div>
                    </div>

                    <div class="sets-table">
                      <div class="sets-table__header">
                        <span>Set</span>
                        <span>Weight</span>
                        <span>Reps</span>
                      </div>
                      @for (set of exercise.sets; track set.id) {
                        @if (set.isCompleted) {
                          <div class="sets-table__row" [class.sets-table__row--warmup]="set.isWarmup">
                            <span>
                              @if (set.isWarmup) { W } @else { {{ set.setNumber }} }
                            </span>
                            <span>{{ set.actualWeight }} {{ settingsService.weightUnit() }}</span>
                            <span>{{ set.actualReps }}</span>
                          </div>
                        }
                      }
                    </div>
                  </div>
                </app-card>
              }
            </div>
          </div>
        </div>

        <!-- Delete Modal -->
        <app-modal
          [isOpen]="showDeleteModal"
          title="Delete Workout?"
          [showFooter]="true"
          size="sm"
          (closed)="showDeleteModal = false"
        >
          <p>Are you sure you want to delete this workout? This action cannot be undone.</p>
          <div modal-footer>
            <app-button variant="ghost" (clicked)="showDeleteModal = false">Cancel</app-button>
            <app-button variant="danger" (clicked)="deleteWorkout()">Delete</app-button>
          </div>
        </app-modal>
      </app-page-container>
    }
  `,
  styles: [`
    .workout-detail {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .detail-header {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);

      &__back {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        padding: 0;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        color: var(--color-text-secondary);
        cursor: pointer;

        &:hover {
          background: var(--color-background-secondary);
        }
      }

      &__info {
        flex: 1;
      }

      &__title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
        margin: 0;
      }

      &__date {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__menu {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        background: none;
        border: none;
        color: var(--color-text-secondary);
        cursor: pointer;

        &:hover {
          color: var(--color-text);
        }
      }

      &__dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        z-index: 10;
        min-width: 180px;
        margin-top: var(--spacing-xs);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        overflow: hidden;

        button {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: var(--font-size-sm);
          text-align: left;
          color: var(--color-text);
          background: none;
          border: none;
          cursor: pointer;

          &:hover {
            background: var(--color-background-secondary);
          }

          &.danger {
            color: var(--color-danger-600);
          }
        }
      }
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-sm);

      @media (min-width: 480px) {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .summary-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-align: center;

      &__value {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
      }

      &__label {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }
    }

    .section-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin: 0 0 var(--spacing-md);
    }

    .notes-text {
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
      white-space: pre-wrap;
      margin: 0;
      line-height: 1.6;
    }

    .exercises-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .exercise-detail {
      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--spacing-md);
      }

      &__name {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin: 0;
      }

      &__tags {
        display: flex;
        gap: var(--spacing-xs);
      }
    }

    .sets-table {
      &__header {
        display: grid;
        grid-template-columns: 3rem 1fr 1fr;
        gap: var(--spacing-md);
        padding: var(--spacing-xs) 0;
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        border-bottom: 1px solid var(--color-border-light);
      }

      &__row {
        display: grid;
        grid-template-columns: 3rem 1fr 1fr;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) 0;
        font-size: var(--font-size-base);
        border-bottom: 1px solid var(--color-border-light);

        &:last-child {
          border-bottom: none;
        }

        &--warmup {
          color: var(--color-text-secondary);
        }
      }
    }
  `]
})
export class WorkoutDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);
  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);
  exerciseService = inject(ExerciseService);
  templateService = inject(TemplateService);

  workout = signal<Workout | null>(null);
  showMenu = false;
  showDeleteModal = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const workout = this.workoutService.getWorkoutById(id);
      if (workout) {
        this.workout.set(workout);
      } else {
        this.router.navigate(['/history']);
      }
    }
  }

  getMuscleGroups(exerciseTemplateId: string) {
    const template = this.exerciseService.getExerciseById(exerciseTemplateId);
    return template?.muscleGroups || [];
  }

  formatFullDate(dateString: string): string {
    return format(parseISO(dateString), 'EEEE, MMMM d, yyyy \'at\' h:mm a');
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  saveAsTemplate(): void {
    this.showMenu = false;
    const workout = this.workout();
    if (workout) {
      this.templateService.createTemplateFromWorkout(workout.id, `${workout.name} Template`);
      this.router.navigate(['/templates']);
    }
  }

  deleteWorkout(): void {
    const workout = this.workout();
    if (workout) {
      this.workoutService.deleteWorkout(workout.id);
      this.router.navigate(['/history']);
    }
  }

  async repeatWorkout(): Promise<void> {
    this.showMenu = false;
    const workout = this.workout();
    if (!workout) return;

    if (this.workoutService.hasActiveWorkout()) {
      this.toastService.warning('Please finish or cancel your current workout first');
      return;
    }

    const newWorkout = await this.workoutService.repeatWorkout(workout.id);
    if (newWorkout) {
      this.toastService.success('Workout started! Good luck!');
      this.router.navigate(['/workout']);
    } else {
      this.toastService.error('Failed to start workout');
    }
  }
}
