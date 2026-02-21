import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, ButtonComponent, BadgeComponent, EmptyStateComponent, ModalComponent, InputComponent } from '../../shared/components';
import { TemplateService, ExerciseService, ToastService } from '../../core/services';
import { WorkoutTemplate, TemplateExercise, TemplateSet, ExerciseTemplate, MuscleGroup } from '../../core/models';
import { ExercisePickerComponent } from '../workout/components/exercise-picker/exercise-picker.component';
import { format, parseISO } from 'date-fns';

const COMPLEMENTARY_PAIRS: [MuscleGroup, MuscleGroup][] = [
  ['chest', 'back'],
  ['biceps', 'triceps'],
  ['quads', 'hamstrings'],
  ['shoulders', 'lats'],
  ['abs', 'lower-back'],
];

interface SupersetSuggestion {
  exercise1Id: string;
  exercise1Name: string;
  exercise2Id: string;
  exercise2Name: string;
  reason: string;
}

interface EditableTemplateExercise extends TemplateExercise {
  isExpanded?: boolean;
  isFirstInSuperset?: boolean;
  isLastInSuperset?: boolean;
}

@Component({
    selector: 'app-templates',
    imports: [
        CommonModule,
        FormsModule,
        PageContainerComponent,
        CardComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        ModalComponent,
        InputComponent,
        ExercisePickerComponent
    ],
    templateUrl: './templates.component.html',
    styleUrls: ['./templates.component.scss']
})
export class TemplatesComponent {
  templateService = inject(TemplateService);
  exerciseService = inject(ExerciseService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  showMenuModal = false;
  showDeleteConfirm = false;
  showCreateModal = false;
  showExercisePicker = false;
  selectedTemplate: WorkoutTemplate | null = null;
  isEditing = false;
  editingTemplateId: string | null = null;

  // Form state
  templateName = '';
  templateDescription = '';
  templateExercises = signal<EditableTemplateExercise[]>([]);
  selectedForSuperset = signal<string[]>([]);
  dismissedSuggestions = signal<Set<string>>(new Set());

  supersetSuggestions = computed((): SupersetSuggestion[] => {
    const exercises = this.templateExercises();
    const nonSupersetted = exercises.filter(e => !e.supersetId);
    if (nonSupersetted.length < 2) return [];

    const dismissed = this.dismissedSuggestions();
    const suggestions: SupersetSuggestion[] = [];

    for (let i = 0; i < nonSupersetted.length; i++) {
      for (let j = i + 1; j < nonSupersetted.length; j++) {
        const ex1 = nonSupersetted[i];
        const ex2 = nonSupersetted[j];
        const t1 = this.exerciseService.getExerciseById(ex1.exerciseTemplateId);
        const t2 = this.exerciseService.getExerciseById(ex2.exerciseTemplateId);
        if (!t1 || !t2) continue;

        const match = COMPLEMENTARY_PAIRS.find(([a, b]) =>
          (t1.muscleGroups.includes(a) && t2.muscleGroups.includes(b)) ||
          (t1.muscleGroups.includes(b) && t2.muscleGroups.includes(a))
        );
        if (!match) continue;

        const key = [ex1.id, ex2.id].sort().join(':');
        if (dismissed.has(key)) continue;

        suggestions.push({
          exercise1Id: ex1.id,
          exercise1Name: ex1.exerciseName,
          exercise2Id: ex2.id,
          exercise2Name: ex2.exerciseName,
          reason: `${match[0]} + ${match[1]}`,
        });
      }
    }
    return suggestions;
  });

  // Computed property to add superset position info
  groupedTemplateExercises = computed((): EditableTemplateExercise[] => {
    const exercises = this.templateExercises();
    return exercises.map((exercise, index) => {
      if (!exercise.supersetId) {
        return { ...exercise, isFirstInSuperset: false, isLastInSuperset: false };
      }

      const sameSuperset = exercises.filter(e => e.supersetId === exercise.supersetId);
      const indexInSuperset = sameSuperset.findIndex(e => e.id === exercise.id);

      return {
        ...exercise,
        isFirstInSuperset: indexInSuperset === 0,
        isLastInSuperset: indexInSuperset === sameSuperset.length - 1,
      };
    });
  });

  formatDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM d');
  }

