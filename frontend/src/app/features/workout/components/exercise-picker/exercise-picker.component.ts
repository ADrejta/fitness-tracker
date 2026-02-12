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
  selector: "app-exercise-picker",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    InputComponent,
    BadgeComponent,
  ],
  template: `
    <app-modal
      [isOpen]="isOpen"
      title="Add Exercise"
      [showFooter]="false"
      [noPadding]="true"
      size="lg"
      (closed)="close()"
    >
      <div class="picker">
        <!-- Search -->
        <div class="picker__search">
          <app-input
            type="search"
            placeholder="Search exercises..."
            [clearable]="true"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>

        <!-- Muscle Group Filters -->
        <div class="picker__filters">
          <button
            class="filter-chip"
            [class.filter-chip--active]="selectedMuscleGroup() === null"
            (click)="selectedMuscleGroup.set(null)"
          >
            All
          </button>
          @for (group of popularMuscleGroups; track group) {
            <button
              class="filter-chip"
              [class.filter-chip--active]="selectedMuscleGroup() === group"
              (click)="selectedMuscleGroup.set(group)"
            >
              {{ exerciseService.getMuscleGroupLabel(group) }}
            </button>
          }
        </div>

        <!-- Exercise List -->
        <div class="picker__list">
          @if (filteredExercises().length > 0) {
            @for (exercise of filteredExercises(); track exercise.id) {
              <button class="exercise-item" (click)="selectExercise(exercise)">
                <div class="exercise-item__info">
                  <h4 class="exercise-item__name">{{ exercise.name }}</h4>
                  <div class="exercise-item__tags">
                    @for (
                      muscle of exercise.muscleGroups.slice(0, 2);
                      track muscle
                    ) {
                      <app-badge [size]="'sm'" [variant]="'default'">
                        {{ exerciseService.getMuscleGroupLabel(muscle) }}
                      </app-badge>
                    }
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            }
          } @else {
            <div class="picker__empty">
              <p>No exercises found</p>
              @if (searchQuery()) {
                <button class="picker__clear" (click)="searchQuery.set('')">
                  Clear search
                </button>
              }
            </div>
          }
        </div>
      </div>
    </app-modal>
  `,
  styles: [
    `
      .picker {
        display: flex;
        flex-direction: column;
        height: 70vh;
        max-height: 600px;
      }

      .picker__search {
        padding: var(--spacing-md);
        border-bottom: 1px solid var(--color-border-light);
      }

      .picker__filters {
        display: flex;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        overflow-x: auto;
        border-bottom: 1px solid var(--color-border-light);
        scrollbar-width: none;

        &::-webkit-scrollbar {
          display: none;
        }
      }

      .filter-chip {
        flex-shrink: 0;
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        background: var(--color-background-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          background: var(--color-background-tertiary);
        }

        &--active {
          background: var(--color-primary-600);
          color: white;
          border-color: var(--color-primary-600);
        }
      }

      .picker__list {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-sm);
      }

      .exercise-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: var(--spacing-md);
        background: none;
        border: none;
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: background var(--transition-fast);
        text-align: left;

        &:hover {
          background: var(--color-background-secondary);
        }

        &__info {
          flex: 1;
        }

        &__name {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          color: var(--color-text);
          margin: 0 0 var(--spacing-xs);
        }

        &__tags {
          display: flex;
          gap: var(--spacing-xs);
        }

        svg {
          color: var(--color-primary-600);
          flex-shrink: 0;
        }
      }

      .picker__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-2xl);
        color: var(--color-text-secondary);
        text-align: center;

        p {
          margin: 0 0 var(--spacing-sm);
        }
      }

      .picker__clear {
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: var(--font-size-sm);
        color: var(--color-primary-600);
        background: none;
        border: none;
        cursor: pointer;

        &:hover {
          text-decoration: underline;
        }
      }
    `,
  ],
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
