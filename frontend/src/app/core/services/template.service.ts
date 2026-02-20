import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, firstValueFrom, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { WorkoutService } from './workout.service';
import { ExerciseService } from './exercise.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { WorkoutTemplate, TemplateExercise, Workout } from '../models';

const TEMPLATES_KEY = 'templates';

interface TemplateListResponse {
  templates: TemplateSummary[];
  total: number;
}

interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  exerciseCount: number;
  estimatedDuration?: number;
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
  tags?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private workoutService = inject(WorkoutService);
  private exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private _templates = signal<WorkoutTemplate[]>([]);
  private _isLoading = signal<boolean>(false);

  readonly templates = this._templates.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly sortedTemplates = computed(() =>
    [...this._templates()].sort((a, b) => {
      if (a.lastUsedAt && b.lastUsedAt) {
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      }
      if (a.lastUsedAt) return -1;
      if (b.lastUsedAt) return 1;
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.name.localeCompare(b.name);
    })
  );

  readonly recentTemplates = computed(() =>
    this.sortedTemplates().slice(0, 5)
  );

  constructor() {
    // Load local data initially
    this._templates.set(this.storage.get<WorkoutTemplate[]>(TEMPLATES_KEY, []));

    // Re-fetch when authentication state changes
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.fetchTemplates();
      }
    }, { allowSignalWrites: true });
  }

  private fetchTemplates(): void {
    this._isLoading.set(true);
    this.http.get<TemplateListResponse>(`${environment.apiUrl}/templates`)
      .subscribe({
        next: (response) => {
          // Fetch full details for each template
          const templates = response.templates.map(summary => this.fetchTemplateDetails(summary.id));
          Promise.all(templates.map(t => firstValueFrom(t))).then(fullTemplates => {
            this._templates.set(fullTemplates.filter((t): t is WorkoutTemplate => t !== null));
            this._isLoading.set(false);
          });
        },
        error: (err) => {
          console.error('[TemplateService] Failed to fetch templates:', err);
          this.toastService.error('Failed to load templates');
          this._templates.set(this.storage.get<WorkoutTemplate[]>(TEMPLATES_KEY, []));
          this._isLoading.set(false);
        }
      });
  }

  private fetchTemplateDetails(id: string): Observable<WorkoutTemplate | null> {
    return this.http.get<WorkoutTemplate>(`${environment.apiUrl}/templates/${id}`)
      .pipe(catchError(() => of(null)));
  }

  private saveToLocalStorage(): void {
    if (!this.authService.isAuthenticated()) {
      this.storage.set(TEMPLATES_KEY, this._templates());
    }
  }

  createTemplate(template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'usageCount'>): Observable<WorkoutTemplate> {
    if (this.authService.isAuthenticated()) {
      // Transform the data to match backend expectations (remove client-generated IDs from exercises)
      const payload = {
        name: template.name,
        description: template.description,
        exercises: template.exercises.map(e => ({
          exerciseTemplateId: e.exerciseTemplateId,
          exerciseName: e.exerciseName,
          sets: e.sets.map(s => ({
            targetReps: s.targetReps,
            targetWeight: s.targetWeight,
            isWarmup: s.isWarmup
          })),
          notes: e.notes,
          restSeconds: e.restSeconds
        })),
        estimatedDuration: template.estimatedDuration,
        tags: template.tags
      };

      return this.http.post<WorkoutTemplate>(`${environment.apiUrl}/templates`, payload)
        .pipe(
          tap((newTemplate) => {
            this._templates.update(current => [...current, newTemplate]);
          })
        );
    } else {
      const newTemplate: WorkoutTemplate = {
        ...template,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        usageCount: 0
      };
      this._templates.update(current => [...current, newTemplate]);
      this.saveToLocalStorage();
      return of(newTemplate);
    }
  }

  updateTemplate(id: string, updates: Partial<Omit<WorkoutTemplate, 'id' | 'createdAt'>>): Observable<WorkoutTemplate> {
    if (this.authService.isAuthenticated()) {
      // Transform exercises to match backend expectations if present
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload['name'] = updates.name;
      if (updates.description !== undefined) payload['description'] = updates.description;
      if (updates.estimatedDuration !== undefined) payload['estimatedDuration'] = updates.estimatedDuration;
      if (updates.tags !== undefined) payload['tags'] = updates.tags;
      if (updates.exercises !== undefined) {
        payload['exercises'] = updates.exercises.map(e => ({
          exerciseTemplateId: e.exerciseTemplateId,
          exerciseName: e.exerciseName,
          sets: e.sets.map(s => ({
            targetReps: s.targetReps,
            targetWeight: s.targetWeight,
            isWarmup: s.isWarmup
          })),
          notes: e.notes,
          restSeconds: e.restSeconds
        }));
      }

      return this.http.patch<WorkoutTemplate>(`${environment.apiUrl}/templates/${id}`, payload)
        .pipe(
          tap((updated) => {
            this._templates.update(current =>
              current.map(t => t.id === id ? updated : t)
            );
          })
        );
    } else {
      this._templates.update(current =>
        current.map(t => t.id === id ? { ...t, ...updates } : t)
      );
      this.saveToLocalStorage();
      const updated = this._templates().find(t => t.id === id);
      return of(updated!);
    }
  }

  deleteTemplate(id: string): Observable<boolean> {
    if (this.authService.isAuthenticated()) {
      return this.http.delete(`${environment.apiUrl}/templates/${id}`)
        .pipe(
          tap(() => {
            this._templates.update(current => current.filter(t => t.id !== id));
          }),
          map(() => true),
          catchError(() => of(false))
        );
    } else {
      this._templates.update(current => current.filter(t => t.id !== id));
      this.saveToLocalStorage();
      return of(true);
    }
  }

  duplicateTemplate(id: string): Observable<WorkoutTemplate | null> {
    const template = this.getTemplateById(id);
    if (!template) return of(null);

    return this.createTemplate({
      name: `${template.name} (Copy)`,
      description: template.description,
      exercises: template.exercises.map(e => ({
        ...e,
        id: crypto.randomUUID()
      })),
      estimatedDuration: template.estimatedDuration,
      tags: template.tags
    });
  }

  getTemplateById(id: string): WorkoutTemplate | undefined {
    return this._templates().find(t => t.id === id);
  }

  searchTemplates(query: string): WorkoutTemplate[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return this._templates();

    return this._templates().filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description?.toLowerCase().includes(lowerQuery) ||
      template.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      template.exercises.some(e => e.exerciseName.toLowerCase().includes(lowerQuery))
    );
  }

  createTemplateFromWorkout(workoutId: string, name: string, description?: string): Observable<WorkoutTemplate | null> {
    const workout = this.workoutService.getWorkoutById(workoutId);
    if (!workout || workout.status !== 'completed') return of(null);

    const exercises: TemplateExercise[] = (workout.exercises || []).map(exercise => ({
      id: crypto.randomUUID(),
      exerciseTemplateId: exercise.exerciseTemplateId,
      exerciseName: exercise.exerciseName,
      sets: exercise.sets
        .filter(s => !s.isWarmup)
        .map((set, index) => ({
          setNumber: index + 1,
          targetReps: set.actualReps || set.targetReps || 10,
          targetWeight: set.actualWeight || set.targetWeight,
          isWarmup: false
        })),
      notes: exercise.notes
    }));

    return this.createTemplate({
      name,
      description,
      exercises,
      estimatedDuration: workout.duration ? Math.ceil(workout.duration / 60) : undefined
    });
  }

  async startWorkoutFromTemplate(templateId: string): Promise<Workout | null> {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    if (this.authService.isAuthenticated()) {
      // Use backend endpoint
      try {
        const workout = await firstValueFrom(
          this.http.post<Workout>(`${environment.apiUrl}/templates/${templateId}/start`, {})
        );

        this.workoutService.setActiveWorkout(workout);

        // Update template usage stats locally
        this._templates.update(current =>
          current.map(t => t.id === templateId ? {
            ...t,
            lastUsedAt: new Date().toISOString(),
            usageCount: t.usageCount + 1
          } : t)
        );

        return workout;
      } catch {
        return null;
      }
    } else {
      // Local implementation for guest users
      const workout = await this.workoutService.startWorkout(template.name, templateId);

      for (const templateExercise of template.exercises) {
        const workoutExercise = await this.workoutService.addExerciseToWorkout(
          templateExercise.exerciseTemplateId
        );

        if (workoutExercise) {
          for (const templateSet of templateExercise.sets) {
            await this.workoutService.addSetToExercise(workoutExercise.id, {
              targetReps: templateSet.targetReps,
              targetWeight: templateSet.targetWeight,
              isWarmup: templateSet.isWarmup
            });
          }
        }
      }

      this._templates.update(current =>
        current.map(t => t.id === templateId ? {
          ...t,
          lastUsedAt: new Date().toISOString(),
          usageCount: t.usageCount + 1
        } : t)
      );
      this.saveToLocalStorage();

      return workout;
    }
  }

  addExerciseToTemplate(templateId: string, exerciseTemplateId: string): TemplateExercise | null {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    const exerciseTemplate = this.exerciseService.getExerciseById(exerciseTemplateId);
    if (!exerciseTemplate) return null;

    const newExercise: TemplateExercise = {
      id: crypto.randomUUID(),
      exerciseTemplateId,
      exerciseName: exerciseTemplate.name,
      sets: [
        { setNumber: 1, targetReps: 10, isWarmup: false },
        { setNumber: 2, targetReps: 10, isWarmup: false },
        { setNumber: 3, targetReps: 10, isWarmup: false }
      ]
    };

    this.updateTemplate(templateId, {
      exercises: [...template.exercises, newExercise]
    }).subscribe();

    return newExercise;
  }

  removeExerciseFromTemplate(templateId: string, exerciseId: string): boolean {
    const template = this.getTemplateById(templateId);
    if (!template) return false;

    this.updateTemplate(templateId, {
      exercises: template.exercises.filter(e => e.id !== exerciseId)
    }).subscribe();

    return true;
  }

  updateTemplateExercise(
    templateId: string,
    exerciseId: string,
    updates: Partial<Omit<TemplateExercise, 'id'>>
  ): boolean {
    const template = this.getTemplateById(templateId);
    if (!template) return false;

    const exercise = template.exercises.find(e => e.id === exerciseId);
    if (!exercise) return false;

    this.updateTemplate(templateId, {
      exercises: template.exercises.map(e =>
        e.id === exerciseId ? { ...e, ...updates } : e
      )
    }).subscribe();

    return true;
  }

  reorderTemplateExercises(templateId: string, exerciseIds: string[]): boolean {
    const template = this.getTemplateById(templateId);
    if (!template) return false;

    const reorderedExercises = exerciseIds
      .map(id => template.exercises.find(e => e.id === id))
      .filter((e): e is TemplateExercise => e !== undefined);

    if (reorderedExercises.length !== template.exercises.length) return false;

    this.updateTemplate(templateId, {
      exercises: reorderedExercises
    }).subscribe();

    return true;
  }

  refresh(): void {
    if (this.authService.isAuthenticated()) {
      this.fetchTemplates();
    }
  }

  // Superset methods
  createSupersetInTemplate(templateId: string, exerciseIds: string[]): string | null {
    const template = this.getTemplateById(templateId);
    if (!template || exerciseIds.length < 2) return null;

    const supersetId = crypto.randomUUID();

    this.updateTemplate(templateId, {
      exercises: template.exercises.map(e =>
        exerciseIds.includes(e.id) ? { ...e, supersetId } : e
      )
    }).subscribe();

    return supersetId;
  }

  removeSupersetFromTemplate(templateId: string, supersetId: string): boolean {
    const template = this.getTemplateById(templateId);
    if (!template) return false;

    this.updateTemplate(templateId, {
      exercises: template.exercises.map(e =>
        e.supersetId === supersetId ? { ...e, supersetId: undefined } : e
      )
    }).subscribe();

    return true;
  }

  removeExerciseFromSupersetInTemplate(templateId: string, exerciseId: string): boolean {
    const template = this.getTemplateById(templateId);
    if (!template) return false;

    const exercise = template.exercises.find(e => e.id === exerciseId);
    if (!exercise?.supersetId) return false;

    const supersetId = exercise.supersetId;
    const exercisesInSuperset = template.exercises.filter(e => e.supersetId === supersetId);

    // If only 2 exercises in superset, dissolve the entire superset
    if (exercisesInSuperset.length <= 2) {
      return this.removeSupersetFromTemplate(templateId, supersetId);
    }

    // Just remove this one exercise from the superset
    this.updateTemplate(templateId, {
      exercises: template.exercises.map(e =>
        e.id === exerciseId ? { ...e, supersetId: undefined } : e
      )
    }).subscribe();

    return true;
  }

  getExercisesInSupersetForTemplate(templateId: string, supersetId: string): TemplateExercise[] {
    const template = this.getTemplateById(templateId);
    if (!template) return [];

    return template.exercises.filter(e => e.supersetId === supersetId);
  }

  isLastInSupersetForTemplate(templateId: string, exerciseId: string): boolean {
    const template = this.getTemplateById(templateId);
    if (!template) return true;

    const exercise = template.exercises.find(e => e.id === exerciseId);
    if (!exercise?.supersetId) return true;

    const exercisesInSuperset = this.getExercisesInSupersetForTemplate(templateId, exercise.supersetId);
    const exerciseIndex = template.exercises.findIndex(e => e.id === exerciseId);
    const lastInSuperset = exercisesInSuperset.reduce((last, e) => {
      const idx = template.exercises.findIndex(ex => ex.id === e.id);
      return idx > last ? idx : last;
    }, -1);

    return exerciseIndex === lastInSuperset;
  }

  isFirstInSupersetForTemplate(templateId: string, exerciseId: string): boolean {
    const template = this.getTemplateById(templateId);
    if (!template) return false;

    const exercise = template.exercises.find(e => e.id === exerciseId);
    if (!exercise?.supersetId) return false;

    const exercisesInSuperset = this.getExercisesInSupersetForTemplate(templateId, exercise.supersetId);
    const exerciseIndex = template.exercises.findIndex(e => e.id === exerciseId);
    const firstInSuperset = exercisesInSuperset.reduce((first, e) => {
      const idx = template.exercises.findIndex(ex => ex.id === e.id);
      return first === -1 || idx < first ? idx : first;
    }, -1);

    return exerciseIndex === firstInSuperset;
  }
}
