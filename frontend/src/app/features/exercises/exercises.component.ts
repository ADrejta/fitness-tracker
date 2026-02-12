import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageContainerComponent } from '../../layout';
import { CardComponent, ButtonComponent, InputComponent, BadgeComponent, ModalComponent } from '../../shared/components';
import { ExerciseService } from '../../core/services';
import { ExerciseTemplate, MuscleGroup } from '../../core/models';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageContainerComponent,
    CardComponent,
    ButtonComponent,
    InputComponent,
    BadgeComponent,
    ModalComponent
  ],
  template: `
    <app-page-container title="Exercise Library" subtitle="Browse and manage exercises">
      <!-- Search -->
      <div class="search-bar">
        <app-input
          type="search"
          placeholder="Search exercises..."
          [clearable]="true"
          [(ngModel)]="searchQuery"
        />
      </div>

      <!-- Filters -->
      <div class="filters">
        <button
          class="filter-chip"
          [class.filter-chip--active]="selectedMuscle() === null"
          (click)="selectedMuscle.set(null)"
        >
          All
        </button>
        @for (muscle of muscleGroups; track muscle) {
          <button
            class="filter-chip"
            [class.filter-chip--active]="selectedMuscle() === muscle"
            (click)="selectedMuscle.set(muscle)"
          >
            {{ exerciseService.getMuscleGroupLabel(muscle) }}
          </button>
        }
      </div>

      <!-- Exercise Count -->
      <p class="exercise-count">{{ filteredExercises().length }} exercises</p>

      <!-- Exercise List -->
      <div class="exercise-list">
        @for (exercise of filteredExercises(); track exercise.id) {
          <app-card [interactive]="true" (click)="viewExercise(exercise)">
            <div class="exercise-item">
              <div class="exercise-item__info">
                <h3 class="exercise-item__name">{{ exercise.name }}</h3>
                <div class="exercise-item__tags">
                  @for (muscle of exercise.muscleGroups.slice(0, 3); track muscle) {
                    <app-badge [size]="'sm'">{{ exerciseService.getMuscleGroupLabel(muscle) }}</app-badge>
                  }
                </div>
              </div>
              @if (exercise.isCustom) {
                <app-badge [variant]="'primary'" [size]="'sm'">Custom</app-badge>
              }
            </div>
          </app-card>
        }
      </div>

      <!-- Add Custom Exercise Button -->
      <div class="fab">
        <app-button [iconOnly]="true" (clicked)="showAddModal = true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </app-button>
      </div>

      <!-- Exercise Detail Modal -->
      <app-modal
        [isOpen]="showDetailModal"
        [title]="selectedExercise?.name || ''"
        [showFooter]="!!selectedExercise?.isCustom"
        (closed)="closeDetailModal()"
      >
        @if (selectedExercise) {
          <div class="exercise-detail">
            <div class="detail-section">
              <h4>Muscle Groups</h4>
              <div class="detail-tags">
                @for (muscle of selectedExercise.muscleGroups; track muscle) {
                  <app-badge>{{ exerciseService.getMuscleGroupLabel(muscle) }}</app-badge>
                }
              </div>
            </div>
            <div class="detail-section">
              <h4>Equipment</h4>
              <div class="detail-tags">
                @for (eq of selectedExercise.equipment; track eq) {
                  <app-badge [variant]="'default'">{{ exerciseService.getEquipmentLabel(eq) }}</app-badge>
                }
              </div>
            </div>
            @if (selectedExercise.description) {
              <div class="detail-section">
                <h4>Description</h4>
                <p>{{ selectedExercise.description }}</p>
              </div>
            }
          </div>
        }
        @if (selectedExercise?.isCustom) {
          <div modal-footer>
            <app-button variant="danger" (clicked)="deleteExercise()">Delete</app-button>
            <app-button variant="ghost" (clicked)="closeDetailModal()">Close</app-button>
          </div>
        }
      </app-modal>

      <!-- Add Exercise Modal -->
      <app-modal
        [isOpen]="showAddModal"
        title="Add Custom Exercise"
        [showFooter]="true"
        (closed)="closeAddModal()"
      >
        <div class="form-stack">
          <app-input
            label="Exercise Name"
            placeholder="e.g., Cable Fly"
            [(ngModel)]="newExercise.name"
          />
          <div class="form-field">
            <label>Muscle Groups</label>
            <div class="checkbox-grid">
              @for (muscle of muscleGroups; track muscle) {
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    [checked]="newExercise.muscleGroups.includes(muscle)"
                    (change)="toggleMuscle(muscle)"
                  />
                  {{ exerciseService.getMuscleGroupLabel(muscle) }}
                </label>
              }
            </div>
          </div>
        </div>
        <div modal-footer>
          <app-button variant="ghost" (clicked)="closeAddModal()">Cancel</app-button>
          <app-button (clicked)="addExercise()" [disabled]="!newExercise.name">Add</app-button>
        </div>
      </app-modal>
    </app-page-container>
  `,
  styles: [`
    .search-bar {
      margin-bottom: var(--spacing-md);
    }

    .filters {
      display: flex;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
      overflow-x: auto;
      padding-bottom: var(--spacing-xs);

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

      &--active {
        background: var(--color-primary-600);
        color: white;
        border-color: var(--color-primary-600);
      }
    }

    .exercise-count {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-md);
    }

    .exercise-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .exercise-item {
      display: flex;
      align-items: center;
      justify-content: space-between;

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
    }

    .fab {
      position: fixed;
      bottom: calc(var(--nav-height) + var(--spacing-md) + env(safe-area-inset-bottom, 0));
      right: var(--spacing-md);

      @media (min-width: 1024px) {
        bottom: var(--spacing-lg);
      }
    }

    .exercise-detail {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .detail-section {
      h4 {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-secondary);
        margin: 0 0 var(--spacing-sm);
      }

      p {
        color: var(--color-text);
        margin: 0;
      }
    }

    .detail-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .form-stack {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .form-field {
      label {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        margin-bottom: var(--spacing-sm);
      }
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-sm);
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      cursor: pointer;
    }
  `]
})
export class ExercisesComponent {
  exerciseService = inject(ExerciseService);

