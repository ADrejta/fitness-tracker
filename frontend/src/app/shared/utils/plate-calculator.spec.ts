import { calculatePlates, getAvailablePlates, getBarWeight } from './plate-calculator';

describe('calculatePlates', () => {
  describe('kg — default config', () => {
    it('returns no plates and no remainder when target equals bar weight', () => {
      const result = calculatePlates(20, 'kg');
      expect(result.perSide).toEqual([]);
      expect(result.remainder).toBe(0);
      expect(result.isAchievable).toBe(true);
    });

    it('returns no plates and a remainder when target is below bar weight', () => {
      const result = calculatePlates(10, 'kg');
      expect(result.perSide).toEqual([]);
      expect(result.remainder).toBe(10);
      expect(result.isAchievable).toBe(false);
    });

    it('calculates 100 kg (25 + 15 per side)', () => {
      const result = calculatePlates(100, 'kg');
      expect(result.isAchievable).toBe(true);
      expect(result.remainder).toBe(0);
      // Greedy: 40 kg per side → 1×25 + 1×15
      expect(result.perSide).toEqual([
        { weight: 25, count: 1 },
        { weight: 15, count: 1 },
      ]);
    });

    it('calculates 60 kg (1×20 per side)', () => {
      const result = calculatePlates(60, 'kg');
      expect(result.isAchievable).toBe(true);
      expect(result.remainder).toBe(0);
      expect(result.perSide).toEqual([{ weight: 20, count: 1 }]);
    });

    it('calculates 140 kg (2×25 + 2×10 per side)', () => {
      // Per side: (140 - 20) / 2 = 60 kg
      // Greedy: 2×25 = 50, 10 = 10, total 60
      const result = calculatePlates(140, 'kg');
      expect(result.isAchievable).toBe(true);
      expect(result.perSide).toContainEqual({ weight: 25, count: 2 });
      expect(result.perSide).toContainEqual({ weight: 10, count: 1 });
    });

    it('reports remainder and isAchievable false for unachievable weight', () => {
      // 21 kg: 0.5 kg per side — no plate that small (min is 1.25)
      const result = calculatePlates(21, 'kg');
      expect(result.isAchievable).toBe(false);
      expect(result.remainder).toBeGreaterThan(0);
    });

    it('total weight from plates matches target', () => {
      const result = calculatePlates(120, 'kg');
      const perSideKg = result.perSide.reduce((sum, p) => sum + p.weight * p.count, 0);
      const totalOnBar = 20 + perSideKg * 2;
      expect(totalOnBar + result.remainder).toBe(120);
    });
  });

  describe('lbs — default config', () => {
    it('returns no plates when target equals bar weight (45 lbs)', () => {
      const result = calculatePlates(45, 'lbs');
      expect(result.perSide).toEqual([]);
      expect(result.isAchievable).toBe(true);
    });

    it('calculates 135 lbs (1×45 per side)', () => {
      const result = calculatePlates(135, 'lbs');
      expect(result.isAchievable).toBe(true);
      expect(result.perSide).toEqual([{ weight: 45, count: 1 }]);
    });

    it('calculates 225 lbs (2×45 per side)', () => {
      const result = calculatePlates(225, 'lbs');
      expect(result.isAchievable).toBe(true);
      expect(result.perSide).toContainEqual({ weight: 45, count: 2 });
    });
  });

  describe('custom config', () => {
    it('uses custom bar weight', () => {
      // 15 kg bar, target 15: should be bar-only
      const result = calculatePlates(15, 'kg', { barbellWeight: 15, availablePlates: [10, 5] });
      expect(result.perSide).toEqual([]);
      expect(result.isAchievable).toBe(true);
    });

    it('uses custom plate set', () => {
      // Only 10 kg plates: target 60 → 20 kg per side → 2×10
      const result = calculatePlates(60, 'kg', { barbellWeight: 20, availablePlates: [10] });
      expect(result.isAchievable).toBe(true);
      expect(result.perSide).toEqual([{ weight: 10, count: 2 }]);
    });

    it('reports remainder when custom plates cannot achieve target', () => {
      // Only 25 kg plates: target 60 → 20 kg per side → 0×25, remainder 40
      const result = calculatePlates(60, 'kg', { barbellWeight: 20, availablePlates: [25] });
      expect(result.isAchievable).toBe(false);
      expect(result.remainder).toBeGreaterThan(0);
    });
  });
});

describe('getBarWeight', () => {
  it('returns 20 for kg', () => {
    expect(getBarWeight('kg')).toBe(20);
  });

  it('returns 45 for lbs', () => {
    expect(getBarWeight('lbs')).toBe(45);
  });
});

describe('getAvailablePlates', () => {
  it('returns standard kg plates including 25 and 1.25', () => {
    const plates = getAvailablePlates('kg');
    expect(plates).toContain(25);
    expect(plates).toContain(1.25);
  });

  it('returns standard lbs plates including 45 and 2.5', () => {
    const plates = getAvailablePlates('lbs');
    expect(plates).toContain(45);
    expect(plates).toContain(2.5);
  });

  it('returns a copy — mutations do not affect future calls', () => {
    const plates = getAvailablePlates('kg');
    plates.push(999);
    expect(getAvailablePlates('kg')).not.toContain(999);
  });
});
