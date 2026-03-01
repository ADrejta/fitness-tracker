export type WorkoutStatus = 'in-progress' | 'completed' | 'cancelled';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  targetReps?: number;
  actualReps?: number;
  targetWeight?: number;
  actualWeight?: number;
  isWarmup: boolean;
  isCompleted: boolean;
  completedAt?: string;
  rpe?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  calories?: number;
  targetDistanceMeters?: number;
  targetDurationSeconds?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseTemplateId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  notes?: string;
  supersetId?: string;
}

export interface Workout {
  id: string;
  name: string;
  startedAt: string;
  completedAt?: string;
  exercises: WorkoutExercise[];
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  duration?: number; // in seconds
  status: WorkoutStatus;
  templateId?: string;
  notes?: string;
  tags?: string[];
  exerciseCount?: number; // From list API (summary response)
}

export interface PersonalRecord {
  id: string;
  exerciseTemplateId: string;
  exerciseName: string;
  type: 'max-weight' | 'max-reps' | 'max-volume' | 'estimated-1rm';
  value: number;
  reps?: number;
  achievedAt: string;
  workoutId: string;
}
