export interface TemplateSet {
  setNumber: number;
  targetReps: number;
  targetWeight?: number;
  isWarmup: boolean;
}

export interface TemplateExercise {
  id: string;
  exerciseTemplateId: string;
  exerciseName: string;
  sets: TemplateSet[];
  notes?: string;
  restSeconds?: number;
  supersetId?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  estimatedDuration?: number; // in minutes
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
  tags?: string[];
}
