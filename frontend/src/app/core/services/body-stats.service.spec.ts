import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { BodyStatsService } from './body-stats.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { BodyMeasurement, BodyStatsGoal } from '../models';

const mockStorage = { get: jest.fn(), set: jest.fn() };
const mockAuthService = { isAuthenticated: jest.fn() };

function makeService() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      BodyStatsService,
      { provide: StorageService, useValue: mockStorage },
      { provide: AuthService, useValue: mockAuthService },
    ],
  });
  const service = TestBed.inject(BodyStatsService);
  // Verify no unexpected HTTP requests in non-auth mode
  TestBed.inject(HttpTestingController).verify();
  return service;
}

describe('BodyStatsService (guest mode)', () => {
  let service: BodyStatsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.get.mockReturnValue([]);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    service = makeService();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe('initial state', () => {
    it('measurements starts empty', () => {
      expect(service.measurements()).toEqual([]);
    });

    it('goals starts empty', () => {
      expect(service.goals()).toEqual([]);
    });

    it('isLoading starts false', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('latestMeasurement is null when there are no measurements', () => {
      expect(service.latestMeasurement()).toBeNull();
    });

    it('sortedMeasurements is empty', () => {
      expect(service.sortedMeasurements()).toEqual([]);
    });

    it('activeGoals is empty', () => {
      expect(service.activeGoals()).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // addMeasurement (guest)
  // ---------------------------------------------------------------------------
  describe('addMeasurement (guest)', () => {
    it('adds a measurement to the signal and returns it', () => {
      let result: BodyMeasurement | undefined;
      service
        .addMeasurement({ date: '2026-01-15', weight: 80 })
        .subscribe((m) => (result = m));

      expect(result).toBeDefined();
      expect(result!.weight).toBe(80);
      expect(service.measurements()).toHaveLength(1);
    });

    it('assigns a non-empty id', () => {
      let result: BodyMeasurement | undefined;
      service.addMeasurement({ date: '2026-01-15', weight: 80 }).subscribe((m) => (result = m));
      expect(result!.id.length).toBeGreaterThan(0);
    });

    it('stacks multiple measurements', () => {
      service.addMeasurement({ date: '2026-01-15', weight: 80 }).subscribe();
      service.addMeasurement({ date: '2026-01-16', weight: 79.5 }).subscribe();
      expect(service.measurements()).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // updateMeasurement (guest)
  // ---------------------------------------------------------------------------
  describe('updateMeasurement (guest)', () => {
    let id: string;

    beforeEach(() => {
      service.addMeasurement({ date: '2026-01-15', weight: 80 }).subscribe((m) => (id = m.id));
    });

    it('returns true on success', () => {
      let result: boolean | undefined;
      service.updateMeasurement(id, { weight: 79 }).subscribe((r) => (result = r as boolean));
      expect(result).toBe(true);
    });

    it('updates the measurement in the signal', () => {
      service.updateMeasurement(id, { weight: 79 }).subscribe();
      expect(service.getMeasurementById(id)!.weight).toBe(79);
    });

    it('does not change other measurements', () => {
      let id2!: string;
      service.addMeasurement({ date: '2026-01-16', weight: 81 }).subscribe((m) => (id2 = m.id));
      service.updateMeasurement(id, { weight: 79 }).subscribe();
      expect(service.getMeasurementById(id2)!.weight).toBe(81);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteMeasurement (guest)
  // ---------------------------------------------------------------------------
  describe('deleteMeasurement (guest)', () => {
    let id: string;

    beforeEach(() => {
      service.addMeasurement({ date: '2026-01-15', weight: 80 }).subscribe((m) => (id = m.id));
    });

    it('removes the measurement from the signal', () => {
      service.deleteMeasurement(id).subscribe();
      expect(service.measurements()).toHaveLength(0);
    });

    it('returns true', () => {
      let result: boolean | undefined;
      service.deleteMeasurement(id).subscribe((r) => (result = r as boolean));
      expect(result).toBe(true);
    });

    it('leaves other measurements intact', () => {
      let id2!: string;
      service.addMeasurement({ date: '2026-01-16', weight: 81 }).subscribe((m) => (id2 = m.id));
      service.deleteMeasurement(id).subscribe();
      expect(service.measurements()).toHaveLength(1);
      expect(service.getMeasurementById(id2)).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getMeasurementById
  // ---------------------------------------------------------------------------
  describe('getMeasurementById', () => {
    it('returns the measurement when found', () => {
      let id!: string;
      service.addMeasurement({ date: '2026-01-15', weight: 80 }).subscribe((m) => (id = m.id));
      expect(service.getMeasurementById(id)!.weight).toBe(80);
    });

    it('returns undefined for an unknown id', () => {
      expect(service.getMeasurementById('nope')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // sortedMeasurements and latestMeasurement
  // ---------------------------------------------------------------------------
  describe('sortedMeasurements', () => {
    it('sorts measurements newest first', () => {
      service.addMeasurement({ date: '2026-01-10', weight: 82 }).subscribe();
      service.addMeasurement({ date: '2026-01-20', weight: 80 }).subscribe();
      service.addMeasurement({ date: '2026-01-15', weight: 81 }).subscribe();

      const dates = service.sortedMeasurements().map((m) => m.date);
      expect(dates).toEqual(['2026-01-20', '2026-01-15', '2026-01-10']);
    });
  });

  describe('latestMeasurement', () => {
    it('returns the most recent measurement', () => {
      service.addMeasurement({ date: '2026-01-10', weight: 82 }).subscribe();
      service.addMeasurement({ date: '2026-01-20', weight: 80 }).subscribe();
      expect(service.latestMeasurement()!.date).toBe('2026-01-20');
    });
  });

  // ---------------------------------------------------------------------------
  // getMeasurementTrend
  // ---------------------------------------------------------------------------
  describe('getMeasurementTrend', () => {
    beforeEach(() => {
      service.addMeasurement({ date: '2026-01-10', weight: 82 }).subscribe();
      service.addMeasurement({ date: '2026-01-20', weight: 80 }).subscribe();
      service.addMeasurement({ date: '2026-01-15', weight: 81 }).subscribe();
    });

    it('returns data points in ascending date order', () => {
      const trend = service.getMeasurementTrend('weight');
      expect(trend.map((t) => t.date)).toEqual([
        '2026-01-10',
        '2026-01-15',
        '2026-01-20',
      ]);
    });

    it('excludes measurements without the requested field', () => {
      service.addMeasurement({ date: '2026-01-25' /* no weight */ }).subscribe();
      const trend = service.getMeasurementTrend('weight');
      expect(trend).toHaveLength(3);
    });

    it('respects the limit parameter (takes last N)', () => {
      const trend = service.getMeasurementTrend('weight', 2);
      expect(trend).toHaveLength(2);
      // Last 2 in chronological order
      expect(trend[0].date).toBe('2026-01-15');
      expect(trend[1].date).toBe('2026-01-20');
    });
  });

  // ---------------------------------------------------------------------------
  // getWeightChange
  // ---------------------------------------------------------------------------
  describe('getWeightChange', () => {
    it('returns null when there are fewer than 2 weight measurements', () => {
      service.addMeasurement({ date: '2026-01-10', weight: 80 }).subscribe();
      expect(service.getWeightChange()).toBeNull();
    });

    it('returns null when no measurements exist', () => {
      expect(service.getWeightChange()).toBeNull();
    });

    it('calculates absolute weight loss correctly', () => {
      service.addMeasurement({ date: '2026-01-01', weight: 90 }).subscribe();
      service.addMeasurement({ date: '2026-02-01', weight: 85 }).subscribe();
      const change = service.getWeightChange()!;
      expect(change.absolute).toBe(-5);
    });

    it('calculates percentage weight change correctly', () => {
      service.addMeasurement({ date: '2026-01-01', weight: 100 }).subscribe();
      service.addMeasurement({ date: '2026-02-01', weight: 90 }).subscribe();
      const change = service.getWeightChange()!;
      expect(change.percentage).toBe(-10);
    });

    it('returns a positive change for weight gain', () => {
      service.addMeasurement({ date: '2026-01-01', weight: 70 }).subscribe();
      service.addMeasurement({ date: '2026-02-01', weight: 75 }).subscribe();
      const change = service.getWeightChange()!;
      expect(change.absolute).toBe(5);
      expect(change.percentage).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Goals CRUD (guest)
  // ---------------------------------------------------------------------------
  describe('addGoal (guest)', () => {
    const newGoal = {
      type: 'weight' as const,
      targetValue: 75,
      startValue: 85,
      startDate: '2026-01-01',
      isCompleted: false,
    };

    it('adds a goal and returns it', () => {
      let result: BodyStatsGoal | undefined;
      service.addGoal(newGoal).subscribe((g) => (result = g));
      expect(result).toBeDefined();
      expect(result!.targetValue).toBe(75);
      expect(service.goals()).toHaveLength(1);
    });

    it('assigns a non-empty id', () => {
      let result: BodyStatsGoal | undefined;
      service.addGoal(newGoal).subscribe((g) => (result = g));
      expect(result!.id.length).toBeGreaterThan(0);
    });

    it('sets isCompleted to false', () => {
      let result: BodyStatsGoal | undefined;
      service.addGoal(newGoal).subscribe((g) => (result = g));
      expect(result!.isCompleted).toBe(false);
    });
  });

  describe('updateGoal (guest)', () => {
    let goalId: string;

    beforeEach(() => {
      service
        .addGoal({ type: 'weight', targetValue: 75, startValue: 85, startDate: '2026-01-01' })
        .subscribe((g) => (goalId = g.id));
    });

    it('returns true', () => {
      let result: boolean | undefined;
      service.updateGoal(goalId, { targetValue: 73 }).subscribe((r) => (result = r as boolean));
      expect(result).toBe(true);
    });

    it('updates the goal in the signal', () => {
      service.updateGoal(goalId, { targetValue: 73 }).subscribe();
      expect(service.getGoalById(goalId)!.targetValue).toBe(73);
    });
  });

  describe('deleteGoal (guest)', () => {
    let goalId: string;

    beforeEach(() => {
      service
        .addGoal({ type: 'weight', targetValue: 75, startValue: 85, startDate: '2026-01-01' })
        .subscribe((g) => (goalId = g.id));
    });

    it('removes the goal from the signal', () => {
      service.deleteGoal(goalId).subscribe();
      expect(service.goals()).toHaveLength(0);
    });

    it('returns true', () => {
      let result: boolean | undefined;
      service.deleteGoal(goalId).subscribe((r) => (result = r as boolean));
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // activeGoals / completedGoals computed
  // ---------------------------------------------------------------------------
  describe('activeGoals / completedGoals', () => {
    beforeEach(() => {
      service
        .addGoal({ type: 'weight', targetValue: 75, startValue: 85, startDate: '2026-01-01' })
        .subscribe();
      service
        .addGoal({ type: 'weight', targetValue: 70, startValue: 85, startDate: '2026-01-01' })
        .subscribe();
    });

    it('activeGoals contains goals where isCompleted is false', () => {
      expect(service.activeGoals()).toHaveLength(2);
    });

    it('completedGoals is empty when no goals are completed', () => {
      expect(service.completedGoals()).toHaveLength(0);
    });

    it('completedGoals includes goals marked completed', () => {
      let goalId!: string;
      service.goals().forEach((g) => (goalId = g.id)); // grab last id
      service.updateGoal(goalId, { isCompleted: true }).subscribe();
      expect(service.completedGoals()).toHaveLength(1);
      expect(service.activeGoals()).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getGoalProgress
  // ---------------------------------------------------------------------------
  describe('getGoalProgress', () => {
    it('returns 0 for an unknown goal id', () => {
      expect(service.getGoalProgress('nope')).toBe(0);
    });

    it('returns 0 when there are no measurements', () => {
      let goalId!: string;
      service
        .addGoal({ type: 'weight', targetValue: 75, startValue: 85, startDate: '2026-01-01' })
        .subscribe((g) => (goalId = g.id));
      expect(service.getGoalProgress(goalId)).toBe(0);
    });

    it('returns 0 when weight is moving in the wrong direction', () => {
      let goalId!: string;
      // Goal: lose weight from 85 to 75
      service
        .addGoal({ type: 'weight', targetValue: 75, startValue: 85, startDate: '2026-01-01' })
        .subscribe((g) => (goalId = g.id));
      // Add measurement showing weight going UP (wrong direction)
      service.addMeasurement({ date: '2026-01-10', weight: 90 }).subscribe();
      expect(service.getGoalProgress(goalId)).toBe(0);
    });

    it('calculates 50% progress toward a weight loss goal', () => {
      let goalId!: string;
      // Lose from 85 to 75 (10 kg total). Currently at 80 (5 kg done → 50%)
      service
        .addGoal({ type: 'weight', targetValue: 75, startValue: 85, startDate: '2026-01-01' })
        .subscribe((g) => (goalId = g.id));
      service.addMeasurement({ date: '2026-01-10', weight: 80 }).subscribe();
      expect(service.getGoalProgress(goalId)).toBe(50);
    });

    it('caps progress at 100', () => {
      let goalId!: string;
      // Lose from 85 to 75. Currently at 70 (past target → 100%)
      service
        .addGoal({ type: 'weight', targetValue: 75, startValue: 85, startDate: '2026-01-01' })
        .subscribe((g) => (goalId = g.id));
      service.addMeasurement({ date: '2026-01-10', weight: 70 }).subscribe();
      expect(service.getGoalProgress(goalId)).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // getMeasurementLabel
  // ---------------------------------------------------------------------------
  describe('getMeasurementLabel', () => {
    it.each([
      ['weight', 'Weight'],
      ['bodyFatPercentage', 'Body Fat %'],
      ['chest', 'Chest'],
      ['waist', 'Waist'],
      ['hips', 'Hips'],
      ['leftBicep', 'Left Bicep'],
      ['neck', 'Neck'],
    ])('returns "%s" for field "%s"', (field, expected) => {
      expect(service.getMeasurementLabel(field as keyof BodyMeasurement)).toBe(expected);
    });
  });
});
