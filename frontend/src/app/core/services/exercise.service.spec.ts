import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ExerciseService } from './exercise.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { ExerciseTemplate } from '../models';

const SEED_EXERCISES: ExerciseTemplate[] = [
  {
    id: 'e1',
    name: 'Bench Press',
    muscleGroups: ['chest', 'triceps'],
    category: 'strength',
    equipment: ['barbell'],
    isCustom: false,
  },
  {
    id: 'e2',
    name: 'Pull-up',
    muscleGroups: ['back', 'biceps'],
    category: 'bodyweight',
    equipment: ['pull-up-bar'],
    isCustom: false,
  },
  {
    id: 'e3',
    name: 'My Custom Row',
    muscleGroups: ['back'],
    category: 'strength',
    equipment: ['dumbbell'],
    isCustom: true,
  },
  {
    id: 'e4',
    name: 'Squat',
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    category: 'strength',
    equipment: ['barbell'],
    isCustom: false,
  },
];

const mockStorage = { get: jest.fn(), set: jest.fn() };
const mockAuthService = { isAuthenticated: jest.fn() };
const mockToastService = { error: jest.fn(), success: jest.fn() };

describe('ExerciseService', () => {
  let service: ExerciseService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    jest.clearAllMocks();
    // Seed storage with exercises that include non-custom ones so
    // loadDefaultExercises() skips the fetch call
    mockStorage.get.mockReturnValue(SEED_EXERCISES);
    mockAuthService.isAuthenticated.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ExerciseService,
        { provide: StorageService, useValue: mockStorage },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
      ],
    });

    service = TestBed.inject(ExerciseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe('initial state', () => {
    it('loads exercises from storage on creation', () => {
      expect(service.exercises()).toHaveLength(4);
    });

    it('customExercises computed signal returns only custom exercises', () => {
      expect(service.customExercises()).toHaveLength(1);
      expect(service.customExercises()[0].id).toBe('e3');
    });

    it('defaultExercises computed signal returns only non-custom exercises', () => {
      expect(service.defaultExercises()).toHaveLength(3);
      expect(service.defaultExercises().every((e) => !e.isCustom)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getExerciseById
  // ---------------------------------------------------------------------------
  describe('getExerciseById', () => {
    it('returns the matching exercise', () => {
      expect(service.getExerciseById('e1')).toEqual(SEED_EXERCISES[0]);
    });

    it('returns undefined when the id is not found', () => {
      expect(service.getExerciseById('not-a-real-id')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // searchExercises
  // ---------------------------------------------------------------------------
  describe('searchExercises', () => {
    it('returns all exercises for an empty query', () => {
      expect(service.searchExercises('')).toHaveLength(4);
    });

    it('returns all exercises for a whitespace-only query', () => {
      expect(service.searchExercises('   ')).toHaveLength(4);
    });

    it('matches by exercise name (case-insensitive)', () => {
      const result = service.searchExercises('bench');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
    });

    it('is case-insensitive', () => {
      expect(service.searchExercises('BENCH PRESS')).toHaveLength(1);
    });

    it('matches by muscle group', () => {
      const result = service.searchExercises('biceps');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e2');
    });

    it('matches by equipment', () => {
      const result = service.searchExercises('barbell');
      const ids = result.map((e) => e.id);
      expect(ids).toContain('e1');
      expect(ids).toContain('e4');
    });

    it('returns empty array when no match', () => {
      expect(service.searchExercises('xyznotfound')).toHaveLength(0);
    });

    it('returns multiple matches for a broad query', () => {
      const result = service.searchExercises('back');
      const ids = result.map((e) => e.id);
      expect(ids).toContain('e2');
      expect(ids).toContain('e3');
    });
  });

  // ---------------------------------------------------------------------------
  // filterByMuscleGroup
  // ---------------------------------------------------------------------------
  describe('filterByMuscleGroup', () => {
    it('returns exercises that include the given muscle group', () => {
      const result = service.filterByMuscleGroup('back');
      const ids = result.map((e) => e.id);
      expect(ids).toContain('e2');
      expect(ids).toContain('e3');
    });

    it('returns exercises for single-muscle-group match', () => {
      expect(service.filterByMuscleGroup('chest')).toHaveLength(1);
    });

    it('returns empty array when no exercises match', () => {
      expect(service.filterByMuscleGroup('calves')).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // filterByCategory
  // ---------------------------------------------------------------------------
  describe('filterByCategory', () => {
    it('returns only bodyweight exercises', () => {
      const result = service.filterByCategory('bodyweight');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e2');
    });

    it('returns multiple strength exercises', () => {
      expect(service.filterByCategory('strength')).toHaveLength(3);
    });

    it('returns empty array for a category with no exercises', () => {
      expect(service.filterByCategory('cardio')).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // filterByEquipment
  // ---------------------------------------------------------------------------
  describe('filterByEquipment', () => {
    it('returns exercises using the given equipment', () => {
      const result = service.filterByEquipment('dumbbell');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e3');
    });

    it('returns multiple exercises when equipment is shared', () => {
      expect(service.filterByEquipment('barbell')).toHaveLength(2);
    });

    it('returns empty array when no exercises use the equipment', () => {
      expect(service.filterByEquipment('kettlebell')).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // filterExercises (combined filters)
  // ---------------------------------------------------------------------------
  describe('filterExercises', () => {
    it('returns all exercises when no filters are provided', () => {
      expect(service.filterExercises({})).toHaveLength(4);
    });

    it('filters by query', () => {
      const result = service.filterExercises({ query: 'pull' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e2');
    });

    it('filters by muscleGroups array', () => {
      const result = service.filterExercises({ muscleGroups: ['chest'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
    });

    it('filters by categories array', () => {
      expect(service.filterExercises({ categories: ['bodyweight'] })).toHaveLength(1);
    });

    it('filters by equipment array', () => {
      expect(service.filterExercises({ equipment: ['barbell'] })).toHaveLength(2);
    });

    it('combines query and muscleGroups filters', () => {
      const result = service.filterExercises({ query: 'squat', muscleGroups: ['quads'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e4');
    });

    it('returns empty array when combined filters match nothing', () => {
      // Bench Press matches the query but not the muscleGroup
      expect(service.filterExercises({ query: 'bench', muscleGroups: ['back'] })).toHaveLength(0);
    });

    it('filters by multiple muscle groups (OR logic)', () => {
      const result = service.filterExercises({ muscleGroups: ['chest', 'quads'] });
      const ids = result.map((e) => e.id);
      expect(ids).toContain('e1');
      expect(ids).toContain('e4');
    });
  });

  // ---------------------------------------------------------------------------
  // getMuscleGroupLabel
  // ---------------------------------------------------------------------------
  describe('getMuscleGroupLabel', () => {
    it('returns a human-readable label for standard groups', () => {
      expect(service.getMuscleGroupLabel('chest')).toBe('Chest');
      expect(service.getMuscleGroupLabel('back')).toBe('Back');
      expect(service.getMuscleGroupLabel('biceps')).toBe('Biceps');
    });

    it('returns a human-readable label for compound names', () => {
      expect(service.getMuscleGroupLabel('lower-back')).toBe('Lower Back');
      expect(service.getMuscleGroupLabel('quads')).toBe('Quadriceps');
      expect(service.getMuscleGroupLabel('lats')).toBe('Latissimus');
    });
  });

  // ---------------------------------------------------------------------------
  // getEquipmentLabel
  // ---------------------------------------------------------------------------
  describe('getEquipmentLabel', () => {
    it('returns a human-readable label for simple equipment', () => {
      expect(service.getEquipmentLabel('barbell')).toBe('Barbell');
      expect(service.getEquipmentLabel('dumbbell')).toBe('Dumbbell');
    });

    it('returns a human-readable label for hyphenated equipment', () => {
      expect(service.getEquipmentLabel('pull-up-bar')).toBe('Pull-up Bar');
      expect(service.getEquipmentLabel('smith-machine')).toBe('Smith Machine');
      expect(service.getEquipmentLabel('resistance-band')).toBe('Resistance Band');
    });
  });

  // ---------------------------------------------------------------------------
  // getMuscleGroups / getEquipmentTypes
  // ---------------------------------------------------------------------------
  describe('getMuscleGroups', () => {
    it('returns 15 muscle groups', () => {
      expect(service.getMuscleGroups()).toHaveLength(15);
    });

    it('includes all major groups', () => {
      const groups = service.getMuscleGroups();
      expect(groups).toContain('chest');
      expect(groups).toContain('back');
      expect(groups).toContain('lower-back');
      expect(groups).toContain('abs');
    });
  });

  describe('getEquipmentTypes', () => {
    it('returns 13 equipment types', () => {
      expect(service.getEquipmentTypes()).toHaveLength(13);
    });

    it('includes common equipment', () => {
      const types = service.getEquipmentTypes();
      expect(types).toContain('barbell');
      expect(types).toContain('dumbbell');
      expect(types).toContain('bodyweight');
    });
  });
});
