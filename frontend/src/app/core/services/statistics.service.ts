import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { WorkoutService } from './workout.service';
import { ExerciseService } from './exercise.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { SettingsService } from './settings.service';
import { Workout, MuscleGroup } from '../models';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  format,
  parseISO,
  eachDayOfInterval,
  eachWeekOfInterval,
  isSameDay
} from 'date-fns';
import { firstValueFrom } from 'rxjs';

export interface VolumeDataPoint {
  label: string;
  date: Date;
  volume: number;
  workoutCount: number;
}

export interface MuscleGroupData {
  muscleGroup: MuscleGroup;
  label: string;
  setCount: number;
  volume: number;
  percentage: number;
}

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  dataPoints: {
    date: string;
    maxWeight: number;
    totalVolume: number;
    estimated1RM: number;
  }[];
}

// Backend response interfaces
interface DashboardSummary {
  totalWorkouts: number;
  workoutsThisWeek: number;
  totalVolume: number;
  volumeThisWeek: number;
  totalSets: number;
  totalReps: number;
  currentStreak: number;
  longestStreak: number;
  recentPrs: PersonalRecord[];
}

interface PersonalRecord {
  id: string;
  exerciseTemplateId: string;
  exerciseName: string;
  type: string;
  value: number;
  reps?: number;
  achievedAt: string;
  workoutId: string;
}

interface WeeklyVolumeResponse {
  weeks: WeekVolume[];
}

interface WeekVolume {
  weekStart: string;
  totalVolume: number;
  workoutCount: number;
}

interface MuscleGroupDistributionResponse {
  distributions: {
    muscleGroup: MuscleGroup;
    setCount: number;
    volume: number;
    percentage: number;
  }[];
}

interface ExerciseProgressResponse {
  exerciseTemplateId: string;
  exerciseName: string;
  history: {
    date: string;
    workoutId: string;
    maxWeight?: number;
    totalVolume: number;
    estimated1rm?: number;
  }[];
  personalRecords: PersonalRecord[];
}

interface ExercisesWithHistoryResponse {
  exercises: {
    exerciseTemplateId: string;
    exerciseName: string;
    workoutCount: number;
  }[];
}

export interface ExerciseWithHistory {
  id: string;
  name: string;
  workoutCount: number;
}

export type SuggestionType = 'increase_weight' | 'increase_reps' | 'maintain';
export type SuggestionConfidence = 'high' | 'medium' | 'low';

export interface ExerciseOverloadSuggestion {
  exerciseTemplateId: string;
  exerciseName: string;
  suggestionType: SuggestionType;
  suggestedWeight: number | null;
  suggestedReps: number | null;
  currentWeight: number;
  currentReps: number;
  reason: string;
  confidence: SuggestionConfidence;
}

interface OverloadSuggestionsResponse {
  suggestions: ExerciseOverloadSuggestion[];
}

export interface ExercisePlateauAlert {
  exerciseTemplateId: string;
  exerciseName: string;
  weeksSinceProgress: number;
  lastMaxWeight: number;
  currentMaxWeight: number;
  lastProgressDate: string | null;
  suggestion: string;
}

interface PlateauAlertResponse {
  alerts: ExercisePlateauAlert[];
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private http = inject(HttpClient);
  private workoutService = inject(WorkoutService);
  private exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private settingsService = inject(SettingsService);

  private _summary = signal<DashboardSummary | null>(null);
  private _isLoading = signal<boolean>(false);
  private _exercisesWithHistory = signal<ExerciseWithHistory[]>([]);
  private _muscleGroupDistribution = signal<MuscleGroupData[]>([]);
  private _overloadSuggestions = signal<ExerciseOverloadSuggestion[]>([]);
  private _plateauAlerts = signal<ExercisePlateauAlert[]>([]);
  private _muscleHeatmapRows = signal<{ periodStart: string; muscleGroup: string; setCount: number }[]>([]);
  private _consistencyDays = signal<{ date: string; count: number }[]>([]);

