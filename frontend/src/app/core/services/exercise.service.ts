import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import {
  ExerciseTemplate,
  MuscleGroup,
  ExerciseCategory,
  Equipment,
} from '../models';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

const EXERCISES_KEY = 'exercises';

interface ExerciseListResponse {
  exercises: ExerciseTemplate[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private authService = inject(AuthService);

  private _exercises = signal<ExerciseTemplate[]>(this.loadExercises());
  private _defaultExercisesLoaded = signal(false);

  readonly exercises = this._exercises.asReadonly();

  readonly customExercises = computed(() =>
    this._exercises().filter((e) => e.isCustom)
  );

  readonly defaultExercises = computed(() =>
    this._exercises().filter((e) => !e.isCustom)
  );

  constructor() {
    // Load default exercises first, then check API
    this.initializeExercises();

    // Save to localStorage for offline support
    effect(() => {
      this.storage.set(EXERCISES_KEY, this._exercises());
    });
  }

  private async initializeExercises(): Promise<void> {
    // Always ensure we have default exercises first
    await this.loadDefaultExercises();

    // Then try to load from API if authenticated
    if (this.authService.isAuthenticated()) {
      await this.loadFromApi();
    }
  }

  private async loadFromApi(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ExerciseListResponse>(`${environment.apiUrl}/exercises`)
      );

      // Only update if we got exercises back
      if (response.exercises && response.exercises.length > 0) {
        // Merge API exercises with any custom exercises not on server
        const apiExerciseIds = new Set(response.exercises.map(e => e.id));
        const localCustomExercises = this._exercises().filter(
          e => e.isCustom && !apiExerciseIds.has(e.id)
        );
        this._exercises.set([...response.exercises, ...localCustomExercises]);
      }
      // If API returns empty, keep existing exercises (defaults + local custom)
    } catch (error) {
      console.error('Failed to load exercises from API:', error);
      // On error, keep existing exercises - don't clear them
    }
  }

  private loadExercises(): ExerciseTemplate[] {
    return this.storage.get<ExerciseTemplate[]>(EXERCISES_KEY, []);
  }

  private async loadDefaultExercises(): Promise<void> {
    if (this._defaultExercisesLoaded()) return;

    const currentExercises = this._exercises();
    const hasDefaultExercises = currentExercises.some((e) => !e.isCustom);

    if (!hasDefaultExercises) {
      try {
        const response = await fetch('/assets/data/default-exercises.json');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const defaultExercises: ExerciseTemplate[] = await response.json();
        if (defaultExercises && defaultExercises.length > 0) {
          this._exercises.update((current) => [
            ...defaultExercises,
            ...current.filter((e) => e.isCustom),
          ]);
        }
      } catch (error) {
        console.error('Failed to load default exercises:', error);
      }
    }

    this._defaultExercisesLoaded.set(true);
  }

  getExerciseById(id: string): ExerciseTemplate | undefined {
    return this._exercises().find((e) => e.id === id);
  }

  searchExercises(query: string): ExerciseTemplate[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return this._exercises();

    return this._exercises().filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(lowerQuery) ||
        exercise.muscleGroups.some((mg) =>
          mg.toLowerCase().includes(lowerQuery)
        ) ||
        exercise.equipment.some((eq) => eq.toLowerCase().includes(lowerQuery))
    );
  }

  filterByMuscleGroup(muscleGroup: MuscleGroup): ExerciseTemplate[] {
    return this._exercises().filter((e) =>
      e.muscleGroups.includes(muscleGroup)
    );
  }

  filterByCategory(category: ExerciseCategory): ExerciseTemplate[] {
    return this._exercises().filter((e) => e.category === category);
  }

  filterByEquipment(equipment: Equipment): ExerciseTemplate[] {
    return this._exercises().filter((e) => e.equipment.includes(equipment));
  }

  filterExercises(filters: {
    muscleGroups?: MuscleGroup[];
    categories?: ExerciseCategory[];
    equipment?: Equipment[];
    query?: string;
  }): ExerciseTemplate[] {
    let result = this._exercises();

    if (filters.query) {
      result = this.searchExercises(filters.query);
    }

    if (filters.muscleGroups?.length) {
      result = result.filter((e) =>
        e.muscleGroups.some((mg) => filters.muscleGroups!.includes(mg))
      );
    }

    if (filters.categories?.length) {
      result = result.filter((e) => filters.categories!.includes(e.category));
    }

    if (filters.equipment?.length) {
      result = result.filter((e) =>
        e.equipment.some((eq) => filters.equipment!.includes(eq))
      );
    }

    return result;
  }

  async addCustomExercise(
    exercise: Omit<ExerciseTemplate, 'id' | 'isCustom'>
  ): Promise<ExerciseTemplate> {
    if (this.authService.isAuthenticated()) {
      try {
        const newExercise = await firstValueFrom(
          this.http.post<ExerciseTemplate>(
            `${environment.apiUrl}/exercises/custom`,
            exercise
          )
        );
        this._exercises.update((current) => [...current, newExercise]);
        return newExercise;
      } catch (error) {
        console.error('Failed to create exercise via API:', error);
      }
    }

    // Fallback to local
    const newExercise: ExerciseTemplate = {
      ...exercise,
      id: uuidv4(),
      isCustom: true,
    };

    this._exercises.update((current) => [...current, newExercise]);
    return newExercise;
  }

  async updateCustomExercise(
    id: string,
    updates: Partial<Omit<ExerciseTemplate, 'id' | 'isCustom'>>
  ): Promise<boolean> {
    const exercise = this.getExerciseById(id);
    if (!exercise || !exercise.isCustom) return false;

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.put(`${environment.apiUrl}/exercises/custom/${id}`, updates)
        );
      } catch (error) {
        console.error('Failed to update exercise via API:', error);
        return false;
      }
    }

    this._exercises.update((current) =>
      current.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    return true;
  }

  async deleteCustomExercise(id: string): Promise<boolean> {
    const exercise = this.getExerciseById(id);
    if (!exercise || !exercise.isCustom) return false;

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.delete(`${environment.apiUrl}/exercises/custom/${id}`)
        );
      } catch (error) {
        console.error('Failed to delete exercise via API:', error);
        return false;
      }
    }

    this._exercises.update((current) => current.filter((e) => e.id !== id));
    return true;
  }

  getMuscleGroups(): MuscleGroup[] {
    return [
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'forearms',
      'abs',
      'obliques',
      'quads',
      'hamstrings',
      'glutes',
      'calves',
      'traps',
      'lats',
      'lower-back',
    ];
  }

  getEquipmentTypes(): Equipment[] {
    return [
      'barbell',
      'dumbbell',
      'cable',
      'machine',
      'kettlebell',
      'bodyweight',
      'resistance-band',
      'ez-bar',
      'smith-machine',
      'pull-up-bar',
      'dip-station',
      'bench',
      'cardio-machine',
    ];
  }

  getMuscleGroupLabel(muscleGroup: MuscleGroup): string {
    const labels: Record<MuscleGroup, string> = {
      chest: 'Chest',
      back: 'Back',
      shoulders: 'Shoulders',
      biceps: 'Biceps',
      triceps: 'Triceps',
      forearms: 'Forearms',
      abs: 'Abs',
      obliques: 'Obliques',
      quads: 'Quadriceps',
      hamstrings: 'Hamstrings',
      glutes: 'Glutes',
      calves: 'Calves',
      traps: 'Trapezius',
      lats: 'Latissimus',
      'lower-back': 'Lower Back',
    };
    return labels[muscleGroup] || muscleGroup;
  }

  getEquipmentLabel(equipment: Equipment): string {
    const labels: Record<Equipment, string> = {
      barbell: 'Barbell',
      dumbbell: 'Dumbbell',
      cable: 'Cable',
      machine: 'Machine',
      kettlebell: 'Kettlebell',
      bodyweight: 'Bodyweight',
      'resistance-band': 'Resistance Band',
      'ez-bar': 'EZ Bar',
      'smith-machine': 'Smith Machine',
      'pull-up-bar': 'Pull-up Bar',
      'dip-station': 'Dip Station',
      bench: 'Bench',
      'cardio-machine': 'Cardio Machine',
    };
    return labels[equipment] || equipment;
  }
}
