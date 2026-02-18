import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { StatisticsService } from './statistics.service';
import { WorkoutService } from './workout.service';
import { ExerciseService } from './exercise.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { SettingsService } from './settings.service';
import { Workout } from '../models';

// Minimal workout factory for getMuscleGroupDistribution tests
function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    name: 'Test Workout',
    status: 'completed',
    startedAt: '2026-01-15T10:00:00Z',
    completedAt: '2026-01-15T11:00:00Z',
    exercises: [],
    totalVolume: 0,
    totalSets: 0,
    totalReps: 0,
    ...overrides,
  } as Workout;
}

const mockWorkoutService = {
  completedWorkouts: jest.fn().mockReturnValue([]),
  getWorkoutsForExercise: jest.fn().mockReturnValue([]),
  getWorkoutsInDateRange: jest.fn().mockReturnValue([]),
  getWorkoutById: jest.fn().mockReturnValue(undefined),
  getWorkoutStreak: jest.fn().mockReturnValue(0),
  getLongestStreak: jest.fn().mockReturnValue(0),
};

const mockExerciseService = {
  exercises: jest.fn().mockReturnValue([]),
  getExerciseById: jest.fn().mockReturnValue(undefined),
  getMuscleGroupLabel: jest.fn().mockImplementation((mg: string) => mg),
};

const mockAuthService = { isAuthenticated: jest.fn().mockReturnValue(false) };
const mockToastService = { error: jest.fn(), success: jest.fn() };
const mockSettingsService = { weightUnit: jest.fn().mockReturnValue('kg') };

