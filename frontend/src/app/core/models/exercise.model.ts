export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'traps'
  | 'lats'
  | 'lower-back';

export type ExerciseCategory = 'strength' | 'cardio' | 'bodyweight';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'kettlebell'
  | 'bodyweight'
  | 'resistance-band'
  | 'ez-bar'
  | 'smith-machine'
  | 'pull-up-bar'
  | 'dip-station'
  | 'bench'
  | 'cardio-machine';

export interface ExerciseTemplate {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  category: ExerciseCategory;
  equipment: Equipment[];
  isCustom?: boolean;
  description?: string;
  instructions?: string[];
}
