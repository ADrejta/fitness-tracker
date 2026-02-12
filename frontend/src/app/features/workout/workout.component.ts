import { Component, inject, OnInit, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { ButtonComponent, CardComponent, ModalComponent, EmptyStateComponent } from '../../shared/components';
import { WorkoutService, SettingsService, TemplateService } from '../../core/services';
import { WorkoutSet, WorkoutExercise } from '../../core/models';
import { ExercisePickerComponent } from './components/exercise-picker/exercise-picker.component';
import { WorkoutExerciseComponent } from './components/workout-exercise/workout-exercise.component';
import { RestTimerComponent } from './components/rest-timer/rest-timer.component';

interface GroupedExercise extends WorkoutExercise {
  isFirstInSuperset: boolean;
  isLastInSuperset: boolean;
  isInSuperset: boolean;
}

@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [
    CommonModule,
    PageContainerComponent,
    ButtonComponent,
    CardComponent,
    ModalComponent,
    EmptyStateComponent,
    ExercisePickerComponent,
    WorkoutExerciseComponent,
    RestTimerComponent
  ],
  template: `
    <app-page-container>
      @if (workoutService.hasActiveWorkout()) {
        <!-- Active Workout -->
        <div class="workout">
          <div class="workout__header">
            <div class="workout__info">
              <input
                type="text"
                class="workout__name-input"
                [value]="workoutService.activeWorkout()?.name"
                (change)="updateWorkoutName($event)"
                placeholder="Workout name"
              />
              <div class="workout__meta">
                <span class="workout__timer">{{ elapsedTime() }}</span>
                <span class="workout__stats">
                  {{ completedSets() }} sets completed
                </span>
              </div>
              <button
                class="workout__notes-toggle"
                (click)="showNotes = !showNotes"
                [class.has-notes]="workoutService.activeWorkout()?.notes"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                {{ showNotes ? 'Hide notes' : (workoutService.activeWorkout()?.notes ? 'Show notes' : 'Add notes') }}
              </button>
              @if (showNotes) {
                <textarea
                  class="workout__notes-input"
                  [value]="workoutService.activeWorkout()?.notes || ''"
                  (input)="updateWorkoutNotes($event)"
                  placeholder="Add workout notes..."
                  rows="2"
                ></textarea>
              }
            </div>
            <button class="workout__menu-btn" (click)="showWorkoutMenu = !showWorkoutMenu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>

            @if (showWorkoutMenu) {
              <div class="workout__menu">
                <button (click)="saveAsTemplate()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                  Save as template
                </button>
                <button class="workout__menu-danger" (click)="showCancelModal = true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  Cancel workout
                </button>
              </div>
            }
          </div>

          <!-- Exercise List -->
          <div class="workout__exercises">
            @for (exercise of groupedExercises(); track exercise.id) {
              @if (exercise.isFirstInSuperset) {
                <div class="superset-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12h16M4 6h16M4 18h16"></path>
                  </svg>
                  Superset
                  <button class="superset-remove" (click)="removeSuperset(exercise.supersetId!)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              }
              <div
                class="exercise-wrapper"
                [class.in-superset]="exercise.isInSuperset"
                [class.superset-first]="exercise.isFirstInSuperset"
                [class.superset-last]="exercise.isLastInSuperset"
                [class.superset-selected]="selectedExercises().includes(exercise.id)"
                (click)="toggleExerciseSelection(exercise.id, $event)"
              >
                <app-workout-exercise
                  [exercise]="exercise"
                  (setAdded)="addSet(exercise.id, $event)"
                  (setUpdated)="updateSet(exercise.id, $event.setId, $event.updates)"
                  (setCompleted)="completeSet(exercise.id, $event.setId, $event.reps, $event.weight)"
                  (exerciseRemoved)="removeExercise(exercise.id)"
                />
              </div>
            }
          </div>

          <!-- Superset Creation UI -->
          @if (selectedExercises().length >= 2) {
            <div class="superset-action">
              <app-button variant="secondary" (clicked)="createSupersetFromSelection()">
                <span class="superset-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12h16M4 6h16M4 18h16"></path>
                  </svg>
                  Link {{ selectedExercises().length }} exercises as Superset
                </span>
              </app-button>
              <app-button variant="ghost" size="sm" (clicked)="clearSelection()">Cancel</app-button>
            </div>
          }

          <!-- Add Exercise Button -->
          <app-button
            [fullWidth]="true"
            variant="secondary"
            (clicked)="showExercisePicker = true"
          >
            <span class="add-exercise-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Exercise
            </span>
          </app-button>

          <!-- Finish Button -->
          @if (workoutService.activeWorkout()?.exercises?.length) {
            <div class="workout__finish">
              <app-button
                [fullWidth]="true"
                variant="success"
                size="lg"
                (clicked)="showFinishModal = true"
              >
                Finish Workout
              </app-button>
            </div>
          }
        </div>
      } @else {
        <!-- No Active Workout -->
        <div class="no-workout">
          <app-empty-state
            title="No Active Workout"
            description="Start a new workout or choose a template to begin tracking."
          >
            <div empty-icon>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14.4 14.4 9.6 9.6"></path>
                <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"></path>
                <path d="m21.5 21.5-1.4-1.4"></path>
                <path d="M3.9 3.9 2.5 2.5"></path>
                <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"></path>
              </svg>
            </div>
            <div class="no-workout__actions">
              <app-button (clicked)="startEmptyWorkout()">Start Empty Workout</app-button>
            </div>
          </app-empty-state>

          @if (templateService.recentTemplates().length > 0) {
            <div class="templates-section">
              <h3>Or start from a template</h3>
              <div class="templates-list">
                @for (template of templateService.recentTemplates(); track template.id) {
                  <app-card [interactive]="true" [compact]="true" (click)="startFromTemplate(template.id)">
                    <div class="template-item">
                      <div class="template-item__info">
                        <h4>{{ template.name }}</h4>
                        <span>{{ template.exercises.length }} exercises</span>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  </app-card>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Exercise Picker Modal -->
      <app-exercise-picker
        [isOpen]="showExercisePicker"
        (closed)="showExercisePicker = false"
        (exerciseSelected)="addExercise($event)"
      />

      <!-- Rest Timer -->
      <app-rest-timer #restTimer />

      <!-- Finish Workout Modal -->
      <app-modal
        [isOpen]="showFinishModal"
        title="Finish Workout?"
        [showFooter]="true"
        size="sm"
        (closed)="showFinishModal = false"
      >
        <div class="finish-modal">
          <p>Great work! Here's your workout summary:</p>
          <div class="finish-modal__stats">
            <div class="finish-modal__stat">
              <span class="finish-modal__stat-value">{{ workoutService.activeWorkout()?.exercises?.length || 0 }}</span>
              <span class="finish-modal__stat-label">Exercises</span>
            </div>
            <div class="finish-modal__stat">
              <span class="finish-modal__stat-value">{{ completedSets() }}</span>
              <span class="finish-modal__stat-label">Sets</span>
            </div>
            <div class="finish-modal__stat">
              <span class="finish-modal__stat-value">{{ settingsService.formatWeight(totalVolume(), false) }}</span>
              <span class="finish-modal__stat-label">{{ settingsService.weightUnit() }}</span>
            </div>
          </div>
        </div>
        <div modal-footer>
          <app-button variant="ghost" (clicked)="showFinishModal = false">Cancel</app-button>
          <app-button variant="success" (clicked)="finishWorkout()">Finish</app-button>
        </div>
      </app-modal>

      <!-- Cancel Workout Modal -->
      <app-modal
        [isOpen]="showCancelModal"
        title="Cancel Workout?"
        [showFooter]="true"
        size="sm"
        (closed)="showCancelModal = false"
      >
        <p>Are you sure you want to cancel this workout? All progress will be lost.</p>
        <div modal-footer>
          <app-button variant="ghost" (clicked)="showCancelModal = false">Keep Working</app-button>
          <app-button variant="danger" (clicked)="cancelWorkout()">Cancel Workout</app-button>
        </div>
      </app-modal>
    </app-page-container>
  `,
  styles: [`
    .workout {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .workout__header {
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: var(--spacing-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
    }

    .workout__info {
      flex: 1;
    }

    .workout__name-input {
      width: 100%;
      padding: 0;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      background: none;
      border: none;
      outline: none;

      &::placeholder {
        color: var(--color-text-tertiary);
      }

      &:focus {
        outline: none;
      }
    }

    .workout__meta {
      display: flex;
      gap: var(--spacing-md);
      margin-top: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .workout__timer {
      font-variant-numeric: tabular-nums;
    }

    .workout__notes-toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      background: none;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text-secondary);
        background: var(--color-background-secondary);
      }

      &.has-notes {
        color: var(--color-primary-600);
      }
    }

    .workout__notes-input {
      width: 100%;
      margin-top: var(--spacing-sm);
      padding: var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      color: var(--color-text);
      background: var(--color-background-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      resize: vertical;
      min-height: 3rem;

      &::placeholder {
        color: var(--color-text-tertiary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
      }
    }

    .workout__menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      cursor: pointer;

      &:hover {
        background: var(--color-background-secondary);
      }
    }

    .workout__menu {
      position: absolute;
      top: 100%;
      right: var(--spacing-md);
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
      }

      &-danger {
        color: var(--color-danger-600) !important;
      }
    }

    .workout__exercises {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .superset-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-primary-600);
      background: var(--color-primary-50);
      border-radius: var(--radius-md);
      margin-bottom: calc(var(--spacing-md) * -1);
      margin-top: var(--spacing-sm);
    }

    .superset-remove {
      margin-left: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--color-primary-600);
      cursor: pointer;
      opacity: 0.6;

      &:hover {
        opacity: 1;
        background: var(--color-primary-100);
      }
    }

    .exercise-wrapper {
      position: relative;
      transition: all var(--transition-fast);

      &.in-superset {
        margin-left: var(--spacing-md);
        padding-left: var(--spacing-md);
        border-left: 3px solid var(--color-primary-400);

        &.superset-first {
          border-top-left-radius: var(--radius-md);
          margin-top: var(--spacing-md);
        }

        &.superset-last {
          border-bottom-left-radius: var(--radius-md);
        }
      }

      &.superset-selected {
        outline: 2px solid var(--color-primary-500);
        outline-offset: 2px;
        border-radius: var(--radius-lg);
      }
    }

    .superset-action {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--color-primary-50);
      border: 1px dashed var(--color-primary-300);
      border-radius: var(--radius-lg);
      margin-top: var(--spacing-sm);
    }

    .superset-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .workout__finish {
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--color-border);
    }

    .add-exercise-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .no-workout {
      &__actions {
        display: flex;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-md);
      }
    }

    .templates-section {
      margin-top: var(--spacing-xl);

      h3 {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-md);
        text-align: center;
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
        h4 {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          color: var(--color-text);
          margin: 0;
        }

        span {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }
      }

      svg {
        color: var(--color-primary-600);
      }
    }

    .finish-modal {
      text-align: center;

      p {
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-lg);
      }

      &__stats {
        display: flex;
        justify-content: center;
        gap: var(--spacing-xl);
      }

      &__stat {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      &__stat-value {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
      }

      &__stat-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }
    }
  `]
})
export class WorkoutComponent implements OnInit {
  @ViewChild('restTimer') restTimer!: RestTimerComponent;

  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);
  templateService = inject(TemplateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showExercisePicker = false;
  showFinishModal = false;
  showCancelModal = false;
  showWorkoutMenu = false;
  showNotes = false;

  elapsedTime = signal('0:00');
  private timerInterval: number | null = null;

  // Superset selection state
  selectedExercises = signal<string[]>([]);

  // Computed property to group exercises with superset info
  groupedExercises = computed((): GroupedExercise[] => {
    const workout = this.workoutService.activeWorkout();
    if (!workout) return [];

    return workout.exercises.map((exercise) => {
      const isInSuperset = !!exercise.supersetId;
      return {
        ...exercise,
        isInSuperset,
        isFirstInSuperset: isInSuperset && this.workoutService.isFirstInSuperset(exercise.id),
        isLastInSuperset: isInSuperset && this.workoutService.isLastInSuperset(exercise.id),
      };
    });
  });

  ngOnInit(): void {
    // Check if we should start a new workout
    this.route.queryParams.subscribe(params => {
      if (params['start'] === 'true' && !this.workoutService.hasActiveWorkout()) {
        this.startEmptyWorkout();
      }
    });

    // Start timer if workout is active
    if (this.workoutService.hasActiveWorkout()) {
      this.startTimer();
    }
  }

  private startTimer(): void {
    this.updateElapsedTime();
    this.timerInterval = window.setInterval(() => {
      this.updateElapsedTime();
    }, 1000);
  }

  private updateElapsedTime(): void {
    const workout = this.workoutService.activeWorkout();
    if (!workout) return;

    const start = new Date(workout.startedAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 1000);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) {
      this.elapsedTime.set(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else {
      this.elapsedTime.set(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  }

  completedSets(): number {
    const workout = this.workoutService.activeWorkout();
    if (!workout) return 0;

    return workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.filter(s => s.isCompleted && !s.isWarmup).length;
    }, 0);
  }

  totalVolume(): number {
    const workout = this.workoutService.activeWorkout();
    if (!workout) return 0;

    return workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets
        .filter(s => s.isCompleted && !s.isWarmup)
        .reduce((sum, s) => sum + (s.actualReps || 0) * (s.actualWeight || 0), 0);
    }, 0);
  }

  startEmptyWorkout(): void {
    this.workoutService.startWorkout();
    this.startTimer();
    // Clear URL params
    this.router.navigate([], { queryParams: {} });
  }

  startFromTemplate(templateId: string): void {
    this.templateService.startWorkoutFromTemplate(templateId);
    this.startTimer();
  }

  updateWorkoutName(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.workoutService.updateWorkoutName(name);
  }

  updateWorkoutNotes(event: Event): void {
    const notes = (event.target as HTMLTextAreaElement).value;
    this.workoutService.updateWorkoutNotes(notes);
  }

  async addExercise(exercise: any): Promise<void> {
    const newExercise = await this.workoutService.addExerciseToWorkout(exercise.id);
    if (newExercise) {
      // Add 3 default sets
      for (let i = 0; i < 3; i++) {
        await this.workoutService.addSetToExercise(newExercise.id, {
          targetReps: 10
        });
      }
    }
    this.showExercisePicker = false;
  }

  async removeExercise(exerciseId: string): Promise<void> {
    await this.workoutService.removeExerciseFromWorkout(exerciseId);
  }

  async addSet(exerciseId: string, event: { isWarmup: boolean; targetWeight?: number; targetReps?: number }): Promise<void> {
    await this.workoutService.addSetToExercise(exerciseId, {
      isWarmup: event.isWarmup,
      targetWeight: event.targetWeight,
      targetReps: event.targetReps ?? 10
    });
  }

  async updateSet(exerciseId: string, setId: string, updates: Partial<WorkoutSet>): Promise<void> {
    await this.workoutService.updateSet(exerciseId, setId, updates);
  }

  completeSet(exerciseId: string, setId: string, reps: number, weight: number): void {
    this.workoutService.completeSet(exerciseId, setId, reps, weight);

    const workout = this.workoutService.activeWorkout();
    if (!workout) return;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    // Check if we should show rest timer
    if (exercise.supersetId) {
      // In a superset - only show rest if this is the last exercise in superset
      // AND we just completed the last set of that exercise
      const isLastSet = this.isLastSetOfExercise(exerciseId, setId);
      const isLastInSuperset = this.workoutService.isLastInSuperset(exerciseId);

      if (isLastSet && isLastInSuperset && this.restTimer) {
        this.restTimer.show(true);
      }
      // Otherwise, don't show rest - user moves to next exercise in superset
    } else {
      // Standalone exercise - normal rest timer behavior
      if (this.restTimer) {
        this.restTimer.show(true);
      }
    }
  }

  private isLastSetOfExercise(exerciseId: string, setId: string): boolean {
    const workout = this.workoutService.activeWorkout();
    if (!workout) return true;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return true;

    const nonWarmupSets = exercise.sets.filter((s) => !s.isWarmup);
    if (nonWarmupSets.length === 0) return true;

    return nonWarmupSets[nonWarmupSets.length - 1]?.id === setId;
  }

  // Superset selection methods
  toggleExerciseSelection(exerciseId: string, event: MouseEvent): void {
    // Only toggle selection if Ctrl/Cmd key is held or we're already in selection mode
    if (!event.ctrlKey && !event.metaKey && this.selectedExercises().length === 0) {
      return;
    }

    event.stopPropagation();

    const workout = this.workoutService.activeWorkout();
    if (!workout) return;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    // Don't allow selecting exercises already in a superset
    if (exercise?.supersetId) return;

    this.selectedExercises.update((selected) => {
      if (selected.includes(exerciseId)) {
        return selected.filter((id) => id !== exerciseId);
      }
      return [...selected, exerciseId];
    });
  }

  clearSelection(): void {
    this.selectedExercises.set([]);
  }

  async createSupersetFromSelection(): Promise<void> {
    const exerciseIds = this.selectedExercises();
    if (exerciseIds.length < 2) return;

    await this.workoutService.createSuperset(exerciseIds);
    this.clearSelection();
  }

  async removeSuperset(supersetId: string): Promise<void> {
    const exercises = this.workoutService.getExercisesInSuperset(supersetId);
    for (const exercise of exercises) {
      await this.workoutService.removeFromSuperset(exercise.id);
    }
  }

  saveAsTemplate(): void {
    this.showWorkoutMenu = false;
    // Would open a modal to save template
  }

  async finishWorkout(): Promise<void> {
    const completed = await this.workoutService.completeWorkout();
    this.showFinishModal = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (completed) {
      this.router.navigate(['/history', completed.id]);
    }
  }

  cancelWorkout(): void {
    this.workoutService.discardWorkout();
    this.showCancelModal = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
