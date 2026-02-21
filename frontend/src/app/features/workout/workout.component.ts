import { Component, inject, OnInit, ViewChild, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
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
    standalone: true,
    selector: 'app-workout',
    imports: [
        CommonModule,
        PageContainerComponent,
        ButtonComponent,
        CardComponent,
        ModalComponent,
        EmptyStateComponent,
        ExercisePickerComponent,
        WorkoutExerciseComponent,
        RestTimerComponent,
        CdkDropList,
        CdkDrag,
        CdkDragHandle,
    ],
    templateUrl: './workout.component.html',
    styleUrls: ['./workout.component.scss']
})
export class WorkoutComponent implements OnInit {
  @ViewChild('restTimer') restTimer!: RestTimerComponent;

  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);
  templateService = inject(TemplateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  showExercisePicker = false;
  showFinishModal = false;
  showCancelModal = false;
  showWorkoutMenu = false;
  showNotes = false;
  tagInput = '';

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
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
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

  async startFromTemplate(templateId: string): Promise<void> {
    const workout = await this.templateService.startWorkoutFromTemplate(templateId);
    if (workout) {
      this.startTimer();
    }
  }

  updateWorkoutName(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.workoutService.updateWorkoutName(name);
  }

  updateWorkoutNotes(event: Event): void {
    const notes = (event.target as HTMLTextAreaElement).value;
    this.workoutService.updateWorkoutNotes(notes);
  }

  onTagInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTagFromInput();
    }
  }

  addTagFromInput(): void {
    const tag = this.tagInput.trim().toLowerCase();
    if (tag) {
      this.addTag(tag);
      this.tagInput = '';
    }
  }

  addTag(tag: string): void {
    const workout = this.workoutService.activeWorkout();
    if (!workout) return;
    const currentTags = workout.tags ?? [];
    if (!currentTags.includes(tag)) {
      this.workoutService.updateWorkoutTags([...currentTags, tag]);
    }
  }

  removeTag(tag: string): void {
    const workout = this.workoutService.activeWorkout();
    if (!workout) return;
    const currentTags = workout.tags ?? [];
    this.workoutService.updateWorkoutTags(currentTags.filter(t => t !== tag));
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

  async removeSet(exerciseId: string, setId: string): Promise<void> {
    await this.workoutService.removeSet(exerciseId, setId);
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

  onExerciseDrop(event: CdkDragDrop<GroupedExercise[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const exercises = [...this.groupedExercises()];
    moveItemInArray(exercises, event.previousIndex, event.currentIndex);
    const ids = exercises.map(e => e.id);
    this.workoutService.reorderExercises(ids);
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