  readonly summary = this._summary.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly exercisesWithHistory = this._exercisesWithHistory.asReadonly();
  readonly muscleGroupDistribution = this._muscleGroupDistribution.asReadonly();
  readonly overloadSuggestions = this._overloadSuggestions.asReadonly();
  readonly plateauAlerts = this._plateauAlerts.asReadonly();
  readonly muscleHeatmapRows = this._muscleHeatmapRows.asReadonly();
  readonly consistencyDays = this._consistencyDays.asReadonly();

  // Computed stats (local fallback)
  readonly totalWorkouts = computed(() =>
    this._summary()?.totalWorkouts ?? this.workoutService.completedWorkouts().length
  );

  readonly totalVolume = computed(() =>
    this._summary()?.totalVolume ?? this.workoutService.completedWorkouts().reduce((sum, w) => sum + w.totalVolume, 0)
  );

  readonly totalSets = computed(() =>
    this._summary()?.totalSets ?? this.workoutService.completedWorkouts().reduce((sum, w) => sum + w.totalSets, 0)
  );

  readonly totalReps = computed(() =>
    this._summary()?.totalReps ?? this.workoutService.completedWorkouts().reduce((sum, w) => sum + w.totalReps, 0)
  );

  readonly averageWorkoutDuration = computed(() => {
    const workouts = this.workoutService.completedWorkouts().filter(w => w.duration);
    if (workouts.length === 0) return 0;
    const total = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    return Math.round(total / workouts.length);
  });

  readonly currentStreak = computed(() =>
    this._summary()?.currentStreak ?? this.workoutService.getWorkoutStreak()
  );

  readonly longestStreak = computed(() =>
    this._summary()?.longestStreak ?? this.workoutService.getLongestStreak()
  );