  // Menu actions
  showMenu(template: WorkoutTemplate): void {
    this.selectedTemplate = template;
    this.showMenuModal = true;
  }

  closeMenu(): void {
    this.showMenuModal = false;
    this.selectedTemplate = null;
  }

  startWorkout(template: WorkoutTemplate): void {
    this.templateService.startWorkoutFromTemplate(template.id);
    this.router.navigate(['/workout']);
  }

  duplicateTemplate(): void {
    if (this.selectedTemplate) {
      this.templateService.duplicateTemplate(this.selectedTemplate.id).subscribe();
      this.closeMenu();
    }
  }

  deleteTemplate(): void {
    if (this.selectedTemplate) {
      this.templateService.deleteTemplate(this.selectedTemplate.id).subscribe();
      this.showDeleteConfirm = false;
      this.closeMenu();
    }
  }

  // Create/Edit modal
  openCreateModal(): void {
    this.isEditing = false;
    this.templateName = '';
    this.templateDescription = '';
    this.templateExercises.set([]);
    this.showCreateModal = true;
  }

  editTemplate(): void {
    if (!this.selectedTemplate) return;

    this.isEditing = true;
    this.editingTemplateId = this.selectedTemplate.id;
    this.templateName = this.selectedTemplate.name;
    this.templateDescription = this.selectedTemplate.description || '';
    this.templateExercises.set(
      this.selectedTemplate.exercises.map(e => ({ ...e, isExpanded: false }))
    );
    this.closeMenu();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.templateName = '';
    this.templateDescription = '';
    this.templateExercises.set([]);
    this.isEditing = false;
    this.editingTemplateId = null;
  }

  addExerciseToTemplate(exercise: ExerciseTemplate): void {
    const newExercise: EditableTemplateExercise = {
      id: crypto.randomUUID(),
      exerciseTemplateId: exercise.id,
      exerciseName: exercise.name,
      sets: [
        { setNumber: 1, targetReps: 10, isWarmup: false },
        { setNumber: 2, targetReps: 10, isWarmup: false },
        { setNumber: 3, targetReps: 10, isWarmup: false }
      ],
      isExpanded: true
    };

    this.templateExercises.update(exercises => [...exercises, newExercise]);
    this.showExercisePicker = false;
  }

  removeExercise(exerciseId: string): void {
    this.templateExercises.update(exercises =>
      exercises.filter(e => e.id !== exerciseId)
    );
  }

