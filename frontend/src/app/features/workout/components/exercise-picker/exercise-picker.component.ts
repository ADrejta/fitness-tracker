import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  ModalComponent,
  InputComponent,
  BadgeComponent,
} from "../../../../shared/components";
import { ExerciseService } from "../../../../core/services";
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
export class ExercisePickerComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() exerciseSelected = new EventEmitter<ExerciseTemplate>();

  exerciseService = inject(ExerciseService);

  searchQuery = signal("");
  selectedMuscleGroup = signal<MuscleGroup | null>(null);

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
    this.closed.emit();
  }

  selectExercise(exercise: ExerciseTemplate): void {
    this.exerciseSelected.emit(exercise);
    this.close();
  }
}
