import { calculateWarmupSets } from './warmup-calculator';

describe('calculateWarmupSets', () => {
  describe('edge cases — no warmup needed', () => {
    it('returns empty array when working weight equals bar weight', () => {
      expect(calculateWarmupSets(20, 'kg')).toEqual([]);
    });

    it('returns empty array when working weight is below bar weight', () => {
      expect(calculateWarmupSets(15, 'kg')).toEqual([]);
    });

    it('returns empty array for lbs bar weight (45)', () => {
      expect(calculateWarmupSets(45, 'lbs')).toEqual([]);
    });
  });

  describe('standard working weight (100 kg)', () => {
    let sets: ReturnType<typeof calculateWarmupSets>;

    beforeEach(() => {
      sets = calculateWarmupSets(100, 'kg');
    });

    it('produces 4 warmup sets', () => {
      expect(sets).toHaveLength(4);
    });

    it('first set is bar-only (20 kg, 10 reps)', () => {
      expect(sets[0].weight).toBe(20);
      expect(sets[0].reps).toBe(10);
      expect(sets[0].label).toBe('Bar');
    });

    it('each set weight is strictly below the working weight', () => {
      sets.forEach(set => expect(set.weight).toBeLessThan(100));
    });

    it('set weights increase through the progression', () => {
      for (let i = 1; i < sets.length; i++) {
        expect(sets[i].weight).toBeGreaterThanOrEqual(sets[i - 1].weight);
      }
    });

    it('set reps decrease through the progression', () => {
      for (let i = 1; i < sets.length; i++) {
        expect(sets[i].reps).toBeLessThanOrEqual(sets[i - 1].reps);
      }
    });

    it('50% set is achievable (50 kg)', () => {
      const set50 = sets.find(s => s.label === '50%');
      expect(set50?.weight).toBe(50);
      expect(set50?.reps).toBe(8);
    });

    it('70% set is achievable (70 kg)', () => {
      const set70 = sets.find(s => s.label === '70%');
      expect(set70?.weight).toBe(70);
      expect(set70?.reps).toBe(5);
    });

    it('85% set is achievable (85 kg)', () => {
      const set85 = sets.find(s => s.label === '85%');
      expect(set85?.weight).toBe(85);
      expect(set85?.reps).toBe(3);
    });
  });

  describe('light working weight — duplicate removal', () => {
    it('does not produce duplicate weights', () => {
      // At 30 kg the 50%/70% targets both round down to bar weight
      const sets = calculateWarmupSets(30, 'kg');
      const weights = sets.map(s => s.weight);
      expect(new Set(weights).size).toBe(weights.length);
    });

    it('skips any warmup step whose weight equals or exceeds working weight', () => {
      const workingWeight = 25;
      const sets = calculateWarmupSets(workingWeight, 'kg');
      sets.forEach(set => expect(set.weight).toBeLessThan(workingWeight));
    });
  });

  describe('lbs', () => {
    it('uses 45 lbs as bar weight', () => {
      const sets = calculateWarmupSets(135, 'lbs');
      expect(sets[0].weight).toBe(45);
    });

    it('rounds 50% of 225 lbs down to nearest achievable plate combo (110 lbs)', () => {
      // 50% target = 112.5 lbs, per side = 33.75 lbs
      // Greedy with [45,35,25,10,5,2.5]: 25+5+2.5=32.5 per side → 45 + 65 = 110
      const sets = calculateWarmupSets(225, 'lbs');
      const set50 = sets.find(s => s.label === '50%');
      expect(set50?.weight).toBe(110);
    });
  });

  describe('custom config', () => {
    it('respects custom bar weight', () => {
      const sets = calculateWarmupSets(100, 'kg', { barbellWeight: 15 });
      expect(sets[0].weight).toBe(15);
    });

    it('respects custom plate selection', () => {
      // With only 20 kg plates, warmup weights snap to reachable combinations
      const sets = calculateWarmupSets(100, 'kg', {
        barbellWeight: 20,
        availablePlates: [20],
      });
      sets.forEach(set => {
        const perSide = (set.weight - 20) / 2;
        expect(perSide % 20).toBe(0); // must be a multiple of 20
      });
    });
  });
});