  searchQuery = '';
  selectedMuscle = signal<MuscleGroup | null>(null);
  showDetailModal = false;
  showAddModal = false;
  selectedExercise: ExerciseTemplate | null = null;

  muscleGroups = this.exerciseService.getMuscleGroups();

  newExercise = {
    name: '',
    muscleGroups: [] as MuscleGroup[]
  };

  filteredExercises = computed(() => {
    let exercises = this.exerciseService.exercises();
    const query = this.searchQuery.toLowerCase();
    const muscle = this.selectedMuscle();

    if (query) {
      exercises = exercises.filter(e =>
        e.name.toLowerCase().includes(query)
      );
    }

    if (muscle) {
      exercises = exercises.filter(e =>
        e.muscleGroups.includes(muscle)
      );
    }

    return exercises.sort((a, b) => a.name.localeCompare(b.name));
  });

  viewExercise(exercise: ExerciseTemplate): void {
    this.selectedExercise = exercise;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedExercise = null;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.newExercise = { name: '', muscleGroups: [] };
  }

  toggleMuscle(muscle: MuscleGroup): void {
    const index = this.newExercise.muscleGroups.indexOf(muscle);
    if (index === -1) {
      this.newExercise.muscleGroups.push(muscle);
    } else {
      this.newExercise.muscleGroups.splice(index, 1);
    }
  }

  addExercise(): void {
    if (this.newExercise.name && this.newExercise.muscleGroups.length > 0) {
      this.exerciseService.addCustomExercise({
        name: this.newExercise.name,
        muscleGroups: this.newExercise.muscleGroups,
        category: 'strength',
        equipment: ['bodyweight']
      });
      this.closeAddModal();
    }
  }

  deleteExercise(): void {
    if (this.selectedExercise?.isCustom) {
      this.exerciseService.deleteCustomExercise(this.selectedExercise.id);
      this.closeDetailModal();
    }
  }
}
