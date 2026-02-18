import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TemplateService } from './template.service';
import { WorkoutService } from './workout.service';
import { ExerciseService } from './exercise.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
import { WorkoutTemplate } from '../models';

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const TEMPLATE_A: WorkoutTemplate = {
  id: 't1',
  name: 'Push Day',
  description: 'Chest and triceps',
  exercises: [
    {
      id: 'e1',
      exerciseTemplateId: 'et1',
      exerciseName: 'Bench Press',
      sets: [{ setNumber: 1, targetReps: 5, isWarmup: false }],
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: '2026-01-20T00:00:00Z',
  usageCount: 10,
  tags: ['push', 'strength'],
};

const TEMPLATE_B: WorkoutTemplate = {
  id: 't2',
  name: 'Pull Day',
  description: 'Back and biceps',
  exercises: [
    {
      id: 'e2',
      exerciseTemplateId: 'et2',
      exerciseName: 'Pull-up',
      sets: [{ setNumber: 1, targetReps: 8, isWarmup: false }],
    },
  ],
  createdAt: '2026-01-02T00:00:00Z',
  lastUsedAt: '2026-01-15T00:00:00Z',
  usageCount: 5,
  tags: ['pull', 'back'],
};

const TEMPLATE_C: WorkoutTemplate = {
  id: 't3',
  name: 'Leg Day',
  exercises: [
    {
      id: 'e3',
      exerciseTemplateId: 'et3',
      exerciseName: 'Squat',
      sets: [{ setNumber: 1, targetReps: 5, isWarmup: false }],
    },
  ],
  createdAt: '2026-01-03T00:00:00Z',
  // No lastUsedAt
  usageCount: 3,
  tags: ['legs'],
};

const SEED_TEMPLATES = [TEMPLATE_A, TEMPLATE_B, TEMPLATE_C];

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------
const mockStorage = { get: jest.fn(), set: jest.fn() };
const mockAuthService = { isAuthenticated: jest.fn() };
const mockWorkoutService = {
  getWorkoutById: jest.fn().mockReturnValue(undefined),
  startWorkout: jest.fn(),
  addExerciseToWorkout: jest.fn(),
  addSetToExercise: jest.fn(),
};
const mockExerciseService = { getExerciseById: jest.fn() };
const mockToastService = { error: jest.fn(), success: jest.fn() };

// ---------------------------------------------------------------------------
// Helper: create a fresh service in TestBed
// ---------------------------------------------------------------------------
function makeService() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      TemplateService,
      { provide: StorageService, useValue: mockStorage },
      { provide: WorkoutService, useValue: mockWorkoutService },
      { provide: ExerciseService, useValue: mockExerciseService },
      { provide: AuthService, useValue: mockAuthService },
      { provide: ToastService, useValue: mockToastService },
    ],
  });
  const service = TestBed.inject(TemplateService);
  TestBed.inject(HttpTestingController).verify();
  return service;
}

