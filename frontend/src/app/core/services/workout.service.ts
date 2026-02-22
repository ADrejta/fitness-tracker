import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { ExerciseService } from './exercise.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import {
  Workout,
  WorkoutExercise,
  WorkoutSet,
  PersonalRecord,
  WorkoutStatus,
} from '../models';
import { v4 as uuidv4 } from 'uuid';
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
  subDays,
} from 'date-fns';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

const WORKOUTS_KEY = 'workouts';
const ACTIVE_WORKOUT_KEY = 'activeWorkout';
const PERSONAL_RECORDS_KEY = 'personalRecords';

interface WorkoutListResponse {
  workouts: Workout[];
  nextCursor: string | null;
}

interface PersonalRecordsResponse {
  records: PersonalRecord[];
}

@Injectable({
  providedIn: 'root',
})
export class WorkoutService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private _workouts = signal<Workout[]>(this.loadWorkouts());
  private _activeWorkout = signal<Workout | null>(this.loadActiveWorkout());
  private _personalRecords = signal<PersonalRecord[]>(
    this.loadPersonalRecords()
  );
  private _isLoading = signal<boolean>(false);

  readonly workouts = this._workouts.asReadonly();
  readonly activeWorkout = this._activeWorkout.asReadonly();
  readonly personalRecords = this._personalRecords.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly hasActiveWorkout = computed(() => this._activeWorkout() !== null);

  readonly completedWorkouts = computed(() =>
    this._workouts()
      .filter((w) => w.status === 'completed')
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime()
      )
  );

  readonly recentWorkouts = computed(() => this.completedWorkouts().slice(0, 5));

  readonly thisWeekWorkouts = computed(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return this.completedWorkouts().filter((w) => {
      const completedDate = parseISO(w.completedAt!);
      return isWithinInterval(completedDate, { start: weekStart, end: weekEnd });
    });
  });

  readonly totalWorkouts = computed(() => this.completedWorkouts().length);

  readonly totalVolume = computed(() =>
    this.completedWorkouts().reduce((total, w) => total + w.totalVolume, 0)
  );

  constructor() {
    // Auto-save to localStorage for offline support
    effect(() => {
      this.storage.set(WORKOUTS_KEY, this._workouts());
    });

    effect(() => {
      const active = this._activeWorkout();
      if (active) {
        this.storage.set(ACTIVE_WORKOUT_KEY, active);
      } else {
        this.storage.remove(ACTIVE_WORKOUT_KEY);
      }
    });

    effect(() => {
      this.storage.set(PERSONAL_RECORDS_KEY, this._personalRecords());
    });

    // Load from API if authenticated
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.loadFromApi();
      }
    });
  }

  private async loadFromApi(): Promise<void> {
    try {
      this._isLoading.set(true);
      const [workoutsResponse, prsResponse] = await Promise.all([
        firstValueFrom(
          this.http.get<WorkoutListResponse>(`${environment.apiUrl}/workouts`)
        ),
        firstValueFrom(
          this.http.get<PersonalRecordsResponse>(`${environment.apiUrl}/personal-records`)
        ).catch(() => ({ records: [] }))
      ]);

      // Ensure each workout has an exercises array (API returns summary with exerciseCount)
      const workouts = workoutsResponse.workouts.map(w => ({
        ...w,
        exercises: w.exercises || []
      }));
      this._workouts.set(workouts);

      // Load personal records
      if (prsResponse.records.length > 0) {
        this._personalRecords.set(prsResponse.records);
      }
    } catch (error) {
      console.error('[WorkoutService] Failed to load workouts from API:', error);
      this.toastService.error('Failed to load workouts');
    } finally {
      this._isLoading.set(false);
    }
  }

  async fetchWorkoutsPaginated(params: {
    limit?: number;
    cursor?: string | null;
    status?: WorkoutStatus;
  }): Promise<{ workouts: Workout[]; nextCursor: string | null }> {
    if (!this.authService.isAuthenticated()) {
      const allWorkouts = this.completedWorkouts();
      const limit = params.limit || 20;
      return {
        workouts: allWorkouts.slice(0, limit),
        nextCursor: null,
      };
    }

    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.cursor) queryParams.set('cursor', params.cursor);
    if (params.status) queryParams.set('status', params.status);

    const url = `${environment.apiUrl}/workouts?${queryParams.toString()}`;
    return firstValueFrom(this.http.get<WorkoutListResponse>(url));
  }

  private loadWorkouts(): Workout[] {
    return this.storage.get<Workout[]>(WORKOUTS_KEY, []);
  }

  private loadActiveWorkout(): Workout | null {
    return this.storage.get<Workout | null>(ACTIVE_WORKOUT_KEY, null);
  }

  private loadPersonalRecords(): PersonalRecord[] {
    return this.storage.get<PersonalRecord[]>(PERSONAL_RECORDS_KEY, []);
  }

  setActiveWorkout(workout: Workout): void {
    this._activeWorkout.set(workout);
  }

  async startWorkout(name?: string, templateId?: string): Promise<Workout> {
    const workoutName = name || `Workout ${new Date().toLocaleDateString()}`;

    if (this.authService.isAuthenticated()) {
      try {
        const workout = await firstValueFrom(
          this.http.post<Workout>(`${environment.apiUrl}/workouts`, {
            name: workoutName,
            templateId,
          })
        );
        this._activeWorkout.set(workout);
        return workout;
      } catch (error) {
        console.error('Failed to create workout via API:', error);
        this.toastService.error('Failed to create workout');
      }
    }

    // Fallback to local
    const workout: Workout = {
      id: uuidv4(),
      name: workoutName,
      startedAt: new Date().toISOString(),
      exercises: [],
      totalVolume: 0,
      totalSets: 0,
      totalReps: 0,
      status: 'in-progress',
      templateId,
    };

    this._activeWorkout.set(workout);
    return workout;
  }

  async addExerciseToWorkout(
    exerciseTemplateId: string
  ): Promise<WorkoutExercise | null> {
    const workout = this._activeWorkout();
    if (!workout) return null;

    const template = this.exerciseService.getExerciseById(exerciseTemplateId);
    if (!template) return null;

    if (this.authService.isAuthenticated()) {
      try {
        const response = await firstValueFrom(
          this.http.post<WorkoutExercise>(
            `${environment.apiUrl}/workouts/${workout.id}/exercises`,
            { exerciseTemplateId }
          )
        );

        this._activeWorkout.update((w) =>
          w ? { ...w, exercises: [...w.exercises, response] } : null
        );
        return response;
      } catch (error) {
        console.error('Failed to add exercise via API:', error);
        this.toastService.error('Failed to add exercise');
      }
    }

    // Fallback to local
    const workoutExercise: WorkoutExercise = {
      id: uuidv4(),
      exerciseTemplateId,
      exerciseName: template.name,
      sets: [],
    };

    this._activeWorkout.update((w) =>
      w ? { ...w, exercises: [...w.exercises, workoutExercise] } : null
    );

    return workoutExercise;
  }

  async removeExerciseFromWorkout(exerciseId: string): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.delete(
            `${environment.apiUrl}/workouts/${workout.id}/exercises/${exerciseId}`
          )
        );
      } catch (error) {
        console.error('Failed to remove exercise via API:', error);
        this.toastService.error('Failed to remove exercise');
      }
    }

    this._activeWorkout.update((w) =>
      w ? { ...w, exercises: w.exercises.filter((e) => e.id !== exerciseId) } : null
    );
  }

  async addSetToExercise(
    exerciseId: string,
    set?: Partial<WorkoutSet>
  ): Promise<WorkoutSet | null> {
    const workout = this._activeWorkout();
    if (!workout) return null;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return null;

    if (this.authService.isAuthenticated()) {
      try {
        const response = await firstValueFrom(
          this.http.post<WorkoutSet>(
            `${environment.apiUrl}/workouts/${workout.id}/exercises/${exerciseId}/sets`,
            {
              targetReps: set?.targetReps,
              targetWeight: set?.targetWeight,
              isWarmup: set?.isWarmup ?? false,
            }
          )
        );

        this._activeWorkout.update((w) =>
          w
            ? {
                ...w,
                exercises: w.exercises.map((e) =>
                  e.id === exerciseId ? { ...e, sets: [...e.sets, response] } : e
                ),
              }
            : null
        );
        return response;
      } catch (error) {
        console.error('Failed to add set via API:', error);
        this.toastService.error('Failed to add set');
      }
    }

    // Fallback to local
    const newSet: WorkoutSet = {
      id: uuidv4(),
      setNumber: exercise.sets.length + 1,
      targetReps: set?.targetReps,
      actualReps: set?.actualReps,
      targetWeight: set?.targetWeight,
      actualWeight: set?.actualWeight,
      isWarmup: set?.isWarmup ?? false,
      isCompleted: set?.isCompleted ?? false,
      completedAt: set?.completedAt,
    };

    this._activeWorkout.update((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) =>
              e.id === exerciseId ? { ...e, sets: [...e.sets, newSet] } : e
            ),
          }
        : null
    );

    return newSet;
  }

  async updateSet(
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>
  ): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.patch(
            `${environment.apiUrl}/workouts/${workout.id}/exercises/${exerciseId}/sets/${setId}`,
            updates
          )
        );
      } catch (error) {
        console.error('Failed to update set via API:', error);
        this.toastService.error('Failed to update set');
      }
    }

    this._activeWorkout.update((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    sets: e.sets.map((s) =>
                      s.id === setId ? { ...s, ...updates } : s
                    ),
                  }
                : e
            ),
          }
        : null
    );
  }

  completeSet(
    exerciseId: string,
    setId: string,
    actualReps: number,
    actualWeight: number
  ): void {
    this.updateSet(exerciseId, setId, {
      actualReps,
      actualWeight,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    });
  }

  async updateExerciseNotes(exerciseId: string, notes: string): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    this._activeWorkout.update((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) =>
              e.id === exerciseId ? { ...e, notes } : e
            ),
          }
        : null
    );

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.patch(
            `${environment.apiUrl}/workouts/${workout.id}/exercises/${exerciseId}`,
            { notes }
          )
        );
      } catch (error) {
        console.error('Failed to update exercise notes via API:', error);
        this.toastService.error('Failed to update exercise notes');
      }
    }
  }

  async updateWorkoutNotes(notes: string): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    this._activeWorkout.update((w) => (w ? { ...w, notes } : null));

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.patch(`${environment.apiUrl}/workouts/${workout.id}`, {
            notes,
          })
        );
      } catch (error) {
        console.error('Failed to update workout notes via API:', error);
        this.toastService.error('Failed to update workout notes');
      }
    }
  }

  async updateWorkoutTags(tags: string[]): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    this._activeWorkout.update((w) => (w ? { ...w, tags } : null));

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.patch(`${environment.apiUrl}/workouts/${workout.id}`, {
            tags,
          })
        );
      } catch (error) {
        console.error('Failed to update workout tags via API:', error);
        this.toastService.error('Failed to update workout tags');
      }
    }
  }

  readonly allTags = computed(() => {
    const tags = new Set<string>();
    for (const workout of this.completedWorkouts()) {
      for (const tag of workout.tags ?? []) {
        tags.add(tag);
      }
    }
    return [...tags].sort();
  });

  async updateWorkoutName(name: string): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    this._activeWorkout.update((w) => (w ? { ...w, name } : null));

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.patch(`${environment.apiUrl}/workouts/${workout.id}`, {
            name,
          })
        );
      } catch (error) {
        console.error('Failed to update workout name via API:', error);
        this.toastService.error('Failed to update workout name');
      }
    }
  }

  async removeSet(exerciseId: string, setId: string): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.delete(
            `${environment.apiUrl}/workouts/${workout.id}/exercises/${exerciseId}/sets/${setId}`
          )
        );
      } catch (error) {
        console.error('Failed to remove set via API:', error);
        this.toastService.error('Failed to remove set');
      }
    }

    this._activeWorkout.update((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    sets: e.sets
                      .filter((s) => s.id !== setId)
                      .map((s, idx) => ({ ...s, setNumber: idx + 1 })),
                  }
                : e
            ),
          }
        : null
    );
  }

  async completeWorkout(): Promise<Workout | null> {
    const workout = this._activeWorkout();
    if (!workout) return null;

    if (this.authService.isAuthenticated()) {
      try {
        const completedWorkout = await firstValueFrom(
          this.http.post<Workout>(
            `${environment.apiUrl}/workouts/${workout.id}/complete`,
            {}
          )
        );

        this._workouts.update((current) => [completedWorkout, ...current]);
        this._activeWorkout.set(null);
        await this.loadFromApi(); // Refresh list including PRs
        return completedWorkout;
      } catch (error) {
        console.error('Failed to complete workout via API:', error);
        this.toastService.error('Failed to complete workout');
      }
    }

    // Fallback to local
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;

    workout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.isCompleted && !set.isWarmup) {
          totalSets++;
          totalReps += set.actualReps || 0;
          totalVolume += (set.actualReps || 0) * (set.actualWeight || 0);
        }
      });
    });

    const startTime = new Date(workout.startedAt).getTime();
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);

    const completedWorkout: Workout = {
      ...workout,
      completedAt: new Date().toISOString(),
      totalVolume,
      totalSets,
      totalReps,
      duration,
      status: 'completed',
    };

    this.checkAndUpdatePersonalRecords(completedWorkout);
    this._workouts.update((current) => [completedWorkout, ...current]);
    this._activeWorkout.set(null);

    return completedWorkout;
  }

  async cancelWorkout(): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/workouts/${workout.id}/cancel`, {})
        );
        this._activeWorkout.set(null);
        await this.loadFromApi();
        return;
      } catch (error) {
        console.error('Failed to cancel workout via API:', error);
        this.toastService.error('Failed to cancel workout');
      }
    }

    const cancelledWorkout: Workout = {
      ...workout,
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    };

    this._workouts.update((current) => [cancelledWorkout, ...current]);
    this._activeWorkout.set(null);
  }

  discardWorkout(): void {
    this._activeWorkout.set(null);
  }

  // Personal Records
  private checkAndUpdatePersonalRecords(workout: Workout): void {
    workout.exercises.forEach((exercise) => {
      const completedSets = exercise.sets.filter(
        (s) => s.isCompleted && !s.isWarmup
      );

      if (completedSets.length === 0) return;

      const maxWeightSet = completedSets.reduce(
        (max, set) =>
          (set.actualWeight || 0) > (max.actualWeight || 0) ? set : max,
        completedSets[0]
      );

      if (maxWeightSet.actualWeight) {
        this.updatePersonalRecord(
          exercise.exerciseTemplateId,
          exercise.exerciseName,
          'max-weight',
          maxWeightSet.actualWeight,
          maxWeightSet.actualReps,
          workout.id
        );

        if (maxWeightSet.actualReps && maxWeightSet.actualReps > 1) {
          const estimated1RM =
            maxWeightSet.actualWeight /
            (1.0278 - 0.0278 * maxWeightSet.actualReps);
          this.updatePersonalRecord(
            exercise.exerciseTemplateId,
            exercise.exerciseName,
            'estimated-1rm',
            Math.round(estimated1RM * 10) / 10,
            1,
            workout.id
          );
        }
      }
    });
  }

  private updatePersonalRecord(
    exerciseTemplateId: string,
    exerciseName: string,
    type: PersonalRecord['type'],
    value: number,
    reps: number | undefined,
    workoutId: string
  ): void {
    const existingRecord = this._personalRecords().find(
      (r) => r.exerciseTemplateId === exerciseTemplateId && r.type === type
    );

    if (!existingRecord || value > existingRecord.value) {
      const newRecord: PersonalRecord = {
        id: existingRecord?.id || uuidv4(),
        exerciseTemplateId,
        exerciseName,
        type,
        value,
        reps,
        achievedAt: new Date().toISOString(),
        workoutId,
      };

      if (existingRecord) {
        this._personalRecords.update((records) =>
          records.map((r) => (r.id === existingRecord.id ? newRecord : r))
        );
      } else {
        this._personalRecords.update((records) => [...records, newRecord]);
      }
    }
  }

  getPersonalRecordsForExercise(exerciseTemplateId: string): PersonalRecord[] {
    return this._personalRecords().filter(
      (r) => r.exerciseTemplateId === exerciseTemplateId
    );
  }

  getWorkoutById(id: string): Workout | undefined {
    return this._workouts().find((w) => w.id === id);
  }

  getWorkoutsInDateRange(startDate: Date, endDate: Date): Workout[] {
    return this.completedWorkouts().filter((w) => {
      const completedDate = parseISO(w.completedAt!);
      return isWithinInterval(completedDate, { start: startDate, end: endDate });
    });
  }

  getWorkoutsForExercise(exerciseTemplateId: string): Workout[] {
    return this.completedWorkouts().filter((w) =>
      w.exercises.some((e) => e.exerciseTemplateId === exerciseTemplateId)
    );
  }

  async deleteWorkout(id: string): Promise<boolean> {
    const workout = this.getWorkoutById(id);
    if (!workout) return false;

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(
          this.http.delete(`${environment.apiUrl}/workouts/${id}`)
        );
      } catch (error) {
        console.error('Failed to delete workout via API:', error);
        this.toastService.error('Failed to delete workout');
        return false;
      }
    }

    this._workouts.update((current) => current.filter((w) => w.id !== id));
    return true;
  }

  getWorkoutStreak(): number {
    const workouts = this.completedWorkouts();
    if (workouts.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const todayWorkout = workouts.find((w) => {
      const workoutDate = new Date(w.completedAt!);
      workoutDate.setHours(0, 0, 0, 0);
      return workoutDate.getTime() === currentDate.getTime();
    });

    if (!todayWorkout) {
      currentDate = subDays(currentDate, 1);
    }

    while (true) {
      const hasWorkout = workouts.some((w) => {
        const workoutDate = new Date(w.completedAt!);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === currentDate.getTime();
      });

      if (hasWorkout) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }

    return streak;
  }

  getLongestStreak(): number {
    const workouts = this.completedWorkouts();
    if (workouts.length === 0) return 0;

    const sortedWorkouts = [...workouts].sort(
      (a, b) =>
        new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()
    );

    let longestStreak = 1;
    let currentStreak = 1;
    let lastDate = new Date(sortedWorkouts[0].completedAt!);
    lastDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sortedWorkouts.length; i++) {
      const currentDate = new Date(sortedWorkouts[i].completedAt!);
      currentDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else if (dayDiff > 1) {
        currentStreak = 1;
      }

      lastDate = currentDate;
    }

    return longestStreak;
  }

  async repeatWorkout(workoutId: string): Promise<Workout | null> {
    const sourceWorkout = this.getWorkoutById(workoutId);
    if (!sourceWorkout || sourceWorkout.status !== 'completed') return null;

    // Check if there's already an active workout
    if (this.hasActiveWorkout()) return null;

    // Start new workout with same name
    const newWorkout = await this.startWorkout(`${sourceWorkout.name}`);

    // Add each exercise with its sets
    for (const exercise of sourceWorkout.exercises) {
      const workoutExercise = await this.addExerciseToWorkout(
        exercise.exerciseTemplateId
      );

      if (workoutExercise) {
        // Remove the default sets that were added
        const defaultSets = this._activeWorkout()?.exercises.find(
          (e) => e.id === workoutExercise.id
        )?.sets;
        if (defaultSets) {
          for (const set of defaultSets) {
            await this.removeSet(workoutExercise.id, set.id);
          }
        }

        // Add sets based on completed sets from previous workout
        const completedSets = exercise.sets.filter((s) => s.isCompleted);
        for (const set of completedSets) {
          await this.addSetToExercise(workoutExercise.id, {
            targetReps: set.actualReps || set.targetReps,
            targetWeight: set.actualWeight || set.targetWeight,
            isWarmup: set.isWarmup,
          });
        }
      }
    }

    return this._activeWorkout();
  }

  async reorderExercises(exerciseIds: string[]): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    const previousExercises = [...workout.exercises];

    // Optimistically reorder local state
    const byId = new Map(workout.exercises.map(e => [e.id, e]));
    const reordered = exerciseIds.map(id => byId.get(id)).filter((e): e is WorkoutExercise => !!e);
    this._activeWorkout.update(w => w ? { ...w, exercises: reordered } : null);

    if (this.authService.isAuthenticated()) {
      try {
        const exercises = exerciseIds.map((id, index) => ({ id, orderIndex: index }));
        await firstValueFrom(
          this.http.patch(
            `${environment.apiUrl}/workouts/${workout.id}/exercises/reorder`,
            { exercises }
          )
        );
      } catch (error) {
        console.error('Failed to reorder exercises via API:', error);
        this._activeWorkout.update(w => w ? { ...w, exercises: previousExercises } : null);
        this.toastService.error('Failed to reorder exercises');
      }
    }
  }

  // Superset methods
  async createSuperset(exerciseIds: string[]): Promise<string | null> {
    const workout = this._activeWorkout();
    if (!workout || exerciseIds.length < 2) return null;

    if (this.authService.isAuthenticated()) {
      try {
        const response = await firstValueFrom(
          this.http.post<{ supersetId: string; exerciseIds: string[] }>(
            `${environment.apiUrl}/workouts/${workout.id}/superset`,
            { exerciseIds }
          )
        );

        // Update local state
        this._activeWorkout.update((w) =>
          w
            ? {
                ...w,
                exercises: w.exercises.map((e) =>
                  exerciseIds.includes(e.id)
                    ? { ...e, supersetId: response.supersetId }
                    : e
                ),
              }
            : null
        );

        return response.supersetId;
      } catch (error) {
        console.error('Failed to create superset via API:', error);
        this.toastService.error('Failed to create superset');
      }
    }

    // Fallback to local
    const supersetId = uuidv4();
    this._activeWorkout.update((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) =>
              exerciseIds.includes(e.id) ? { ...e, supersetId } : e
            ),
          }
        : null
    );

    return supersetId;
  }

  async removeFromSuperset(exerciseId: string): Promise<void> {
    const workout = this._activeWorkout();
    if (!workout) return;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    if (!exercise?.supersetId) return;

    const supersetId = exercise.supersetId;
    const exercisesInSuperset = workout.exercises.filter(
      (e) => e.supersetId === supersetId
    );

    // If only 2 exercises in superset, dissolve the entire superset
    if (exercisesInSuperset.length <= 2) {
      if (this.authService.isAuthenticated()) {
        try {
          await firstValueFrom(
            this.http.delete(
              `${environment.apiUrl}/workouts/${workout.id}/superset/${supersetId}`
            )
          );
        } catch (error) {
          console.error('Failed to remove superset via API:', error);
          this.toastService.error('Failed to remove superset');
        }
      }

      this._activeWorkout.update((w) =>
        w
          ? {
              ...w,
              exercises: w.exercises.map((e) =>
                e.supersetId === supersetId ? { ...e, supersetId: undefined } : e
              ),
            }
          : null
      );
    } else {
      // Just remove this one exercise from the superset
      this._activeWorkout.update((w) =>
        w
          ? {
              ...w,
              exercises: w.exercises.map((e) =>
                e.id === exerciseId ? { ...e, supersetId: undefined } : e
              ),
            }
          : null
      );
    }
  }

  getExercisesInSuperset(supersetId: string): WorkoutExercise[] {
    const workout = this._activeWorkout();
    if (!workout) return [];

    return workout.exercises
      .filter((e) => e.supersetId === supersetId)
      .sort((a, b) => {
        const aIndex = workout.exercises.indexOf(a);
        const bIndex = workout.exercises.indexOf(b);
        return aIndex - bIndex;
      });
  }

  isLastInSuperset(exerciseId: string): boolean {
    const workout = this._activeWorkout();
    if (!workout) return true;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    if (!exercise?.supersetId) return true;

    const exercisesInSuperset = this.getExercisesInSuperset(exercise.supersetId);
    return exercisesInSuperset[exercisesInSuperset.length - 1]?.id === exerciseId;
  }

  isFirstInSuperset(exerciseId: string): boolean {
    const workout = this._activeWorkout();
    if (!workout) return false;

    const exercise = workout.exercises.find((e) => e.id === exerciseId);
    if (!exercise?.supersetId) return false;

    const exercisesInSuperset = this.getExercisesInSuperset(exercise.supersetId);
    return exercisesInSuperset[0]?.id === exerciseId;
  }
}
