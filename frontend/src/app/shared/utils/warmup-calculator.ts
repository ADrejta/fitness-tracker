import { getBarWeight, getAvailablePlates } from './plate-calculator';

export interface WarmupSet {
  percentage: number;
  weight: number;
  reps: number;
  label: string;
}

export interface WarmupConfig {
  barbellWeight: number;
  availablePlates: number[];
}

/**
 * Rounds weight down to nearest achievable plate combination.
 * Weight must be bar weight + (2 * sum of plate weights).
 */
function roundToAchievableWeight(
  targetWeight: number,
  barWeight: number,
  availablePlates: number[]
): number {
  if (targetWeight <= barWeight) {
    return barWeight;
  }

  const weightPerSide = (targetWeight - barWeight) / 2;
  let remaining = weightPerSide;
  let achievedPerSide = 0;

  // Use greedy algorithm: largest plates first
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);
  for (const plateWeight of sortedPlates) {
    while (remaining >= plateWeight) {
      achievedPerSide += plateWeight;
      remaining -= plateWeight;
    }
  }

  return barWeight + achievedPerSide * 2;
}

/**
 * Calculates warm-up sets based on a working weight.
 *
 * Standard warm-up progression:
 * - Bar only (0%): 10 reps - movement pattern warmup
 * - ~50%: 8 reps - light technique work
 * - ~70%: 5 reps - moderate load preparation
 * - ~85%: 3 reps - heavy prep set
 *
 * Weights are rounded down to achievable plate combinations.
 * Duplicate weights are removed from the progression.
 */
export function calculateWarmupSets(
  workingWeight: number,
  unit: 'kg' | 'lbs',
  config?: Partial<WarmupConfig>
): WarmupSet[] {
  const barWeight = config?.barbellWeight ?? getBarWeight(unit);
  const availablePlates = config?.availablePlates ?? getAvailablePlates(unit);

  // If working weight is at or below bar weight, no warm-ups needed
  if (workingWeight <= barWeight) {
    return [];
  }

  const warmupScheme = [
    { percentage: 0, reps: 10, label: 'Bar' },
    { percentage: 50, reps: 8, label: '50%' },
    { percentage: 70, reps: 5, label: '70%' },
    { percentage: 85, reps: 3, label: '85%' },
  ];

  const warmupSets: WarmupSet[] = [];
  const seenWeights = new Set<number>();

  for (const scheme of warmupScheme) {
    let weight: number;

    if (scheme.percentage === 0) {
      weight = barWeight;
    } else {
      const targetWeight = workingWeight * (scheme.percentage / 100);
      weight = roundToAchievableWeight(targetWeight, barWeight, availablePlates);
    }

    // Skip if this weight equals or exceeds the working weight
    if (weight >= workingWeight) {
      continue;
    }

    // Skip duplicate weights
    if (seenWeights.has(weight)) {
      continue;
    }

    seenWeights.add(weight);

    warmupSets.push({
      percentage: scheme.percentage,
      weight,
      reps: scheme.reps,
      label: weight === barWeight ? 'Bar' : scheme.label,
    });
  }

  return warmupSets;
}
