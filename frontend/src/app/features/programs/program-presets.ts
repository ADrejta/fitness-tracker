export interface PresetDaySlot {
  weekNumber: number;
  dayNumber: number;
  name: string;
  isRestDay: boolean;
  exercises: string[];
}

export interface ProgramPreset {
  name: string;
  description: string;
  durationWeeks: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  focus: 'Strength' | 'Hypertrophy';
  daysPerWeek: number;
  schedule: PresetDaySlot[];
}

function buildWeeks(
  durationWeeks: number,
  weeklyPattern: { name: string; isRestDay: boolean; exercises?: string[] }[],
): PresetDaySlot[] {
  const slots: PresetDaySlot[] = [];
  for (let w = 1; w <= durationWeeks; w++) {
    weeklyPattern.forEach((day, idx) => {
      slots.push({
        weekNumber: w,
        dayNumber: idx + 1,
        name: day.name,
        isRestDay: day.isRestDay,
        exercises: day.exercises ?? [],
      });
    });
  }
  return slots;
}

export const PROGRAM_PRESETS: ProgramPreset[] = [
  {
    name: 'PPL 6-Day Split',
    description:
      'Push/Pull/Legs twice per week with Sunday rest. High volume for intermediate to advanced lifters looking to maximize muscle growth.',
    durationWeeks: 4,
    difficulty: 'Advanced',
    focus: 'Hypertrophy',
    daysPerWeek: 6,
    schedule: buildWeeks(4, [
      { name: 'Push A', isRestDay: false, exercises: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Lateral Raises', 'Tricep Pushdowns', 'Overhead Tricep Extension'] },
      { name: 'Pull A', isRestDay: false, exercises: ['Barbell Rows', 'Pull-Ups', 'Face Pulls', 'Barbell Curls', 'Hammer Curls'] },
      { name: 'Legs A', isRestDay: false, exercises: ['Squats', 'Romanian Deadlifts', 'Leg Press', 'Leg Curls', 'Calf Raises'] },
      { name: 'Push B', isRestDay: false, exercises: ['Overhead Press', 'Dumbbell Bench Press', 'Cable Flyes', 'Lateral Raises', 'Skull Crushers'] },
      { name: 'Pull B', isRestDay: false, exercises: ['Deadlifts', 'Cable Rows', 'Lat Pulldowns', 'Rear Delt Flyes', 'Incline Curls'] },
      { name: 'Legs B', isRestDay: false, exercises: ['Front Squats', 'Hip Thrusts', 'Bulgarian Split Squats', 'Leg Extensions', 'Seated Calf Raises'] },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: 'Upper/Lower 4-Day',
    description:
      'Alternating upper and lower body sessions with three rest days per week. Great balance of volume and recovery for steady progress.',
    durationWeeks: 4,
    difficulty: 'Intermediate',
    focus: 'Hypertrophy',
    daysPerWeek: 4,
    schedule: buildWeeks(4, [
      { name: 'Upper Body A', isRestDay: false, exercises: ['Bench Press', 'Barbell Rows', 'Overhead Press', 'Pull-Ups', 'Bicep Curls', 'Tricep Pushdowns'] },
      { name: 'Lower Body A', isRestDay: false, exercises: ['Squats', 'Romanian Deadlifts', 'Leg Press', 'Leg Curls', 'Calf Raises'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Upper Body B', isRestDay: false, exercises: ['Dumbbell Bench Press', 'Cable Rows', 'Lateral Raises', 'Face Pulls', 'Hammer Curls', 'Overhead Tricep Extension'] },
      { name: 'Lower Body B', isRestDay: false, exercises: ['Deadlifts', 'Front Squats', 'Hip Thrusts', 'Leg Extensions', 'Seated Calf Raises'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: 'Full Body 3-Day',
    description:
      'Three full-body sessions per week on non-consecutive days. Ideal for beginners or those with limited time who still want full coverage.',
    durationWeeks: 4,
    difficulty: 'Beginner',
    focus: 'Hypertrophy',
    daysPerWeek: 3,
    schedule: buildWeeks(4, [
      { name: 'Full Body A', isRestDay: false, exercises: ['Squats', 'Bench Press', 'Barbell Rows', 'Overhead Press', 'Bicep Curls'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Full Body B', isRestDay: false, exercises: ['Deadlifts', 'Incline Dumbbell Press', 'Pull-Ups', 'Lateral Raises', 'Tricep Pushdowns'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Full Body C', isRestDay: false, exercises: ['Front Squats', 'Dumbbell Bench Press', 'Cable Rows', 'Face Pulls', 'Hammer Curls'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: '5/3/1 Four Day',
    description:
      'Wendler-style four-day split focusing on one main compound lift per session: Squat, Bench, Deadlift, and Overhead Press.',
    durationWeeks: 4,
    difficulty: 'Intermediate',
    focus: 'Strength',
    daysPerWeek: 4,
    schedule: buildWeeks(4, [
      { name: 'Squat Day', isRestDay: false, exercises: ['Squats (5/3/1)', 'Front Squats', 'Leg Press', 'Leg Curls', 'Ab Wheel'] },
      { name: 'Bench Day', isRestDay: false, exercises: ['Bench Press (5/3/1)', 'Dumbbell Bench Press', 'Dumbbell Rows', 'Tricep Pushdowns', 'Face Pulls'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Deadlift Day', isRestDay: false, exercises: ['Deadlifts (5/3/1)', 'Romanian Deadlifts', 'Pull-Ups', 'Barbell Rows', 'Hanging Leg Raises'] },
      { name: 'OHP Day', isRestDay: false, exercises: ['Overhead Press (5/3/1)', 'Dumbbell OHP', 'Lateral Raises', 'Barbell Curls', 'Rear Delt Flyes'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: 'Bro Split 5-Day',
    description:
      'Classic bodybuilding split with one muscle group per day. Five training days with two rest days for recovery.',
    durationWeeks: 4,
    difficulty: 'Intermediate',
    focus: 'Hypertrophy',
    daysPerWeek: 5,
    schedule: buildWeeks(4, [
      { name: 'Chest', isRestDay: false, exercises: ['Bench Press', 'Incline Dumbbell Press', 'Cable Flyes', 'Dips', 'Pec Deck'] },
      { name: 'Back', isRestDay: false, exercises: ['Deadlifts', 'Barbell Rows', 'Lat Pulldowns', 'Seated Cable Rows', 'Face Pulls'] },
      { name: 'Shoulders', isRestDay: false, exercises: ['Overhead Press', 'Lateral Raises', 'Rear Delt Flyes', 'Arnold Press', 'Shrugs'] },
      { name: 'Arms', isRestDay: false, exercises: ['Barbell Curls', 'Skull Crushers', 'Hammer Curls', 'Tricep Pushdowns', 'Preacher Curls'] },
      { name: 'Legs', isRestDay: false, exercises: ['Squats', 'Leg Press', 'Romanian Deadlifts', 'Leg Extensions', 'Calf Raises'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: 'Starting Strength 3-Day',
    description:
      'Proven beginner program alternating two workouts (A/B) three days per week. Focuses on linear progression with compound barbell lifts.',
    durationWeeks: 4,
    difficulty: 'Beginner',
    focus: 'Strength',
    daysPerWeek: 3,
    schedule: buildWeeks(4, [
      { name: 'Workout A', isRestDay: false, exercises: ['Squats', 'Bench Press', 'Deadlifts'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Workout B', isRestDay: false, exercises: ['Squats', 'Overhead Press', 'Barbell Rows'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Workout A', isRestDay: false, exercises: ['Squats', 'Bench Press', 'Deadlifts'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: 'PHUL 4-Day',
    description:
      'Power Hypertrophy Upper Lower — combines heavy compound days with high-volume hypertrophy days for both strength and size.',
    durationWeeks: 4,
    difficulty: 'Intermediate',
    focus: 'Hypertrophy',
    daysPerWeek: 4,
    schedule: buildWeeks(4, [
      { name: 'Power Upper', isRestDay: false, exercises: ['Bench Press', 'Barbell Rows', 'Overhead Press', 'Barbell Curls', 'Skull Crushers'] },
      { name: 'Power Lower', isRestDay: false, exercises: ['Squats', 'Deadlifts', 'Leg Press', 'Leg Curls', 'Calf Raises'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Hypertrophy Upper', isRestDay: false, exercises: ['Incline Dumbbell Press', 'Cable Rows', 'Lateral Raises', 'Hammer Curls', 'Tricep Pushdowns', 'Face Pulls'] },
      { name: 'Hypertrophy Lower', isRestDay: false, exercises: ['Front Squats', 'Romanian Deadlifts', 'Leg Extensions', 'Leg Curls', 'Seated Calf Raises'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: 'nSuns 5-Day',
    description:
      'High-volume 5-day strength program based on 5/3/1 principles. Each day pairs a primary T1 lift with a secondary T2 lift plus accessories.',
    durationWeeks: 4,
    difficulty: 'Advanced',
    focus: 'Strength',
    daysPerWeek: 5,
    schedule: buildWeeks(4, [
      { name: 'Bench + OHP', isRestDay: false, exercises: ['Bench Press (T1)', 'Overhead Press (T2)', 'Pull-Ups', 'Face Pulls', 'Tricep Pushdowns'] },
      { name: 'Squat + Sumo DL', isRestDay: false, exercises: ['Squats (T1)', 'Sumo Deadlifts (T2)', 'Leg Press', 'Leg Curls', 'Ab Wheel'] },
      { name: 'OHP + Incline', isRestDay: false, exercises: ['Overhead Press (T1)', 'Incline Bench (T2)', 'Barbell Rows', 'Lateral Raises', 'Bicep Curls'] },
      { name: 'Deadlift + Front Squat', isRestDay: false, exercises: ['Deadlifts (T1)', 'Front Squats (T2)', 'Pull-Ups', 'Hanging Leg Raises', 'Calf Raises'] },
      { name: 'Bench + CG Bench', isRestDay: false, exercises: ['Bench Press (T1)', 'Close-Grip Bench (T2)', 'Cable Rows', 'Face Pulls', 'Hammer Curls'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: 'Arnold Split 6-Day',
    description:
      'Classic Arnold Schwarzenegger-inspired split pairing chest with back, shoulders with arms, and a dedicated leg day — run twice per week.',
    durationWeeks: 4,
    difficulty: 'Advanced',
    focus: 'Hypertrophy',
    daysPerWeek: 6,
    schedule: buildWeeks(4, [
      { name: 'Chest + Back', isRestDay: false, exercises: ['Bench Press', 'Pull-Ups', 'Incline Dumbbell Press', 'Barbell Rows', 'Cable Flyes', 'Lat Pulldowns'] },
      { name: 'Shoulders + Arms', isRestDay: false, exercises: ['Overhead Press', 'Barbell Curls', 'Lateral Raises', 'Skull Crushers', 'Rear Delt Flyes', 'Hammer Curls'] },
      { name: 'Legs', isRestDay: false, exercises: ['Squats', 'Romanian Deadlifts', 'Leg Press', 'Leg Curls', 'Calf Raises'] },
      { name: 'Chest + Back', isRestDay: false, exercises: ['Dumbbell Bench Press', 'Cable Rows', 'Dips', 'T-Bar Rows', 'Pec Deck', 'Straight-Arm Pulldowns'] },
      { name: 'Shoulders + Arms', isRestDay: false, exercises: ['Arnold Press', 'Preacher Curls', 'Lateral Raises', 'Tricep Pushdowns', 'Face Pulls', 'Concentration Curls'] },
      { name: 'Legs', isRestDay: false, exercises: ['Front Squats', 'Hip Thrusts', 'Bulgarian Split Squats', 'Leg Extensions', 'Seated Calf Raises'] },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
  {
    name: 'Stronglifts 5x5',
    description:
      'Simple and effective beginner strength program. Alternating A/B workouts three days per week with 5 sets of 5 reps on compound lifts.',
    durationWeeks: 4,
    difficulty: 'Beginner',
    focus: 'Strength',
    daysPerWeek: 3,
    schedule: buildWeeks(4, [
      { name: 'Workout A', isRestDay: false, exercises: ['Squats 5x5', 'Bench Press 5x5', 'Barbell Rows 5x5'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Workout B', isRestDay: false, exercises: ['Squats 5x5', 'Overhead Press 5x5', 'Deadlifts 1x5'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Workout A', isRestDay: false, exercises: ['Squats 5x5', 'Bench Press 5x5', 'Barbell Rows 5x5'] },
      { name: 'Rest Day', isRestDay: true },
      { name: 'Rest Day', isRestDay: true },
    ]),
  },
];
