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
  templateUrl: './exercises.component.html',
  styleUrls: ['./exercises.component.scss']
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
