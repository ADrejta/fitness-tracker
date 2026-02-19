export type WeightUnit = 'kg' | 'lbs';
export type MeasurementUnit = 'cm' | 'in';
export type Theme = 'light' | 'dark' | 'system';

export type BarbellType = 'olympic' | 'womens' | 'ez_bar' | 'trap_bar' | 'custom';

export interface BarbellPreset {
  type: BarbellType;
  name: string;
  weightKg: number;
  weightLbs: number;
}

export interface PlateConfig {
  weight: number;
  available: boolean;
}

export interface PlateCalculatorSettings {
  selectedBarbell: BarbellType;
  customBarbellWeightKg: number;
  customBarbellWeightLbs: number;
  availablePlatesKg: PlateConfig[];
  availablePlatesLbs: PlateConfig[];
}

export const BARBELL_PRESETS: BarbellPreset[] = [
  { type: 'olympic', name: 'Olympic Barbell', weightKg: 20, weightLbs: 45 },
  { type: 'womens', name: "Women's Olympic", weightKg: 15, weightLbs: 35 },
  { type: 'ez_bar', name: 'EZ Curl Bar', weightKg: 10, weightLbs: 22 },
  { type: 'trap_bar', name: 'Trap/Hex Bar', weightKg: 25, weightLbs: 55 },
  { type: 'custom', name: 'Custom', weightKg: 0, weightLbs: 0 },
];

export const DEFAULT_PLATES_KG: PlateConfig[] = [
  { weight: 25, available: true },
  { weight: 20, available: true },
  { weight: 15, available: true },
  { weight: 10, available: true },
  { weight: 5, available: true },
  { weight: 2.5, available: true },
  { weight: 1.25, available: true },
];

export const DEFAULT_PLATES_LBS: PlateConfig[] = [
  { weight: 45, available: true },
  { weight: 35, available: true },
  { weight: 25, available: true },
  { weight: 10, available: true },
  { weight: 5, available: true },
  { weight: 2.5, available: true },
];

export const DEFAULT_PLATE_CALCULATOR_SETTINGS: PlateCalculatorSettings = {
  selectedBarbell: 'olympic',
  customBarbellWeightKg: 20,
  customBarbellWeightLbs: 45,
  availablePlatesKg: DEFAULT_PLATES_KG,
  availablePlatesLbs: DEFAULT_PLATES_LBS,
};

export interface UserSettings {
  weightUnit: WeightUnit;
  measurementUnit: MeasurementUnit;
  theme: Theme;
  defaultRestTimer: number; // in seconds
  autoStartRestTimer: boolean;
  showWarmupSets: boolean;
  vibrateOnTimerEnd: boolean;
  soundOnTimerEnd: boolean;
  plateCalculator: PlateCalculatorSettings;
  compactMode: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  weightUnit: 'kg',
  measurementUnit: 'cm',
  theme: 'system',
  defaultRestTimer: 90,
  autoStartRestTimer: true,
  showWarmupSets: true,
  vibrateOnTimerEnd: true,
  soundOnTimerEnd: true,
  plateCalculator: DEFAULT_PLATE_CALCULATOR_SETTINGS,
  compactMode: false,
};
