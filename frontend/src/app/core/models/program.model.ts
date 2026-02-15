export interface ProgramWorkout {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  templateId?: string;
  isRestDay: boolean;
  notes?: string;
  completedWorkoutId?: string;
  completedAt?: string;
}

export interface ProgramWeek {
  weekNumber: number;
  workouts: ProgramWorkout[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  description?: string;
  durationWeeks: number;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  weeks: ProgramWeek[];
}

export interface ProgramSummary {
  id: string;
  name: string;
  description?: string;
  durationWeeks: number;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  totalWorkouts: number;
  completedWorkouts: number;
}
