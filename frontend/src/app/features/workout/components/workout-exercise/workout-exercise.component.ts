import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutExercise, WorkoutSet } from '../../../../core/models';
import { ExerciseService, WorkoutService, SettingsService, StatisticsService } from '../../../../core/services';
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
  private statisticsService = inject(StatisticsService);

  showMenu = false;
  showNotes = false;
  showWarmupCalculator = signal(false);
  workingWeight = signal(0);
  notesValue = signal('');
  private _progressionSuggestion = signal<ProgressionSuggestion | undefined>(undefined);

  warmupSets = computed((): WarmupSet[] => {
    const weight = this.workingWeight();
    if (weight <= 0) return [];
    return calculateWarmupSets(weight, this.settingsService.weightUnit());
  });

  ngOnInit(): void {
    this._progressionSuggestion.set(this.calculateProgressionSuggestion());
    this.notesValue.set(this.exercise.notes ?? '');
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
    const suggestion = this.statisticsService.getSuggestionForExercise(this.exercise.exerciseTemplateId);
    if (!suggestion || suggestion.suggestionType === 'maintain') {
      return undefined;
    }

    return {
      suggestedWeight: suggestion.suggestedWeight ?? suggestion.currentWeight,
      suggestedReps: suggestion.suggestedReps ?? undefined,
      type: suggestion.suggestionType,
      reason: suggestion.reason,
    };
  }

  toggleNotes(): void {
    this.showMenu = false;
    this.showNotes = !this.showNotes;
  }

  saveNotes(): void {
    this.workoutService.updateExerciseNotes(this.exercise.id, this.notesValue());
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
