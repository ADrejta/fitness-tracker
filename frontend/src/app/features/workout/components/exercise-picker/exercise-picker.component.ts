import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  OnChanges,
  SimpleChanges,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  ModalComponent,
  InputComponent,
  BadgeComponent,
} from "../../../../shared/components";
import { ExerciseService, WorkoutService } from "../../../../core/services";
import { ExerciseTemplate, MuscleGroup } from "../../../../core/models";

@Component({
    standalone: true,
    selector: "app-exercise-picker",
    imports: [
        CommonModule,
        FormsModule,
        ModalComponent,
        InputComponent,
        BadgeComponent,
    ],
    templateUrl: './exercise-picker.component.html',
    styleUrls: ['./exercise-picker.component.scss']
})
export class ExercisePickerComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() exerciseSelected = new EventEmitter<ExerciseTemplate>();

  private el = inject(ElementRef);
  exerciseService = inject(ExerciseService);
  private workoutService = inject(WorkoutService);

  searchQuery = signal("");
  selectedMuscleGroup = signal<MuscleGroup | null>(null);
  showAllMuscleGroups = signal(false);

  popularMuscleGroups: MuscleGroup[] = [
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "quads",
    "hamstrings",
    "glutes",
  ];

  extraMuscleGroups: MuscleGroup[] = [
    "forearms",
    "abs",
    "obliques",
    "calves",
    "traps",
    "lats",
    "lower-back",
    "adductors",
  ];

  displayedMuscleGroups = computed(() => {
    if (this.showAllMuscleGroups()) {
      return [...this.popularMuscleGroups, ...this.extraMuscleGroups];
    }
    return this.popularMuscleGroups;
  });

  toggleMoreMuscleGroups(): void {
    this.showAllMuscleGroups.update(v => !v);
  }

  recentExercises = computed(() => {
    const completedWorkouts = this.workoutService.completedWorkouts();
    const seen = new Set<string>();
    const recentIds: string[] = [];

    for (const workout of completedWorkouts) {
      for (const exercise of workout.exercises) {
        if (!seen.has(exercise.exerciseTemplateId)) {
          seen.add(exercise.exerciseTemplateId);
          recentIds.push(exercise.exerciseTemplateId);
          if (recentIds.length >= 5) break;
        }
      }
      if (recentIds.length >= 5) break;
    }

    return recentIds
      .map(id => this.exerciseService.getExerciseById(id))
      .filter((e): e is ExerciseTemplate => e !== undefined);
  });

  showRecentSection = computed(() => {
    return !this.searchQuery().trim() && this.recentExercises().length > 0;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      // Delay to allow the modal to render, then focus the search input
      setTimeout(() => {
        const input = (this.el.nativeElement as HTMLElement).querySelector('.picker__search input');
        if (input instanceof HTMLElement) {
          input.focus();
        }
      }, 150);
    }
  }

  filteredExercises = computed(() => {
    let exercises = this.exerciseService.exercises();
    const query = this.searchQuery().toLowerCase().trim();
    const muscleGroup = this.selectedMuscleGroup();

    if (query) {
      exercises = exercises.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.muscleGroups.some((m) => m.toLowerCase().includes(query)),
      );
    }

    if (muscleGroup) {
      exercises = exercises.filter((e) => e.muscleGroups.includes(muscleGroup));
    }

    return exercises.sort((a, b) => a.name.localeCompare(b.name));
  });

  close(): void {
    this.searchQuery.set("");
    this.selectedMuscleGroup.set(null);
    this.showAllMuscleGroups.set(false);
    this.closed.emit();
  }

  selectExercise(exercise: ExerciseTemplate): void {
    this.exerciseSelected.emit(exercise);
    this.close();
  }
}