describe('TemplateService (guest mode)', () => {
  let service: TemplateService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.get.mockReturnValue(SEED_TEMPLATES);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    service = makeService();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe('initial state', () => {
    it('loads templates from storage on creation', () => {
      expect(service.templates()).toHaveLength(3);
    });

    it('isLoading starts false', () => {
      expect(service.isLoading()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getTemplateById
  // ---------------------------------------------------------------------------
  describe('getTemplateById', () => {
    it('returns the template when found', () => {
      expect(service.getTemplateById('t1')).toEqual(TEMPLATE_A);
    });

    it('returns undefined for an unknown id', () => {
      expect(service.getTemplateById('nope')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // searchTemplates
  // ---------------------------------------------------------------------------
  describe('searchTemplates', () => {
    it('returns all templates for an empty query', () => {
      expect(service.searchTemplates('')).toHaveLength(3);
    });

    it('matches by name (case-insensitive)', () => {
      const result = service.searchTemplates('push');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });

    it('matches by description', () => {
      const result = service.searchTemplates('biceps');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t2');
    });

    it('matches by tag', () => {
      const result = service.searchTemplates('strength');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });

    it('matches by exercise name', () => {
      const result = service.searchTemplates('squat');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t3');
    });

    it('is case-insensitive', () => {
      expect(service.searchTemplates('PULL')).toHaveLength(1);
    });

    it('returns empty array for no match', () => {
      expect(service.searchTemplates('xyznotfound')).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // sortedTemplates computed
  // ---------------------------------------------------------------------------
  describe('sortedTemplates', () => {
    it('sorts by lastUsedAt descending (most recent first)', () => {
      const sorted = service.sortedTemplates();
      // TEMPLATE_A last used 2026-01-20, TEMPLATE_B 2026-01-15, TEMPLATE_C never
      expect(sorted[0].id).toBe('t1');
      expect(sorted[1].id).toBe('t2');
    });

    it('puts templates with no lastUsedAt after those with lastUsedAt', () => {
      const sorted = service.sortedTemplates();
      expect(sorted[2].id).toBe('t3');
    });

    it('sorts by usageCount descending when both have no lastUsedAt', () => {
      mockStorage.get.mockReturnValue([
        { ...TEMPLATE_C, id: 'a', name: 'B', lastUsedAt: undefined, usageCount: 5 },
        { ...TEMPLATE_C, id: 'b', name: 'A', lastUsedAt: undefined, usageCount: 10 },
      ]);
      TestBed.resetTestingModule();
      service = makeService();
      const sorted = service.sortedTemplates();
      expect(sorted[0].id).toBe('b'); // higher usage count first
    });

    it('sorts alphabetically by name when usage counts are equal', () => {
      mockStorage.get.mockReturnValue([
        { ...TEMPLATE_C, id: 'a', name: 'Zzz Template', lastUsedAt: undefined, usageCount: 0 },
        { ...TEMPLATE_C, id: 'b', name: 'Aaa Template', lastUsedAt: undefined, usageCount: 0 },
      ]);
      TestBed.resetTestingModule();
      service = makeService();
      const sorted = service.sortedTemplates();
      expect(sorted[0].id).toBe('b'); // 'Aaa' < 'Zzz'
    });
  });

  // ---------------------------------------------------------------------------
  // recentTemplates computed
  // ---------------------------------------------------------------------------
  describe('recentTemplates', () => {
    it('returns at most 5 templates', () => {
      const manyTemplates = Array.from({ length: 8 }, (_, i) => ({
        ...TEMPLATE_A,
        id: `t${i}`,
        name: `Template ${i}`,
        lastUsedAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        usageCount: i,
      }));
      mockStorage.get.mockReturnValue(manyTemplates);
      TestBed.resetTestingModule();
      service = makeService();
      expect(service.recentTemplates()).toHaveLength(5);
    });

    it('returns all templates when there are 3 or fewer', () => {
      expect(service.recentTemplates()).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Guest CRUD — createTemplate
  // ---------------------------------------------------------------------------
  describe('createTemplate (guest)', () => {
    const newTemplate = {
      name: 'New Push',
      exercises: [],
      usageCount: 0,
    };

    it('adds the template to the signal', () => {
      service.createTemplate(newTemplate).subscribe();
      expect(service.templates()).toHaveLength(4);
    });

    it('returns the created template with a generated id', () => {
      let result: WorkoutTemplate | undefined;
      service.createTemplate(newTemplate).subscribe((t) => (result = t));
      expect(result!.id.length).toBeGreaterThan(0);
      expect(result!.name).toBe('New Push');
    });

    it('sets usageCount to 0 and populates createdAt', () => {
      let result: WorkoutTemplate | undefined;
      service.createTemplate(newTemplate).subscribe((t) => (result = t));
      expect(result!.usageCount).toBe(0);
      expect(result!.createdAt).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Guest CRUD — deleteTemplate
  // ---------------------------------------------------------------------------
  describe('deleteTemplate (guest)', () => {
    it('removes the template from the signal', () => {
      service.deleteTemplate('t1').subscribe();
      expect(service.templates()).toHaveLength(2);
      expect(service.getTemplateById('t1')).toBeUndefined();
    });

    it('returns true', () => {
      let result: boolean | undefined;
      service.deleteTemplate('t1').subscribe((r) => (result = r));
      expect(result).toBe(true);
    });

    it('leaves other templates intact', () => {
      service.deleteTemplate('t1').subscribe();
      expect(service.getTemplateById('t2')).toBeDefined();
      expect(service.getTemplateById('t3')).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Guest CRUD — updateTemplate
  // ---------------------------------------------------------------------------
  describe('updateTemplate (guest)', () => {
    it('updates the template name in the signal', () => {
      service.updateTemplate('t1', { name: 'New Name' }).subscribe();
      expect(service.getTemplateById('t1')!.name).toBe('New Name');
    });

    it('does not change other fields', () => {
      service.updateTemplate('t1', { name: 'New Name' }).subscribe();
      expect(service.getTemplateById('t1')!.usageCount).toBe(10);
    });

    it('returns the updated template', () => {
      let result: WorkoutTemplate | undefined;
      service.updateTemplate('t1', { name: 'Updated' }).subscribe((t) => (result = t));
      expect(result!.name).toBe('Updated');
    });
  });

  // ---------------------------------------------------------------------------
  // Guest CRUD — duplicateTemplate
  // ---------------------------------------------------------------------------
  describe('duplicateTemplate (guest)', () => {
    it('creates a copy with "(Copy)" appended to the name', () => {
      let copy: WorkoutTemplate | null | undefined;
      service.duplicateTemplate('t1').subscribe((t) => (copy = t));
      expect(copy!.name).toBe('Push Day (Copy)');
    });

    it('gives the copy a different id from the original', () => {
      let copy: WorkoutTemplate | null | undefined;
      service.duplicateTemplate('t1').subscribe((t) => (copy = t));
      expect(copy!.id).not.toBe('t1');
    });

    it('returns null for an unknown id', () => {
      let result: WorkoutTemplate | null | undefined;
      service.duplicateTemplate('nope').subscribe((t) => (result = t));
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // removeExerciseFromTemplate (guest)
  // ---------------------------------------------------------------------------
  describe('removeExerciseFromTemplate (guest)', () => {
    it('returns false for an unknown template', () => {
      expect(service.removeExerciseFromTemplate('nope', 'e1')).toBe(false);
    });

    it('removes the exercise from the template', () => {
      service.removeExerciseFromTemplate('t1', 'e1');
      expect(service.getTemplateById('t1')!.exercises).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // reorderTemplateExercises (guest)
  // ---------------------------------------------------------------------------
  describe('reorderTemplateExercises', () => {
    it('returns false for an unknown template', () => {
      expect(service.reorderTemplateExercises('nope', ['e1'])).toBe(false);
    });

    it('returns false when fewer ids are provided than the template has exercises', () => {
      // t1 has 1 exercise; providing 0 ids → reordered length (0) ≠ template length (1)
      expect(service.reorderTemplateExercises('t1', [])).toBe(false);
    });

    it('returns true and reorders exercises correctly', () => {
      // t2 has one exercise — add a second so we can reorder
      service.updateTemplate('t2', {
        exercises: [
          { id: 'ea', exerciseTemplateId: 'et1', exerciseName: 'A', sets: [] },
          { id: 'eb', exerciseTemplateId: 'et2', exerciseName: 'B', sets: [] },
        ],
      }).subscribe();

      const result = service.reorderTemplateExercises('t2', ['eb', 'ea']);
      expect(result).toBe(true);
      const exercises = service.getTemplateById('t2')!.exercises;
      expect(exercises[0].id).toBe('eb');
      expect(exercises[1].id).toBe('ea');
    });
  });

  // ---------------------------------------------------------------------------
  // Superset helpers (guest, pure logic)
  // ---------------------------------------------------------------------------
  describe('createSupersetInTemplate', () => {
    beforeEach(() => {
      // Give t1 two exercises
      service.updateTemplate('t1', {
        exercises: [
          { id: 'ea', exerciseTemplateId: 'et1', exerciseName: 'A', sets: [] },
          { id: 'eb', exerciseTemplateId: 'et2', exerciseName: 'B', sets: [] },
        ],
      }).subscribe();
    });

    it('returns null for fewer than 2 exercise ids', () => {
      expect(service.createSupersetInTemplate('t1', ['ea'])).toBeNull();
    });

    it('returns null for an unknown template', () => {
      expect(service.createSupersetInTemplate('nope', ['ea', 'eb'])).toBeNull();
    });

    it('assigns a supersetId to all specified exercises', () => {
      const supersetId = service.createSupersetInTemplate('t1', ['ea', 'eb']);
      expect(supersetId).not.toBeNull();
      const exercises = service.getTemplateById('t1')!.exercises;
      expect(exercises.find((e) => e.id === 'ea')!.supersetId).toBe(supersetId!);
      expect(exercises.find((e) => e.id === 'eb')!.supersetId).toBe(supersetId!);
    });
  });

  describe('getExercisesInSupersetForTemplate', () => {
    it('returns empty array for an unknown template', () => {
      expect(service.getExercisesInSupersetForTemplate('nope', 'ss1')).toEqual([]);
    });

    it('returns exercises sharing the given supersetId', () => {
      service.updateTemplate('t1', {
        exercises: [
          { id: 'ea', exerciseTemplateId: 'et1', exerciseName: 'A', sets: [], supersetId: 'ss1' },
          { id: 'eb', exerciseTemplateId: 'et2', exerciseName: 'B', sets: [], supersetId: 'ss1' },
          { id: 'ec', exerciseTemplateId: 'et3', exerciseName: 'C', sets: [] },
        ],
      }).subscribe();

      const result = service.getExercisesInSupersetForTemplate('t1', 'ss1');
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toContain('ea');
      expect(result.map((e) => e.id)).toContain('eb');
    });
  });
});
