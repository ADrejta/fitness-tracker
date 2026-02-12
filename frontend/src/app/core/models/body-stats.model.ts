export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;          // in kg
  bodyFatPercentage?: number;
  chest?: number;           // in cm
  waist?: number;
  hips?: number;
  leftBicep?: number;
  rightBicep?: number;
  leftThigh?: number;
  rightThigh?: number;
  neck?: number;
  shoulders?: number;
  leftCalf?: number;
  rightCalf?: number;
  leftForearm?: number;
  rightForearm?: number;
  notes?: string;
}

export interface BodyStatsGoal {
  id: string;
  type: 'weight' | 'bodyFat' | 'measurement';
  measurementType?: keyof Omit<BodyMeasurement, 'id' | 'date' | 'notes'>;
  targetValue: number;
  startValue: number;
  startDate: string;
  targetDate?: string;
  isCompleted: boolean;
  completedAt?: string;
}
