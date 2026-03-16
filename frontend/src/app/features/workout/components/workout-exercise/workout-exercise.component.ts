import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutExercise, WorkoutSet } from '../../../../core/models';
import { ExerciseService, WorkoutService, SettingsService, StatisticsService } from '../../../../core/services';
import { CardComponent, BadgeComponent } from '../../../../shared/components';
import { SetRowComponent, ProgressionSuggestion } from '../set-row/set-row.component';
import { calculateWarmupSets, WarmupSet } from '../../../../shared/utils';

@Component({
    standalone: true,
    selector: 'app-workout-exercise',
    imports: [CommonModule, FormsModule, CardComponent, BadgeComponent, SetRowComponent],
    templateUrl: './workout-exercise.component.html',
    styleUrls: ['./workout-exercise.component.scss']
})
export class WorkoutExerciseComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() exercise!: WorkoutExercise;
  @ViewChild('stickyHeader', { static: false }) stickyHeaderRef!: ElementRef<HTMLElement>;

  @Output() setAdded = new EventEmitter<{ isWarmup: boolean; targetWeight?: number; targetReps?: number }>();
  @Output() setRemoved = new EventEmitter<string>();
  @Output() setUpdated = new EventEmitter<{ setId: string; updates: Partial<WorkoutSet> }>();
  @Output() setCompleted = new EventEmitter<{ setId: string; updates: Partial<WorkoutSet> }>();
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
  isStuck = signal(false);
  isCollapsed = signal(false);
  private _progressionSuggestion = signal<ProgressionSuggestion | undefined>(undefined);
  private stickyObserver: IntersectionObserver | null = null;
  private sentinelEl: HTMLElement | null = null;
  private _previousAllCompleted = false;

  warmupSets = computed((): WarmupSet[] => {
    const weight = this.workingWeight();
    if (weight <= 0) return [];
    return calculateWarmupSets(weight, this.settingsService.weightUnit());
  });

  ngOnInit(): void {
    this._progressionSuggestion.set(this.calculateProgressionSuggestion());
    this.notesValue.set(this.exercise.notes ?? '');
  }

  ngAfterViewInit(): void {
    this.setupStickyObserver();
  }

  ngOnDestroy(): void {
    if (this.stickyObserver) {
      this.stickyObserver.disconnect();
    }
    if (this.sentinelEl) {
      this.sentinelEl.remove();
    }
  }

  private setupStickyObserver(): void {
    if (!this.stickyHeaderRef) return;

    const headerEl = this.stickyHeaderRef.nativeElement;
    // Insert a zero-height sentinel element just before the header.
    // When the sentinel scrolls out of view (above the sticky offset), the header is stuck.
    this.sentinelEl = document.createElement('div');
    this.sentinelEl.style.height = '0';
    this.sentinelEl.style.width = '100%';
    this.sentinelEl.style.pointerEvents = 'none';
    this.sentinelEl.setAttribute('aria-hidden', 'true');
    headerEl.parentElement?.insertBefore(this.sentinelEl, headerEl);

    // rootMargin: negative top margin equal to header height so we detect when
    // the sentinel passes behind the sticky header. We read the CSS variable.
    const headerHeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height').trim() || '4rem';

    this.stickyObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // When the sentinel is NOT intersecting, the header is stuck
          this.isStuck.set(!entry.isIntersecting);
        }
      },
      {
        threshold: [0],
        rootMargin: `-${headerHeight} 0px 0px 0px`,
      }
    );
    this.stickyObserver.observe(this.sentinelEl);
  }

  get progressionSuggestion(): ProgressionSuggestion | undefined {
    return this._progressionSuggestion();
  }

  get muscleGroups() {
    const template = this.exerciseService.getExerciseById(this.exercise.exerciseTemplateId);
    return template?.muscleGroups || [];
  }

  private get exerciseCategory(): string {
    return this.exercise.exerciseCategory
      ?? this.exerciseService.getExerciseById(this.exercise.exerciseTemplateId)?.category
      ?? 'strength';
  }

  get isCardio(): boolean { return this.exerciseCategory === 'cardio'; }
  get isBodyweight(): boolean { return this.exerciseCategory === 'bodyweight'; }
  get isCarry(): boolean { return this.exerciseCategory === 'carry'; }
  get isTimed(): boolean { return this.exerciseCategory === 'timed'; }

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

  onNotesBlur(): void {
    this.saveNotes();
  }

  addSet(): void {
    this.showMenu = false;
    this.setAdded.emit({ isWarmup: false });
  }

  addWarmupSet(): void {
    // Pre-fill weight from last working set if available
    const lastWorkingSet = [...this.exercise.sets].reverse().find(s => !s.isWarmup);
    this.setAdded.emit({
      isWarmup: true,
      targetReps: 10,
      targetWeight: lastWorkingSet?.targetWeight,
    });
  }

  openWarmupCalculator(): void {
    this.showMenu = false;
    // Pre-fill working weight from first working set's target weight
    const firstWorkingSet = this.exercise.sets.find(s => !s.isWarmup && s.targetWeight);
    if (firstWorkingSet?.targetWeight && this.workingWeight() === 0) {
      this.workingWeight.set(firstWorkingSet.targetWeight);
    }
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

  onSetCompleted(setId: string, updates: Partial<WorkoutSet>): void {
    this.setCompleted.emit({ setId, updates });
    // Defer check so the parent has time to update the set's isCompleted flag
    setTimeout(() => this.checkAutoCollapse(), 0);
  }

  onSetUncompleted(setId: string): void {
    this.setUpdated.emit({ setId, updates: { isCompleted: false, completedAt: undefined } });
    // Update the tracking flag so re-completing later can trigger collapse again
    setTimeout(() => { this._previousAllCompleted = this.allSetsCompleted; }, 0);
  }

  /** True when every non-warmup set is completed */
  get allSetsCompleted(): boolean {
    const workingSets = this.exercise.sets.filter(s => !s.isWarmup);
    return workingSets.length > 0 && workingSets.every(s => s.isCompleted);
  }

  /** Summary string for the collapsed view, e.g. "3 sets — 80kg×8, 80kg×8, 80kg×7" */
  get completionSummary(): string {
    const unit = this.settingsService.weightUnit();
    const workingSets = this.exercise.sets.filter(s => !s.isWarmup && s.isCompleted);
    const setDescriptions = workingSets.map(s => {
      const weight = s.actualWeight ?? s.targetWeight ?? 0;
      const reps = s.actualReps ?? s.targetReps ?? 0;
      return `${weight}${unit}\u00D7${reps}`;
    });
    return `${workingSets.length} set${workingSets.length !== 1 ? 's' : ''} \u2014 ${setDescriptions.join(', ')}`;
  }

  /** Check completion status and auto-collapse if all sets just became completed */
  checkAutoCollapse(): void {
    const allDone = this.allSetsCompleted;
    if (allDone && !this._previousAllCompleted) {
      this.isCollapsed.set(true);
    }
    this._previousAllCompleted = allDone;
  }

  toggleCollapsed(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }
}