  readonly thisWeekWorkouts = computed(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return this.workoutService.getWorkoutsInDateRange(start, end);
  });

  readonly thisWeekVolume = computed(() =>
    this._summary()?.volumeThisWeek ?? this.thisWeekWorkouts().reduce((sum, w) => sum + w.totalVolume, 0)
  );

  readonly thisWeekDuration = computed(() =>
    this.thisWeekWorkouts().reduce((sum, w) => sum + (w.duration || 0), 0)
  );

  readonly thisMonthWorkouts = computed(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return this.workoutService.getWorkoutsInDateRange(start, end);
  });

  constructor() {
    this.loadSummary();
    this.loadExercisesWithHistory();
    this.loadMuscleGroupDistribution();
    this.loadOverloadSuggestions();
    this.loadPlateauAlerts();
    this.loadMuscleHeatmap(8, false);
    this.loadConsistencyHeatmap();
  }

  loadConsistencyHeatmap(): void {
    if (!this.authService.isAuthenticated()) return;
    this.http.get<{ days: { date: string; count: number }[] }>(
      `${environment.apiUrl}/statistics/consistency-heatmap`
    ).subscribe({
      next: (res) => this._consistencyDays.set(res.days),
      error: () => {}
    });
  }

  loadMuscleHeatmap(count: number, monthly: boolean): void {
    if (!this.authService.isAuthenticated()) return;
    const params = `count=${count}&monthly=${monthly}`;
    this.http.get<{ rows: { periodStart: string; muscleGroup: string; setCount: number }[] }>(
      `${environment.apiUrl}/statistics/muscle-heatmap?${params}`
    ).subscribe({
      next: (res) => this._muscleHeatmapRows.set(res.rows),
      error: () => {}
    });
  }

  private loadSummary(): void {
    if (this.authService.isAuthenticated()) {
      this._isLoading.set(true);
      this.http.get<DashboardSummary>(`${environment.apiUrl}/statistics/summary`)
        .subscribe({
          next: (summary) => {
            this._summary.set(summary);
            this._isLoading.set(false);
          },
          error: () => {
            this._isLoading.set(false);
          }
        });
    }
  }

  private loadExercisesWithHistory(): void {
    if (this.authService.isAuthenticated()) {
      this.http.get<ExercisesWithHistoryResponse>(`${environment.apiUrl}/statistics/exercises-with-history`)
        .subscribe({
          next: (response) => {
            this._exercisesWithHistory.set(
              response.exercises.map(e => ({
                id: e.exerciseTemplateId,
                name: e.exerciseName,
                workoutCount: e.workoutCount
              }))
            );
          },
          error: () => {
            // Keep empty array on error
          }
        });
    }
  }

  private loadMuscleGroupDistribution(): void {
    if (this.authService.isAuthenticated()) {
      this.http.get<MuscleGroupDistributionResponse>(`${environment.apiUrl}/statistics/muscle-groups`)
        .subscribe({
          next: (response) => {
            this._muscleGroupDistribution.set(
              response.distributions.map(d => ({
                muscleGroup: d.muscleGroup,
                label: this.exerciseService.getMuscleGroupLabel(d.muscleGroup),
                setCount: d.setCount,
                volume: d.volume,
                percentage: Math.round(d.percentage)
              }))
            );
          },
          error: () => {
            // Fallback to local computation on error
            this._muscleGroupDistribution.set(this.getMuscleGroupDistribution());
          }
        });
    } else {
      // For non-authenticated users, compute locally
      this._muscleGroupDistribution.set(this.getMuscleGroupDistribution());
    }
  }

  private loadOverloadSuggestions(): void {
    if (this.authService.isAuthenticated()) {
      this.http.get<OverloadSuggestionsResponse>(`${environment.apiUrl}/statistics/progressive-overload`)
        .subscribe({
          next: (response) => {
            this._overloadSuggestions.set(response.suggestions);
          },
          error: () => {
            // Fall back to local computation
            this._overloadSuggestions.set(this.computeLocalOverloadSuggestions());
          }
        });
    } else {
      this._overloadSuggestions.set(this.computeLocalOverloadSuggestions());
    }
  }

  private loadPlateauAlerts(): void {
    if (this.authService.isAuthenticated()) {
      this.http.get<PlateauAlertResponse>(`${environment.apiUrl}/statistics/plateau-alerts`)
        .subscribe({
          next: (response) => {
            this._plateauAlerts.set(response.alerts);
          },
          error: () => {
            this._plateauAlerts.set(this.computeLocalPlateauAlerts());
          }
        });
    } else {
      this._plateauAlerts.set(this.computeLocalPlateauAlerts());
    }
  }

  private computeLocalPlateauAlerts(): ExercisePlateauAlert[] {
    const alerts: ExercisePlateauAlert[] = [];
    const exercises = this.exerciseService.exercises();
    const now = new Date();
    const threeWeeksAgo = subWeeks(now, 3);

    for (const template of exercises) {
      const workouts = this.workoutService.getWorkoutsForExercise(template.id);
      if (workouts.length < 2) continue;

      // Split into recent (last 3 weeks) and older
      const recent = workouts.filter(w => w.completedAt && new Date(w.completedAt) >= threeWeeksAgo);
      const older = workouts.filter(w => w.completedAt && new Date(w.completedAt) < threeWeeksAgo);

      if (recent.length === 0 || older.length === 0) continue;

      // Get max weight from recent sessions
      let recentMax = 0;
      for (const workout of recent) {
        const exercise = (workout.exercises || []).find(e => e.exerciseTemplateId === template.id);
        if (!exercise) continue;
        const workingSets = exercise.sets.filter(s => !s.isWarmup && s.isCompleted);
        const sessionMax = Math.max(...workingSets.map(s => s.actualWeight || 0), 0);
        if (sessionMax > recentMax) recentMax = sessionMax;
      }

      // Get max weight and date from older sessions
      let olderMax = 0;
      let olderMaxDate: string | null = null;
      for (const workout of older) {
        const exercise = (workout.exercises || []).find(e => e.exerciseTemplateId === template.id);
        if (!exercise) continue;
        const workingSets = exercise.sets.filter(s => !s.isWarmup && s.isCompleted);
        const sessionMax = Math.max(...workingSets.map(s => s.actualWeight || 0), 0);
        if (sessionMax > olderMax) {
          olderMax = sessionMax;
          olderMaxDate = workout.completedAt || null;
        }
      }

      if (recentMax <= olderMax && olderMax > 0) {
        const daysSince = olderMaxDate
          ? Math.floor((now.getTime() - new Date(olderMaxDate).getTime()) / (1000 * 60 * 60 * 24))
          : 21;
        const weeksSince = Math.max(3, Math.floor(daysSince / 7));

        const suggestion = weeksSince >= 6
          ? 'Consider a deload week or try a variation of this exercise.'
          : 'Try adjusting rep ranges, adding pause reps, or changing tempo.';

        alerts.push({
          exerciseTemplateId: template.id,
          exerciseName: template.name,
          weeksSinceProgress: weeksSince,
          lastMaxWeight: olderMax,
          currentMaxWeight: recentMax,
          lastProgressDate: olderMaxDate,
          suggestion,
        });
      }
    }

    return alerts;
  }

  private isLargeMuscleExercise(muscleGroups: MuscleGroup[]): boolean {
    const largeMuscles: MuscleGroup[] = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'lats'];
    return muscleGroups.some(mg => largeMuscles.includes(mg));
  }

  private computeLocalOverloadSuggestions(): ExerciseOverloadSuggestion[] {
    const suggestions: ExerciseOverloadSuggestion[] = [];
    const exercises = this.exerciseService.exercises();
    const unit = this.settingsService.weightUnit();
    const largeIncrement = unit === 'kg' ? 2.5 : 5;
    const smallIncrement = unit === 'kg' ? 1.25 : 2.5;

    for (const template of exercises) {
      const workouts = this.workoutService.getWorkoutsForExercise(template.id);
      if (workouts.length === 0) continue;

      const isLarge = this.isLargeMuscleExercise(template.muscleGroups);
      const increment = isLarge ? largeIncrement : smallIncrement;

      const sessionCount = Math.min(workouts.length, 3);
      const recentWorkouts = workouts.slice(0, sessionCount);

      const sessionData = recentWorkouts.map(workout => {
        const exercise = (workout.exercises || []).find(e => e.exerciseTemplateId === template.id);
        if (!exercise) return null;
        const workingSets = exercise.sets.filter(s => !s.isWarmup && s.isCompleted);
        if (workingSets.length === 0) return null;
        const maxWeight = Math.max(...workingSets.map(s => s.actualWeight || 0));
        const setsAtMax = workingSets.filter(s => s.actualWeight === maxWeight);
        const avgReps = Math.round(setsAtMax.reduce((sum, s) => sum + (s.actualReps || 0), 0) / setsAtMax.length);
        const allTargetsMet = workingSets.every(s => (s.actualReps || 0) > 0);
        return { maxWeight, avgReps, allTargetsMet };
      }).filter((d): d is NonNullable<typeof d> => d !== null);

      if (sessionData.length === 0) continue;

      const last = sessionData[0];
      const confidence: SuggestionConfidence = sessionCount >= 3 ? 'high' : sessionCount >= 2 ? 'medium' : 'low';

      if (sessionData.length >= 2) {
        const prev = sessionData[1];
        const consistent = last.allTargetsMet && prev.allTargetsMet && Math.abs(last.maxWeight - prev.maxWeight) < 0.01;

        if (isLarge) {
          // Large-muscle exercises: favor weight increases
          if (consistent) {
            const suggested = last.maxWeight + increment;
            suggestions.push({
              exerciseTemplateId: template.id,
              exerciseName: template.name,
              suggestionType: 'increase_weight',
              suggestedWeight: suggested,
              suggestedReps: null,
              currentWeight: last.maxWeight,
              currentReps: last.avgReps,
              reason: `Completed all sets at ${last.maxWeight}${unit} in last 2 sessions. Try ${suggested}${unit}!`,
              confidence,
            });
          } else if (last.allTargetsMet) {
            const suggestedReps = Math.min(last.avgReps + 1, 15);
            suggestions.push({
              exerciseTemplateId: template.id,
              exerciseName: template.name,
              suggestionType: 'increase_reps',
              suggestedWeight: null,
              suggestedReps,
              currentWeight: last.maxWeight,
              currentReps: last.avgReps,
              reason: `Good session! Try ${suggestedReps} reps at ${last.maxWeight}${unit} next time.`,
              confidence,
            });
          } else {
            suggestions.push({
              exerciseTemplateId: template.id,
              exerciseName: template.name,
              suggestionType: 'maintain',
              suggestedWeight: null,
              suggestedReps: null,
              currentWeight: last.maxWeight,
              currentReps: last.avgReps,
              reason: `Keep working at ${last.maxWeight}${unit} x ${last.avgReps} reps.`,
              confidence,
            });
          }
        } else {
          // Small-muscle exercises: favor rep increases first
          if (consistent && last.avgReps < 15) {
            const suggestedReps = Math.min(last.avgReps + 1, 15);
            suggestions.push({
              exerciseTemplateId: template.id,
              exerciseName: template.name,
              suggestionType: 'increase_reps',
              suggestedWeight: null,
              suggestedReps,
              currentWeight: last.maxWeight,
              currentReps: last.avgReps,
              reason: `Isolation exercise — build reps before adding weight. Try ${suggestedReps} reps at ${last.maxWeight}${unit}.`,
              confidence,
            });
          } else if (consistent && last.avgReps >= 15) {
            const suggested = last.maxWeight + increment;
            suggestions.push({
              exerciseTemplateId: template.id,
              exerciseName: template.name,
              suggestionType: 'increase_weight',
              suggestedWeight: suggested,
              suggestedReps: null,
              currentWeight: last.maxWeight,
              currentReps: last.avgReps,
              reason: `Hit ${last.avgReps} reps consistently — time for a small weight jump. Try ${suggested}${unit}!`,
              confidence,
            });
          } else if (last.allTargetsMet) {
            suggestions.push({
              exerciseTemplateId: template.id,
              exerciseName: template.name,
              suggestionType: 'maintain',
              suggestedWeight: null,
              suggestedReps: null,
              currentWeight: last.maxWeight,
              currentReps: last.avgReps,
              reason: `Good session at ${last.maxWeight}${unit} x ${last.avgReps} reps. Build more consistency before progressing.`,
              confidence,
            });
          } else {
            suggestions.push({
              exerciseTemplateId: template.id,
              exerciseName: template.name,
              suggestionType: 'maintain',
              suggestedWeight: null,
              suggestedReps: null,
              currentWeight: last.maxWeight,
              currentReps: last.avgReps,
              reason: `Keep working at ${last.maxWeight}${unit} x ${last.avgReps} reps.`,
              confidence,
            });
          }
        }
      } else {
        suggestions.push({
          exerciseTemplateId: template.id,
          exerciseName: template.name,
          suggestionType: 'maintain',
          suggestedWeight: null,
          suggestedReps: null,
          currentWeight: last.maxWeight,
          currentReps: last.avgReps,
          reason: 'Need more workout data for a suggestion.',
          confidence,
        });
      }
    }

    return suggestions;
  }

  getSuggestionForExercise(exerciseTemplateId: string): ExerciseOverloadSuggestion | undefined {
    return this._overloadSuggestions().find(s => s.exerciseTemplateId === exerciseTemplateId);
  }

  getWeeklyVolumeTrend(weeks: number = 12): VolumeDataPoint[] {
    // For authenticated users, we could fetch from backend
    // But for now, compute locally for both cases
    const data: VolumeDataPoint[] = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const workouts = this.workoutService.getWorkoutsInDateRange(weekStart, weekEnd);

      data.push({
        label: format(weekStart, 'MMM d'),
        date: weekStart,
        volume: workouts.reduce((sum, w) => sum + w.totalVolume, 0),
        workoutCount: workouts.length
      });
    }

    return data;
  }

  getDailyVolumeTrend(days: number = 30): VolumeDataPoint[] {
    const data: VolumeDataPoint[] = [];
    const now = new Date();
    const start = subWeeks(now, Math.ceil(days / 7));

    const allDays = eachDayOfInterval({ start, end: now });
    const workouts = this.workoutService.completedWorkouts();

    allDays.slice(-days).forEach(day => {
      const dayWorkouts = workouts.filter(w =>
        isSameDay(parseISO(w.completedAt!), day)
      );

      data.push({
        label: format(day, 'MMM d'),
        date: day,
        volume: dayWorkouts.reduce((sum, w) => sum + w.totalVolume, 0),
        workoutCount: dayWorkouts.length
      });
    });

    return data;
  }

  getMuscleGroupDistribution(workouts?: Workout[]): MuscleGroupData[] {
    const targetWorkouts = workouts || this.workoutService.completedWorkouts();
    const muscleData: Map<MuscleGroup, { sets: number; volume: number }> = new Map();

    targetWorkouts.forEach(workout => {
      (workout.exercises || []).forEach(exercise => {
        const template = this.exerciseService.getExerciseById(exercise.exerciseTemplateId);
        if (!template) return;

        const exerciseVolume = exercise.sets
          .filter(s => s.isCompleted && !s.isWarmup)
          .reduce((sum, s) => sum + (s.actualReps || 0) * (s.actualWeight || 0), 0);

        const exerciseSets = exercise.sets.filter(s => s.isCompleted && !s.isWarmup).length;

        const volumePerMuscle = exerciseVolume / template.muscleGroups.length;
        const setsPerMuscle = exerciseSets / template.muscleGroups.length;

        template.muscleGroups.forEach(muscleGroup => {
          const current = muscleData.get(muscleGroup) || { sets: 0, volume: 0 };
          muscleData.set(muscleGroup, {
            sets: current.sets + setsPerMuscle,
            volume: current.volume + volumePerMuscle
          });
        });
      });
    });

    const totalSets = Array.from(muscleData.values()).reduce((sum, d) => sum + d.sets, 0);

    const result: MuscleGroupData[] = [];
    muscleData.forEach((data, muscleGroup) => {
      result.push({
        muscleGroup,
        label: this.exerciseService.getMuscleGroupLabel(muscleGroup),
        setCount: Math.round(data.sets),
        volume: Math.round(data.volume),
        percentage: totalSets > 0 ? Math.round((data.sets / totalSets) * 100) : 0
      });
    });

    return result.sort((a, b) => b.setCount - a.setCount);
  }

  getExerciseProgress(exerciseTemplateId: string, limit?: number): ExerciseProgress | null {
    const template = this.exerciseService.getExerciseById(exerciseTemplateId);
    if (!template) return null;

    const workouts = this.workoutService.getWorkoutsForExercise(exerciseTemplateId);
    if (workouts.length === 0) return null;

    const dataPoints = workouts
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
      .slice(limit ? -limit : undefined)
      .map(workout => {
        const exercise = (workout.exercises || []).find(e => e.exerciseTemplateId === exerciseTemplateId);
        if (!exercise) return null;

        const completedSets = exercise.sets.filter(s => s.isCompleted && !s.isWarmup);
        if (completedSets.length === 0) return null;

        const maxWeightSet = completedSets.reduce((max, set) =>
          (set.actualWeight || 0) > (max.actualWeight || 0) ? set : max
        , completedSets[0]);

        const totalVolume = completedSets.reduce(
          (sum, s) => sum + (s.actualReps || 0) * (s.actualWeight || 0),
          0
        );

        let estimated1RM = maxWeightSet.actualWeight || 0;
        if (maxWeightSet.actualReps && maxWeightSet.actualReps > 1 && maxWeightSet.actualWeight) {
          estimated1RM = maxWeightSet.actualWeight / (1.0278 - 0.0278 * maxWeightSet.actualReps);
        }

        return {
          date: workout.completedAt!,
          maxWeight: maxWeightSet.actualWeight || 0,
          totalVolume,
          estimated1RM: Math.round(estimated1RM * 10) / 10
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    return {
      exerciseId: exerciseTemplateId,
      exerciseName: template.name,
      dataPoints
    };
  }

  getWorkoutsPerWeek(weeks: number = 12): { week: string; count: number }[] {
    const data: { week: string; count: number }[] = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const workouts = this.workoutService.getWorkoutsInDateRange(weekStart, weekEnd);

      data.push({
        week: format(weekStart, 'MMM d'),
        count: workouts.length
      });
    }

    return data;
  }

  getAverageWorkoutsPerWeek(): number {
    const workouts = this.workoutService.completedWorkouts();
    if (workouts.length === 0) return 0;

    const sortedWorkouts = [...workouts].sort(
      (a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()
    );

    const firstWorkoutDate = parseISO(sortedWorkouts[0].completedAt!);
    const lastWorkoutDate = parseISO(sortedWorkouts[sortedWorkouts.length - 1].completedAt!);

    const weeks = eachWeekOfInterval(
      { start: firstWorkoutDate, end: lastWorkoutDate },
      { weekStartsOn: 1 }
    ).length;

    if (weeks === 0) return workouts.length;
    return Math.round((workouts.length / weeks) * 10) / 10;
  }

  getWorkoutCalendarData(months: number = 3): Map<string, number> {
    const data = new Map<string, number>();
    const now = new Date();
    const start = subMonths(now, months);

    const allDays = eachDayOfInterval({ start, end: now });
    const workouts = this.workoutService.completedWorkouts();

    allDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayWorkouts = workouts.filter(w =>
        isSameDay(parseISO(w.completedAt!), day)
      );
      data.set(dayKey, dayWorkouts.length);
    });

    return data;
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  formatVolume(kg: number): string {
    if (kg < 1000) return `${Math.round(kg)} kg`;
    return `${(kg / 1000).toFixed(1)}t`;
  }

  refresh(): void {
    this.loadSummary();
    this.loadExercisesWithHistory();
    this.loadMuscleGroupDistribution();
    this.loadOverloadSuggestions();
    this.loadPlateauAlerts();
  }

  async getExerciseProgressFromApi(exerciseId: string): Promise<ExerciseProgress | null> {
    if (!this.authService.isAuthenticated()) {
      return this.getExerciseProgress(exerciseId);
    }

    try {
      const response = await firstValueFrom(
        this.http.get<ExerciseProgressResponse>(`${environment.apiUrl}/statistics/exercises/${exerciseId}/progress`)
      );

      return {
        exerciseId: response.exerciseTemplateId,
        exerciseName: response.exerciseName,
        dataPoints: response.history.map(h => ({
          date: h.date,
          maxWeight: h.maxWeight || 0,
          totalVolume: h.totalVolume,
          estimated1RM: h.estimated1rm || 0
        }))
      };
    } catch (error) {
      console.error('Failed to fetch exercise progress from API:', error);
      this.toastService.error('Failed to load exercise progress');
      return this.getExerciseProgress(exerciseId);
    }
  }
}