describe('StatisticsService', () => {
  let service: StatisticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkoutService.completedWorkouts.mockReturnValue([]);
    mockWorkoutService.getWorkoutsForExercise.mockReturnValue([]);
    mockExerciseService.exercises.mockReturnValue([]);
    mockAuthService.isAuthenticated.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StatisticsService,
        { provide: WorkoutService, useValue: mockWorkoutService },
        { provide: ExerciseService, useValue: mockExerciseService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    });

    service = TestBed.inject(StatisticsService);
    TestBed.inject(HttpTestingController).verify();
  });

  // ---------------------------------------------------------------------------
  // formatDuration
  // ---------------------------------------------------------------------------
  describe('formatDuration', () => {
    it('formats seconds-only durations as "Xs"', () => {
      expect(service.formatDuration(0)).toBe('0s');
      expect(service.formatDuration(45)).toBe('45s');
      expect(service.formatDuration(59)).toBe('59s');
    });

    it('formats minute durations as "Xm"', () => {
      expect(service.formatDuration(60)).toBe('1m');
      expect(service.formatDuration(90)).toBe('1m');
      expect(service.formatDuration(3599)).toBe('59m');
    });

    it('formats hour durations as "Xh Ym"', () => {
      expect(service.formatDuration(3600)).toBe('1h 0m');
      expect(service.formatDuration(3660)).toBe('1h 1m');
      expect(service.formatDuration(5400)).toBe('1h 30m');
      expect(service.formatDuration(7200)).toBe('2h 0m');
    });
  });

  // ---------------------------------------------------------------------------
  // formatVolume
  // ---------------------------------------------------------------------------
  describe('formatVolume', () => {
    it('formats values below 1000 kg as "X kg"', () => {
      expect(service.formatVolume(0)).toBe('0 kg');
      expect(service.formatVolume(500)).toBe('500 kg');
      expect(service.formatVolume(999)).toBe('999 kg');
    });

    it('formats values at or above 1000 kg as tonnes', () => {
      expect(service.formatVolume(1000)).toBe('1.0t');
      expect(service.formatVolume(1500)).toBe('1.5t');
      expect(service.formatVolume(10000)).toBe('10.0t');
    });

    it('rounds sub-1000 values to the nearest kg', () => {
      expect(service.formatVolume(99.7)).toBe('100 kg');
    });
  });

  // ---------------------------------------------------------------------------
  // getMuscleGroupDistribution (explicit workouts)
  // ---------------------------------------------------------------------------
  describe('getMuscleGroupDistribution', () => {
    it('returns an empty array for empty workouts', () => {
      expect(service.getMuscleGroupDistribution([])).toEqual([]);
    });

    it('calculates distribution for a single exercise with one muscle group', () => {
      mockExerciseService.getExerciseById.mockReturnValue({
        id: 'e1',
        name: 'Bench Press',
        muscleGroups: ['chest'],
        category: 'strength',
        equipment: ['barbell'],
      });

      const workout = makeWorkout({
        exercises: [
          {
            id: 'we1',
            exerciseTemplateId: 'e1',
            exerciseName: 'Bench Press',
            sets: [
              {
                id: 's1',
                setNumber: 1,
                isCompleted: true,
                isWarmup: false,
                actualWeight: 100,
                actualReps: 5,
              },
              {
                id: 's2',
                setNumber: 2,
                isCompleted: true,
                isWarmup: false,
                actualWeight: 100,
                actualReps: 5,
              },
            ],
          } as any,
        ],
      });

      const result = service.getMuscleGroupDistribution([workout]);
      expect(result).toHaveLength(1);
      expect(result[0].muscleGroup).toBe('chest');
      expect(result[0].setCount).toBe(2);
      expect(result[0].volume).toBe(1000); // 2 sets × 5 reps × 100 kg
      expect(result[0].percentage).toBe(100);
    });

    it('excludes warmup sets from distribution', () => {
      mockExerciseService.getExerciseById.mockReturnValue({
        id: 'e1',
        name: 'Bench Press',
        muscleGroups: ['chest'],
        category: 'strength',
        equipment: ['barbell'],
      });

      const workout = makeWorkout({
        exercises: [
          {
            id: 'we1',
            exerciseTemplateId: 'e1',
            exerciseName: 'Bench Press',
            sets: [
              { id: 's1', setNumber: 1, isCompleted: true, isWarmup: true, actualWeight: 60, actualReps: 10 },
              { id: 's2', setNumber: 2, isCompleted: true, isWarmup: false, actualWeight: 100, actualReps: 5 },
            ],
          } as any,
        ],
      });

      const result = service.getMuscleGroupDistribution([workout]);
      // Only 1 working set counted
      expect(result[0].setCount).toBe(1);
    });

    it('splits volume equally across multiple muscle groups', () => {
      mockExerciseService.getExerciseById.mockReturnValue({
        id: 'e1',
        name: 'Incline Dumbbell Press',
        muscleGroups: ['chest', 'triceps'],
        category: 'strength',
        equipment: ['dumbbell'],
      });

      const workout = makeWorkout({
        exercises: [
          {
            id: 'we1',
            exerciseTemplateId: 'e1',
            exerciseName: 'Incline Dumbbell Press',
            sets: [
              { id: 's1', setNumber: 1, isCompleted: true, isWarmup: false, actualWeight: 40, actualReps: 10 },
            ],
          } as any,
        ],
      });

      const result = service.getMuscleGroupDistribution([workout]);
      expect(result).toHaveLength(2);
      // 400 total volume split 50/50
      const chest = result.find((r) => r.muscleGroup === 'chest')!;
      const triceps = result.find((r) => r.muscleGroup === 'triceps')!;
      expect(chest.volume).toBe(200);
      expect(triceps.volume).toBe(200);
    });

    it('returns results sorted by set count descending', () => {
      // Two exercises: chest (2 sets) and back (1 set)
      mockExerciseService.getExerciseById
        .mockReturnValueOnce({ id: 'e1', muscleGroups: ['chest'] })
        .mockReturnValueOnce({ id: 'e2', muscleGroups: ['back'] });

      const workout = makeWorkout({
        exercises: [
          {
            id: 'we1',
            exerciseTemplateId: 'e1',
            exerciseName: 'Bench Press',
            sets: [
              { id: 's1', setNumber: 1, isCompleted: true, isWarmup: false, actualWeight: 100, actualReps: 5 },
              { id: 's2', setNumber: 2, isCompleted: true, isWarmup: false, actualWeight: 100, actualReps: 5 },
            ],
          } as any,
          {
            id: 'we2',
            exerciseTemplateId: 'e2',
            exerciseName: 'Pull-up',
            sets: [
              { id: 's3', setNumber: 1, isCompleted: true, isWarmup: false, actualWeight: 0, actualReps: 8 },
            ],
          } as any,
        ],
      });

      const result = service.getMuscleGroupDistribution([workout]);
      expect(result[0].muscleGroup).toBe('chest');
      expect(result[1].muscleGroup).toBe('back');
    });

    it('skips exercises whose template is not found', () => {
      mockExerciseService.getExerciseById.mockReturnValue(undefined);
      const workout = makeWorkout({
        exercises: [
          {
            id: 'we1',
            exerciseTemplateId: 'unknown',
            exerciseName: 'Unknown',
            sets: [{ id: 's1', setNumber: 1, isCompleted: true, isWarmup: false }],
          } as any,
        ],
      });
      expect(service.getMuscleGroupDistribution([workout])).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getExerciseProgress
  // ---------------------------------------------------------------------------
  describe('getExerciseProgress', () => {
    it('returns null when the exercise template is not found', () => {
      mockExerciseService.getExerciseById.mockReturnValue(undefined);
      expect(service.getExerciseProgress('unknown-id')).toBeNull();
    });

    it('returns null when there are no workout sessions', () => {
      mockExerciseService.getExerciseById.mockReturnValue({
        id: 'e1',
        name: 'Bench Press',
        muscleGroups: ['chest'],
      });
      mockWorkoutService.getWorkoutsForExercise.mockReturnValue([]);
      expect(service.getExerciseProgress('e1')).toBeNull();
    });

    it('calculates estimated 1RM using the Epley formula', () => {
      mockExerciseService.getExerciseById.mockReturnValue({
        id: 'e1',
        name: 'Bench Press',
        muscleGroups: ['chest'],
      });

      const workout: Partial<Workout> = {
        id: 'w1',
        completedAt: '2026-01-15T11:00:00Z',
        exercises: [
          {
            id: 'we1',
            exerciseTemplateId: 'e1',
            exerciseName: 'Bench Press',
            sets: [
              {
                id: 's1',
                setNumber: 1,
                isCompleted: true,
                isWarmup: false,
                actualWeight: 100,
                actualReps: 5,
              },
            ],
          } as any,
        ],
      };

      mockWorkoutService.getWorkoutsForExercise.mockReturnValue([workout]);

      const result = service.getExerciseProgress('e1');
      expect(result).not.toBeNull();
      expect(result!.exerciseId).toBe('e1');
      expect(result!.exerciseName).toBe('Bench Press');
      expect(result!.dataPoints).toHaveLength(1);
      expect(result!.dataPoints[0].maxWeight).toBe(100);
      // Epley: 100 / (1.0278 - 0.0278 * 5) = 100 / 0.889 ≈ 112.5
      expect(result!.dataPoints[0].estimated1RM).toBeCloseTo(112.5, 0);
    });

    it('returns maxWeight as-is when actualReps is 1', () => {
      mockExerciseService.getExerciseById.mockReturnValue({
        id: 'e1',
        name: 'Deadlift',
        muscleGroups: ['back'],
      });

      const workout: Partial<Workout> = {
        id: 'w1',
        completedAt: '2026-01-15T11:00:00Z',
        exercises: [
          {
            id: 'we1',
            exerciseTemplateId: 'e1',
            exerciseName: 'Deadlift',
            sets: [
              { id: 's1', setNumber: 1, isCompleted: true, isWarmup: false, actualWeight: 200, actualReps: 1 },
            ],
          } as any,
        ],
      };

      mockWorkoutService.getWorkoutsForExercise.mockReturnValue([workout]);
      const result = service.getExerciseProgress('e1')!;
      expect(result.dataPoints[0].estimated1RM).toBe(200);
    });
  });
});
