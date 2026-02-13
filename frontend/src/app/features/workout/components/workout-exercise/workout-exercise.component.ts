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
  templateUrl: './workout-exercise.component.html',
  styleUrls: ['./workout-exercise.component.scss']
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
