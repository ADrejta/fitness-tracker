import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BodyMeasurement, BodyStatsGoal } from '../models';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { parseISO, startOfDay, isAfter, isBefore } from 'date-fns';

const MEASUREMENTS_KEY = 'bodyMeasurements';
const GOALS_KEY = 'bodyStatsGoals';

interface MeasurementListResponse {
  measurements: BodyMeasurement[];
  total: number;
}

interface GoalProgressResponse {
  goal: BodyStatsGoal;
  currentValue: number | null;
  progressPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class BodyStatsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private storage = inject(StorageService);

  private _measurements = signal<BodyMeasurement[]>([]);
  private _goals = signal<BodyStatsGoal[]>([]);
  private _isLoading = signal<boolean>(false);

  readonly measurements = this._measurements.asReadonly();
  readonly goals = this._goals.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly sortedMeasurements = computed(() =>
    [...this._measurements()].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  );

  readonly latestMeasurement = computed<BodyMeasurement | null>(() =>
    this.sortedMeasurements()[0] ?? null
  );

  readonly activeGoals = computed(() =>
    this._goals().filter(g => !g.isCompleted)
  );

  readonly completedGoals = computed(() =>
    this._goals().filter(g => g.isCompleted)
  );

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    if (this.authService.isAuthenticated()) {
      this.fetchMeasurements();
      this.fetchGoals();
    } else {
      // Load from local storage for guest users
      this._measurements.set(this.storage.get<BodyMeasurement[]>(MEASUREMENTS_KEY, []));
      this._goals.set(this.storage.get<BodyStatsGoal[]>(GOALS_KEY, []));
    }
  }

  private fetchMeasurements(): void {
    this._isLoading.set(true);
    this.http.get<MeasurementListResponse>(`${environment.apiUrl}/body-stats/measurements`)
      .subscribe({
        next: (response) => {
          this._measurements.set(response.measurements);
          this._isLoading.set(false);
        },
        error: () => {
          this._measurements.set(this.storage.get<BodyMeasurement[]>(MEASUREMENTS_KEY, []));
          this._isLoading.set(false);
        }
      });
  }

  private fetchGoals(): void {
    this.http.get<BodyStatsGoal[]>(`${environment.apiUrl}/body-stats/goals`)
      .subscribe({
        next: (goals) => {
          this._goals.set(goals);
        },
        error: () => {
          this._goals.set(this.storage.get<BodyStatsGoal[]>(GOALS_KEY, []));
        }
      });
  }

  private saveToLocalStorage(): void {
    if (!this.authService.isAuthenticated()) {
      this.storage.set(MEASUREMENTS_KEY, this._measurements());
      this.storage.set(GOALS_KEY, this._goals());
    }
  }

  // Measurements CRUD
  addMeasurement(measurement: Omit<BodyMeasurement, 'id'>): Observable<BodyMeasurement> {
    if (this.authService.isAuthenticated()) {
      return this.http.post<BodyMeasurement>(`${environment.apiUrl}/body-stats/measurements`, measurement)
        .pipe(
          tap((newMeasurement) => {
            this._measurements.update(current => [...current, newMeasurement]);
            this.checkGoalProgress();
          })
        );
    } else {
      const newMeasurement: BodyMeasurement = {
        ...measurement,
        id: crypto.randomUUID()
      };
      this._measurements.update(current => [...current, newMeasurement]);
      this.saveToLocalStorage();
      this.checkGoalProgress();
      return of(newMeasurement);
    }
  }

  updateMeasurement(id: string, updates: Partial<Omit<BodyMeasurement, 'id'>>): Observable<boolean> {
    if (this.authService.isAuthenticated()) {
      return this.http.patch<BodyMeasurement>(`${environment.apiUrl}/body-stats/measurements/${id}`, updates)
        .pipe(
          tap((updated) => {
            this._measurements.update(current =>
              current.map(m => m.id === id ? updated : m)
            );
            this.checkGoalProgress();
          }),
          catchError(() => of(false))
        ) as Observable<boolean>;
    } else {
      this._measurements.update(current =>
        current.map(m => m.id === id ? { ...m, ...updates } : m)
      );
      this.saveToLocalStorage();
      this.checkGoalProgress();
      return of(true);
    }
  }

  deleteMeasurement(id: string): Observable<boolean> {
    if (this.authService.isAuthenticated()) {
      return this.http.delete(`${environment.apiUrl}/body-stats/measurements/${id}`)
        .pipe(
          tap(() => {
            this._measurements.update(current => current.filter(m => m.id !== id));
          }),
          map(() => true),
          catchError(() => of(false))
        );
    } else {
      this._measurements.update(current => current.filter(m => m.id !== id));
      this.saveToLocalStorage();
      return of(true);
    }
  }

  getMeasurementById(id: string): BodyMeasurement | undefined {
    return this._measurements().find(m => m.id === id);
  }

  getMeasurementsInDateRange(startDate: Date, endDate: Date): BodyMeasurement[] {
    return this.sortedMeasurements().filter(m => {
      const measurementDate = parseISO(m.date);
      return !isBefore(measurementDate, startOfDay(startDate)) &&
             !isAfter(measurementDate, endDate);
    });
  }

  getMeasurementTrend(
    field: keyof Omit<BodyMeasurement, 'id' | 'date' | 'notes'>,
    limit?: number
  ): { date: string; value: number }[] {
    let measurements = this.sortedMeasurements()
      .filter(m => m[field] !== undefined && m[field] !== null)
      .map(m => ({
        date: m.date,
        value: m[field] as number
      }))
      .reverse();

    if (limit) {
      measurements = measurements.slice(-limit);
    }

    return measurements;
  }

  getWeightChange(): { absolute: number; percentage: number } | null {
    const measurements = this.getMeasurementTrend('weight');
    if (measurements.length < 2) return null;

    const first = measurements[0].value;
    const last = measurements[measurements.length - 1].value;
    const absolute = last - first;
    const percentage = ((last - first) / first) * 100;

    return {
      absolute: Math.round(absolute * 10) / 10,
      percentage: Math.round(percentage * 10) / 10
    };
  }

  // Goals CRUD
  addGoal(goal: Omit<BodyStatsGoal, 'id' | 'isCompleted' | 'completedAt'>): Observable<BodyStatsGoal> {
    if (this.authService.isAuthenticated()) {
      return this.http.post<BodyStatsGoal>(`${environment.apiUrl}/body-stats/goals`, goal)
        .pipe(
          tap((newGoal) => {
            this._goals.update(current => [...current, newGoal]);
          })
        );
    } else {
      const newGoal: BodyStatsGoal = {
        ...goal,
        id: crypto.randomUUID(),
        isCompleted: false
      };
      this._goals.update(current => [...current, newGoal]);
      this.saveToLocalStorage();
      return of(newGoal);
    }
  }

  updateGoal(id: string, updates: Partial<Omit<BodyStatsGoal, 'id'>>): Observable<boolean> {
    if (this.authService.isAuthenticated()) {
      return this.http.patch<BodyStatsGoal>(`${environment.apiUrl}/body-stats/goals/${id}`, updates)
        .pipe(
          tap((updated) => {
            this._goals.update(current =>
              current.map(g => g.id === id ? updated : g)
            );
          }),
          catchError(() => of(false))
        ) as Observable<boolean>;
    } else {
      this._goals.update(current =>
        current.map(g => g.id === id ? { ...g, ...updates } : g)
      );
      this.saveToLocalStorage();
      return of(true);
    }
  }

  deleteGoal(id: string): Observable<boolean> {
    if (this.authService.isAuthenticated()) {
      return this.http.delete(`${environment.apiUrl}/body-stats/goals/${id}`)
        .pipe(
          tap(() => {
            this._goals.update(current => current.filter(g => g.id !== id));
          }),
          map(() => true),
          catchError(() => of(false))
        );
    } else {
      this._goals.update(current => current.filter(g => g.id !== id));
      this.saveToLocalStorage();
      return of(true);
    }
  }

  getGoalById(id: string): BodyStatsGoal | undefined {
    return this._goals().find(g => g.id === id);
  }

  completeGoal(id: string): Observable<boolean> {
    return this.updateGoal(id, {
      isCompleted: true,
      completedAt: new Date().toISOString()
    });
  }

  private checkGoalProgress(): void {
    const latest = this.latestMeasurement();
    if (!latest) return;

    this.activeGoals().forEach(goal => {
      let currentValue: number | undefined;

      if (goal.type === 'weight') {
        currentValue = latest.weight;
      } else if (goal.type === 'bodyFat') {
        currentValue = latest.bodyFatPercentage;
      } else if (goal.type === 'measurement' && goal.measurementType) {
        currentValue = latest[goal.measurementType] as number | undefined;
      }

      if (currentValue === undefined) return;

      const isGaining = goal.targetValue > goal.startValue;
      const goalReached = isGaining
        ? currentValue >= goal.targetValue
        : currentValue <= goal.targetValue;

      if (goalReached) {
        this.completeGoal(goal.id).subscribe();
      }
    });
  }

  getGoalProgress(goalId: string): number {
    const goal = this.getGoalById(goalId);
    if (!goal) return 0;

    const latest = this.latestMeasurement();
    if (!latest) return 0;

    let currentValue: number | undefined;

    if (goal.type === 'weight') {
      currentValue = latest.weight;
    } else if (goal.type === 'bodyFat') {
      currentValue = latest.bodyFatPercentage;
    } else if (goal.type === 'measurement' && goal.measurementType) {
      currentValue = latest[goal.measurementType] as number | undefined;
    }

    if (currentValue === undefined) return 0;

    const totalChange = Math.abs(goal.targetValue - goal.startValue);
    const currentChange = Math.abs(currentValue - goal.startValue);

    const isGaining = goal.targetValue > goal.startValue;
    const isMovingRight = isGaining
      ? currentValue > goal.startValue
      : currentValue < goal.startValue;

    if (!isMovingRight) return 0;

    const progress = Math.min(100, (currentChange / totalChange) * 100);
    return Math.round(progress);
  }

  getMeasurementLabel(field: keyof BodyMeasurement): string {
    const labels: Record<string, string> = {
      weight: 'Weight',
      bodyFatPercentage: 'Body Fat %',
      chest: 'Chest',
      waist: 'Waist',
      hips: 'Hips',
      leftBicep: 'Left Bicep',
      rightBicep: 'Right Bicep',
      leftThigh: 'Left Thigh',
      rightThigh: 'Right Thigh',
      neck: 'Neck',
      shoulders: 'Shoulders',
      leftCalf: 'Left Calf',
      rightCalf: 'Right Calf',
      leftForearm: 'Left Forearm',
      rightForearm: 'Right Forearm'
    };
    return labels[field] || field;
  }

  refresh(): void {
    this.loadData();
  }
}
