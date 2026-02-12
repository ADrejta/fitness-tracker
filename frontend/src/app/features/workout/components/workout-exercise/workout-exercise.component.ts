import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutExercise, WorkoutSet } from '../../../../core/models';
import { ExerciseService, WorkoutService, SettingsService } from '../../../../core/services';
import { CardComponent, BadgeComponent } from '../../../../shared/components';
import { SetRowComponent, ProgressionSuggestion } from '../set-row/set-row.component';
import { calculateWarmupSets, WarmupSet } from '../../../../shared/utils';

@Component({
  selector: 'app-workout-exercise',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, BadgeComponent, SetRowComponent],
  template: `
    <div class="workout-exercise">
      <div class="workout-exercise__header">
        <div class="workout-exercise__info">
          <h3 class="workout-exercise__name">{{ exercise.exerciseName }}</h3>
          <div class="workout-exercise__tags">
            @for (muscle of muscleGroups.slice(0, 2); track muscle) {
              <app-badge [size]="'sm'" [variant]="'default'">
                {{ exerciseService.getMuscleGroupLabel(muscle) }}
              </app-badge>
            }
          </div>
        </div>
        <button class="workout-exercise__menu" (click)="showMenu = !showMenu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>

        @if (showMenu) {
          <div class="workout-exercise__dropdown">
            <button (click)="openWarmupCalculator()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
              </svg>
              Warm-up Calculator
            </button>
            <button (click)="removeExercise()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Remove exercise
            </button>
          </div>
        }

        @if (showWarmupCalculator()) {
          <div class="warmup-calculator">
            <div class="warmup-calculator__header">
              <h4>Warm-up Calculator</h4>
              <button class="warmup-calculator__close" (click)="closeWarmupCalculator()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="warmup-calculator__input">
              <label>Working Weight</label>
              <div class="warmup-calculator__input-row">
                <input
                  type="number"
                  [ngModel]="workingWeight()"
                  (ngModelChange)="workingWeight.set($event)"
                  placeholder="0"
                  min="0"
                />
                <span class="warmup-calculator__unit">{{ settingsService.weightUnit() }}</span>
              </div>
            </div>
            @if (warmupSets().length > 0) {
              <div class="warmup-calculator__preview">
                <label>Suggested Warm-ups</label>
                <div class="warmup-calculator__sets">
                  @for (set of warmupSets(); track $index) {
                    <div class="warmup-calculator__set">
                      <span class="warmup-calculator__set-num">{{ $index + 1 }}.</span>
                      <span class="warmup-calculator__set-weight">
                        {{ set.label === 'Bar' ? 'Bar' : '' }} ({{ set.weight }} {{ settingsService.weightUnit() }})
                      </span>
                      <span class="warmup-calculator__set-reps">× {{ set.reps }} reps</span>
                    </div>
                  }
                </div>
              </div>
              <button class="warmup-calculator__add" (click)="addWarmupSets()">
                Add {{ warmupSets().length }} Warm-up Set{{ warmupSets().length > 1 ? 's' : '' }}
              </button>
            } @else if (workingWeight() > 0) {
              <div class="warmup-calculator__empty">
                <p>No warm-ups needed - weight is at or below bar weight.</p>
              </div>
            }
          </div>
        }
      </div>

      <div class="workout-exercise__sets">
        <div class="workout-exercise__sets-header">
          <span>Set</span>
          <span class="workout-exercise__sets-header-previous">Previous</span>
          <span class="workout-exercise__sets-header-main">Weight × Reps</span>
          <span></span>
        </div>

        @for (set of exercise.sets; track set.id) {
          <app-set-row
            [set]="set"
            [previousSet]="getPreviousSetData(set)"
            [progressionSuggestion]="progressionSuggestion"
            (setUpdated)="onSetUpdated(set.id, $event)"
            (setCompleted)="onSetCompleted(set.id, $event)"
            (setUncompleted)="onSetUncompleted(set.id)"
          />
        }
      </div>

      <button class="workout-exercise__add-set" (click)="addSet()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Set
      </button>
    </div>
  `,
  styles: [`
    .workout-exercise {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .workout-exercise__header {
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: var(--spacing-md);
      background: var(--color-background-secondary);
      border-bottom: 1px solid var(--color-border-light);
    }

    .workout-exercise__info {
      flex: 1;
    }

    .workout-exercise__name {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin: 0 0 var(--spacing-xs);
    }

    .workout-exercise__tags {
      display: flex;
      gap: var(--spacing-xs);
    }

    .workout-exercise__menu {
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
        background: var(--color-background-tertiary);
      }
    }

    .workout-exercise__dropdown {
      position: absolute;
      top: 100%;
      right: var(--spacing-md);
      z-index: 10;
      min-width: 180px;
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

        &:last-child {
          color: var(--color-danger-600);
        }
      }
    }

    .workout-exercise__sets {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .workout-exercise__sets-header {
      display: grid;
      grid-template-columns: 2.5rem 1fr 3rem;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) 0;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;

      @media (min-width: 480px) {
        grid-template-columns: 2.5rem 5rem 1fr 3rem;
      }
    }

    .workout-exercise__sets-header-previous {
      display: none;

      @media (min-width: 480px) {
        display: block;
      }
    }

    .workout-exercise__sets-header-main {
      text-align: center;
    }

    .workout-exercise__add-set {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      width: 100%;
      padding: var(--spacing-sm);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-primary-600);
      background: none;
      border: none;
      border-top: 1px solid var(--color-border-light);
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-primary-50);
      }
    }

    .warmup-calculator {
      position: absolute;
      top: 100%;
      right: var(--spacing-md);
      z-index: 20;
      width: 280px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }

    .warmup-calculator__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-background-secondary);
      border-bottom: 1px solid var(--color-border-light);

      h4 {
        margin: 0;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
      }
    }

    .warmup-calculator__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--color-text-tertiary);
      cursor: pointer;

      &:hover {
        background: var(--color-background-tertiary);
        color: var(--color-text-secondary);
      }
    }

    .warmup-calculator__input {
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--color-border-light);

      label {
        display: block;
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--spacing-xs);
      }
    }

    .warmup-calculator__input-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      input {
        flex: 1;
        padding: var(--spacing-sm);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        background: var(--color-background-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        text-align: center;

        &:focus {
          outline: none;
          border-color: var(--color-primary-500);
        }

        &::placeholder {
          color: var(--color-text-tertiary);
        }
      }
    }

    .warmup-calculator__unit {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
    }

    .warmup-calculator__preview {
      padding: var(--spacing-md);

      label {
        display: block;
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--spacing-sm);
      }
    }

    .warmup-calculator__sets {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .warmup-calculator__set {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--color-background-secondary);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }

    .warmup-calculator__set-num {
      color: var(--color-text-tertiary);
      font-weight: var(--font-weight-medium);
    }

    .warmup-calculator__set-weight {
      flex: 1;
      color: var(--color-text);
      font-weight: var(--font-weight-medium);
    }

    .warmup-calculator__set-reps {
      color: var(--color-text-secondary);
    }

    .warmup-calculator__empty {
      padding: var(--spacing-md);

      p {
        margin: 0;
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        text-align: center;
      }
    }

    .warmup-calculator__add {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-white);
      background: var(--color-primary-600);
      border: none;
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-primary-700);
      }
    }
  `]
})
export class WorkoutExerciseComponent implements OnInit {
  @Input() exercise!: WorkoutExercise;