  moveExerciseUp(index: number): void {
    if (index <= 0) return;
    this.templateExercises.update(exercises => {
      const newExercises = [...exercises];
      [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
      return newExercises;
    });
  }

  moveExerciseDown(index: number): void {
    const exercises = this.templateExercises();
    if (index >= exercises.length - 1) return;
    this.templateExercises.update(exercises => {
      const newExercises = [...exercises];
      [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
      return newExercises;
    });
  }

  toggleExercise(exercise: EditableTemplateExercise): void {
    this.templateExercises.update(exercises =>
      exercises.map(e =>
        e.id === exercise.id ? { ...e, isExpanded: !e.isExpanded } : e
      )
    );
  }

  addSet(exerciseId: string): void {
    this.templateExercises.update(exercises =>
      exercises.map(e => {
        if (e.id !== exerciseId) return e;
        const newSetNumber = e.sets.length + 1;
        const lastSet = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              setNumber: newSetNumber,
              targetReps: lastSet?.targetReps || 10,
              targetWeight: lastSet?.targetWeight,
              isWarmup: false
            }
          ]
        };
      })
    );
  }

  removeSet(exerciseId: string, setIndex: number): void {
    this.templateExercises.update(exercises =>
      exercises.map(e => {
        if (e.id !== exerciseId) return e;
        const newSets = e.sets
          .filter((_, i) => i !== setIndex)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...e, sets: newSets };
      })
    );
  }

  updateSetReps(exerciseId: string, setIndex: number, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10) || 10;
    this.templateExercises.update(exercises =>
      exercises.map(e => {
        if (e.id !== exerciseId) return e;
        const newSets = e.sets.map((s, i) =>
          i === setIndex ? { ...s, targetReps: value } : s
        );
        return { ...e, sets: newSets };
      })
    );
  }

  updateSetWeight(exerciseId: string, setIndex: number, event: Event): void {
    const inputValue = (event.target as HTMLInputElement).value;
    const value = inputValue ? parseFloat(inputValue) : undefined;
    this.templateExercises.update(exercises =>
      exercises.map(e => {
        if (e.id !== exerciseId) return e;
        const newSets = e.sets.map((s, i) =>
          i === setIndex ? { ...s, targetWeight: value } : s
        );
        return { ...e, sets: newSets };
      })
    );
  }

  saveTemplate(): void {
    // Map exercises to the format expected by the backend
    const exercises: TemplateExercise[] = this.templateExercises().map(e => ({
      id: e.id,
      exerciseTemplateId: e.exerciseTemplateId,
      exerciseName: e.exerciseName,
      sets: e.sets.map(s => ({
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        targetWeight: s.targetWeight,
        isWarmup: s.isWarmup
      })),
      notes: e.notes,
      supersetId: e.supersetId
    }));

    if (this.isEditing && this.editingTemplateId) {
      this.templateService.updateTemplate(this.editingTemplateId, {
        name: this.templateName,
        description: this.templateDescription || undefined,
        exercises
      }).subscribe({
        next: () => {
          this.toastService.success('Template updated successfully');
          this.closeCreateModal();
        },
        error: (err) => {
          console.error('Failed to update template:', err);
          this.toastService.error('Failed to update template. Please try again.');
        }
      });
    } else {
      this.templateService.createTemplate({
        name: this.templateName,
        description: this.templateDescription || undefined,
        exercises
      }).subscribe({
        next: () => {
          this.toastService.success('Template created successfully');
          this.closeCreateModal();
        },
        error: (err) => {
          console.error('Failed to create template:', err);
          this.toastService.error('Failed to create template. Please try again.');
        }
      });
    }
  }

  // Superset methods
  toggleSupersetSelection(exerciseId: string): void {
    const exercise = this.templateExercises().find(e => e.id === exerciseId);
    // Don't allow selecting exercises already in a superset
    if (exercise?.supersetId) return;

    this.selectedForSuperset.update(selected => {
      if (selected.includes(exerciseId)) {
        return selected.filter(id => id !== exerciseId);
      }
      return [...selected, exerciseId];
    });
  }

  clearSupersetSelection(): void {
    this.selectedForSuperset.set([]);
  }

  createSupersetFromSelection(): void {
    const exerciseIds = this.selectedForSuperset();
    if (exerciseIds.length < 2) return;

    const supersetId = crypto.randomUUID();

    this.templateExercises.update(exercises =>
      exercises.map(e =>
        exerciseIds.includes(e.id) ? { ...e, supersetId } : e
      )
    );

    this.clearSupersetSelection();
  }

  removeSupersetFromExercises(supersetId: string): void {
    this.templateExercises.update(exercises =>
      exercises.map(e =>
        e.supersetId === supersetId ? { ...e, supersetId: undefined } : e
      )
    );
  }

  dismissSuggestion(ex1Id: string, ex2Id: string): void {
    const key = [ex1Id, ex2Id].sort().join(':');
    this.dismissedSuggestions.update(set => {
      const next = new Set(set);
      next.add(key);
      return next;
    });
  }

  applySuggestion(ex1Id: string, ex2Id: string): void {
    const supersetId = crypto.randomUUID();
    this.templateExercises.update(exercises =>
      exercises.map(e =>
        (e.id === ex1Id || e.id === ex2Id) ? { ...e, supersetId } : e
      )
    );
  }
}
