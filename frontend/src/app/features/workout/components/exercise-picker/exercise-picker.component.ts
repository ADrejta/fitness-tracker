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
export class ExercisePickerComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() exerciseSelected = new EventEmitter<ExerciseTemplate>();

  private el = inject(ElementRef);
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
    this.closed.emit();
  }

  selectExercise(exercise: ExerciseTemplate): void {
    this.exerciseSelected.emit(exercise);
    this.close();
  }
}