  @Output() setAdded = new EventEmitter<{ isWarmup: boolean; targetWeight?: number; targetReps?: number }>();
  @Output() setRemoved = new EventEmitter<string>();
  @Output() setUpdated = new EventEmitter<{ setId: string; updates: Partial<WorkoutSet> }>();
  @Output() setCompleted = new EventEmitter<{ setId: string; reps: number; weight: number }>();
  @Output() exerciseRemoved = new EventEmitter<void>();

  exerciseService = inject(ExerciseService);
  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);

  showMenu = false;
  showWarmupCalculator = signal(false);
  workingWeight = signal(0);
  private _progressionSuggestion = signal<ProgressionSuggestion | undefined>(undefined);

  warmupSets = computed((): WarmupSet[] => {
    const weight = this.workingWeight();
    if (weight <= 0) return [];
    return calculateWarmupSets(weight, this.settingsService.weightUnit());
  });

  ngOnInit(): void {
    this._progressionSuggestion.set(this.calculateProgressionSuggestion());
  }

  get progressionSuggestion(): ProgressionSuggestion | undefined {
    return this._progressionSuggestion();
  }

  get muscleGroups() {
    const template = this.exerciseService.getExerciseById(this.exercise.exerciseTemplateId);
    return template?.muscleGroups || [];
  }

  getPreviousSetData(currentSet: WorkoutSet): WorkoutSet | undefined {
    // Get previous workout data for this exercise
    const previousWorkouts = this.workoutService.getWorkoutsForExercise(this.exercise.exerciseTemplateId);
    if (previousWorkouts.length === 0) return undefined;

    const lastWorkout = previousWorkouts[0];
    const exercise = lastWorkout.exercises.find(e => e.exerciseTemplateId === this.exercise.exerciseTemplateId);
    if (!exercise) return undefined;

    return exercise.sets.find(s => s.setNumber === currentSet.setNumber && !s.isWarmup);
  }

  calculateProgressionSuggestion(): ProgressionSuggestion | undefined {
    const previousWorkouts = this.workoutService.getWorkoutsForExercise(this.exercise.exerciseTemplateId);
    if (previousWorkouts.length < 2) return undefined;

    // Get the last 2 workouts for analysis
    const recentWorkouts = previousWorkouts.slice(0, 2);
    const unit = this.settingsService.weightUnit();
    const increment = unit === 'kg' ? 2.5 : 5;

    // Check if user completed all working sets at or above target reps in both sessions
    let allSetsSuccessful = true;
    let lastWeight: number | undefined;

    for (const workout of recentWorkouts) {
      const exercise = workout.exercises.find(e => e.exerciseTemplateId === this.exercise.exerciseTemplateId);
      if (!exercise) {
        allSetsSuccessful = false;
        break;
      }

      const workingSets = exercise.sets.filter(s => !s.isWarmup && s.isCompleted);
      if (workingSets.length === 0) {
        allSetsSuccessful = false;
        break;
      }

      // Check if all working sets met or exceeded target reps
      for (const set of workingSets) {
        const targetReps = set.targetReps || 0;
        const actualReps = set.actualReps || 0;
        if (actualReps < targetReps) {
          allSetsSuccessful = false;
          break;
        }
      }

      if (!allSetsSuccessful) break;

      // Track the weight used (use max weight from working sets)
      const maxWeight = Math.max(...workingSets.map(s => s.actualWeight || 0));
      if (lastWeight === undefined) {
        lastWeight = maxWeight;
      }
    }

    if (!allSetsSuccessful || lastWeight === undefined || lastWeight === 0) {
      return undefined;
    }

    // Suggest the next weight increment
    const suggestedWeight = lastWeight + increment;

    return {
      suggestedWeight,
      reason: `You completed all sets at ${lastWeight}${unit} in your last 2 sessions. Try ${suggestedWeight}${unit}!`
    };
  }

  addSet(): void {
    this.showMenu = false;
    this.setAdded.emit({ isWarmup: false });
  }

  openWarmupCalculator(): void {
    this.showMenu = false;
    this.showWarmupCalculator.set(true);
  }

  closeWarmupCalculator(): void {
    this.showWarmupCalculator.set(false);
  }

  addWarmupSets(): void {
    const sets = this.warmupSets();
    for (const set of sets) {
      this.setAdded.emit({
        isWarmup: true,
        targetWeight: set.weight,
        targetReps: set.reps
      });
    }
    this.closeWarmupCalculator();
    this.workingWeight.set(0);
  }

  removeExercise(): void {
    this.showMenu = false;
    this.exerciseRemoved.emit();
  }

  onSetUpdated(setId: string, updates: Partial<WorkoutSet>): void {
    this.setUpdated.emit({ setId, updates });
  }

  onSetCompleted(setId: string, data: { reps: number; weight: number }): void {
    this.setCompleted.emit({ setId, ...data });
  }

  onSetUncompleted(setId: string): void {
    this.setUpdated.emit({ setId, updates: { isCompleted: false, completedAt: undefined } });
  }
}
