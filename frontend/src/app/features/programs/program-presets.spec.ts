import { PROGRAM_PRESETS } from './program-presets';

describe('PROGRAM_PRESETS', () => {
  it('exports an array of 10 presets', () => {
    expect(PROGRAM_PRESETS).toHaveLength(10);
  });

  // ---------------------------------------------------------------------------
  // Structural invariants across all presets
  // ---------------------------------------------------------------------------
  describe('structural invariants', () => {
    it('every preset has a non-empty name', () => {
      PROGRAM_PRESETS.forEach((p) => expect(p.name.length).toBeGreaterThan(0));
    });

    it('every preset has a non-empty description', () => {
      PROGRAM_PRESETS.forEach((p) => expect(p.description.length).toBeGreaterThan(0));
    });

    it('every preset has a valid difficulty', () => {
      const valid = ['Beginner', 'Intermediate', 'Advanced'];
      PROGRAM_PRESETS.forEach((p) => expect(valid).toContain(p.difficulty));
    });

    it('every preset has a valid focus', () => {
      const valid = ['Strength', 'Hypertrophy'];
      PROGRAM_PRESETS.forEach((p) => expect(valid).toContain(p.focus));
    });

    it('every preset has at least 3 days per week', () => {
      PROGRAM_PRESETS.forEach((p) => expect(p.daysPerWeek).toBeGreaterThanOrEqual(3));
    });

    it('every preset runs for at least 1 week', () => {
      PROGRAM_PRESETS.forEach((p) => expect(p.durationWeeks).toBeGreaterThanOrEqual(1));
    });

    it('every preset schedule length equals durationWeeks × 7', () => {
      PROGRAM_PRESETS.forEach((p) =>
        expect(p.schedule).toHaveLength(p.durationWeeks * 7)
      );
    });

    it('every slot has a weekNumber within range', () => {
      PROGRAM_PRESETS.forEach((p) =>
        p.schedule.forEach((slot) => {
          expect(slot.weekNumber).toBeGreaterThanOrEqual(1);
          expect(slot.weekNumber).toBeLessThanOrEqual(p.durationWeeks);
        })
      );
    });

    it('every slot has a dayNumber between 1 and 7', () => {
      PROGRAM_PRESETS.forEach((p) =>
        p.schedule.forEach((slot) => {
          expect(slot.dayNumber).toBeGreaterThanOrEqual(1);
          expect(slot.dayNumber).toBeLessThanOrEqual(7);
        })
      );
    });

    it('rest-day slots have an empty exercises array', () => {
      PROGRAM_PRESETS.forEach((p) =>
        p.schedule
          .filter((s) => s.isRestDay)
          .forEach((slot) => expect(slot.exercises).toEqual([]))
      );
    });

    it('non-rest-day slots have at least one exercise', () => {
      PROGRAM_PRESETS.forEach((p) =>
        p.schedule
          .filter((s) => !s.isRestDay)
          .forEach((slot) => expect(slot.exercises.length).toBeGreaterThan(0))
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Distribution checks
  // ---------------------------------------------------------------------------
  describe('difficulty distribution', () => {
    it('includes at least one Beginner preset', () => {
      expect(PROGRAM_PRESETS.filter((p) => p.difficulty === 'Beginner').length).toBeGreaterThan(0);
    });

    it('includes at least one Intermediate preset', () => {
      expect(PROGRAM_PRESETS.filter((p) => p.difficulty === 'Intermediate').length).toBeGreaterThan(0);
    });

    it('includes at least one Advanced preset', () => {
      expect(PROGRAM_PRESETS.filter((p) => p.difficulty === 'Advanced').length).toBeGreaterThan(0);
    });

    it('includes at least one Strength-focused preset', () => {
      expect(PROGRAM_PRESETS.filter((p) => p.focus === 'Strength').length).toBeGreaterThan(0);
    });

    it('includes at least one Hypertrophy-focused preset', () => {
      expect(PROGRAM_PRESETS.filter((p) => p.focus === 'Hypertrophy').length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Specific well-known presets
  // ---------------------------------------------------------------------------
  describe('specific presets', () => {
    it('includes a PPL split', () => {
      const preset = PROGRAM_PRESETS.find((p) => p.name.includes('PPL'));
      expect(preset).toBeDefined();
      expect(preset!.daysPerWeek).toBe(6);
    });

    it('includes a Full Body 3-Day preset', () => {
      const preset = PROGRAM_PRESETS.find((p) => p.name === 'Full Body 3-Day');
      expect(preset).toBeDefined();
      expect(preset!.daysPerWeek).toBe(3);
      expect(preset!.difficulty).toBe('Beginner');
    });

    it('includes a Starting Strength preset', () => {
      const preset = PROGRAM_PRESETS.find((p) => p.name.includes('Starting Strength'));
      expect(preset).toBeDefined();
      expect(preset!.focus).toBe('Strength');
    });

    it('Starting Strength has Squat in every training day', () => {
      const preset = PROGRAM_PRESETS.find((p) => p.name.includes('Starting Strength'))!;
      const trainingDays = preset.schedule.filter((s) => !s.isRestDay);
      trainingDays.forEach((day) =>
        expect(day.exercises.some((e) => e.toLowerCase().includes('squat'))).toBe(true)
      );
    });

    it('Stronglifts 5x5 has 3 days per week', () => {
      const preset = PROGRAM_PRESETS.find((p) => p.name.includes('Stronglifts'))!;
      expect(preset.daysPerWeek).toBe(3);
    });

    it('PPL 4-week schedule has exactly 4 rest days per week (1 per week × 4 weeks)', () => {
      const ppl = PROGRAM_PRESETS.find((p) => p.name.includes('PPL'))!;
      const restDays = ppl.schedule.filter((s) => s.isRestDay);
      // 4 weeks × 1 rest day = 4 rest days
      expect(restDays).toHaveLength(4);
    });
  });
});
