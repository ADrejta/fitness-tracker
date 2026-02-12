export interface PlateCount {
  weight: number;
  count: number;
}

export interface PlateCalculation {
  perSide: PlateCount[];
  remainder: number;
  isAchievable: boolean;
}

export interface PlateCalculatorConfig {
  barbellWeight: number;
  availablePlates: number[];
}

// Standard plate sizes (used as fallback)
const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LBS_PLATES = [45, 35, 25, 10, 5, 2.5];

// Bar weights (used as fallback)
const KG_BAR_WEIGHT = 20;
const LBS_BAR_WEIGHT = 45;

/**
 * Calculates the plates needed per side to achieve a target weight.
 * Uses a greedy algorithm to minimize the number of plates.
 */
export function calculatePlates(
  targetWeight: number,
  unit: 'kg' | 'lbs',
  config?: PlateCalculatorConfig
): PlateCalculation {
  const barWeight = config?.barbellWeight ?? (unit === 'kg' ? KG_BAR_WEIGHT : LBS_BAR_WEIGHT);
  const plates = config?.availablePlates ?? (unit === 'kg' ? KG_PLATES : LBS_PLATES);

  // Handle cases where target is less than or equal to bar weight
  if (targetWeight <= barWeight) {
    return {
      perSide: [],
      remainder: Math.max(0, barWeight - targetWeight),
      isAchievable: targetWeight === barWeight,
    };
  }

  // Calculate weight to load per side
  const weightToLoad = (targetWeight - barWeight) / 2;
  let remaining = weightToLoad;
  const perSide: PlateCount[] = [];

  // Greedy algorithm: use largest plates first (plates should be sorted descending)
  const sortedPlates = [...plates].sort((a, b) => b - a);
  for (const plateWeight of sortedPlates) {
    if (remaining >= plateWeight) {
      const count = Math.floor(remaining / plateWeight);
      perSide.push({ weight: plateWeight, count });
      remaining = Math.round((remaining - count * plateWeight) * 100) / 100; // Round to avoid floating point issues
    }
  }

  return {
    perSide,
    remainder: remaining * 2, // Convert back to total remainder
    isAchievable: remaining === 0,
  };
}

/**
 * Gets the default bar weight for a given unit.
 */
export function getBarWeight(unit: 'kg' | 'lbs'): number {
  return unit === 'kg' ? KG_BAR_WEIGHT : LBS_BAR_WEIGHT;
}

/**
 * Gets the default available plate sizes for a given unit.
 */
export function getAvailablePlates(unit: 'kg' | 'lbs'): number[] {
  return unit === 'kg' ? [...KG_PLATES] : [...LBS_PLATES];
}
