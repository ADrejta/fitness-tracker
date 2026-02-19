import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, BadgeComponent, EmptyStateComponent, ButtonComponent, ProgressComponent } from '../../shared/components';
import { StatisticsService, WorkoutService, SettingsService, ExerciseService, AuthService, BodyStatsService } from '../../core/services';
import { ExerciseProgress, ExerciseWithHistory, ExerciseOverloadSuggestion, ExercisePlateauAlert } from '../../core/services/statistics.service';
import { PersonalRecord } from '../../core/models';
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns';

const HEATMAP_MUSCLE_KEYS = ['chest','back','shoulders','biceps','triceps','quads','hamstrings','glutes','abs','calves'] as const;
const HEATMAP_MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', abs: 'Abs', calves: 'Calves',
};
const STRENGTH_STANDARDS = [
  { name: 'Bench Press',    keywords: ['bench press'],                          excludes: [],                                  benchmarks: [0.5, 1.0, 1.5, 2.0]  as [number,number,number,number] },
  { name: 'Back Squat',     keywords: ['squat'],                                excludes: ['goblet','hack','front'],            benchmarks: [0.75,1.25,1.75,2.25] as [number,number,number,number] },
  { name: 'Deadlift',       keywords: ['deadlift'],                             excludes: ['romanian','rdl','stiff'],           benchmarks: [1.0, 1.5, 2.0, 2.75] as [number,number,number,number] },
  { name: 'Overhead Press', keywords: ['overhead press','shoulder press','ohp','military press'], excludes: [], benchmarks: [0.35,0.65,1.0,1.35] as [number,number,number,number] },
  { name: 'Barbell Row',    keywords: ['barbell row','bent-over row','bent over row','pendlay'],  excludes: [], benchmarks: [0.5, 0.9, 1.3, 1.75] as [number,number,number,number] },
] as const;

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PageContainerComponent,
    CardComponent,
    BadgeComponent,
    EmptyStateComponent,
    ButtonComponent,
    ProgressComponent
  ],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {
  statisticsService = inject(StatisticsService);
  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);
  exerciseService = inject(ExerciseService);
  bodyStatsService = inject(BodyStatsService);
  private authService = inject(AuthService);

  muscleGroupData = computed(() => this.statisticsService.muscleGroupDistribution());
  actionableSuggestions = computed(() =>
    this.statisticsService.overloadSuggestions().filter(s => s.suggestionType !== 'maintain')
  );
  plateauAlerts = computed(() => this.statisticsService.plateauAlerts());
  volumeTrend: { label: string; volume: number }[] = [];
  frequencyTrend: { week: string; count: number }[] = [];
  maxVolume = 0;
  maxFrequency = 0;

  // Exercise Progress Chart
  selectedExerciseId = signal<string>('');
  chartType = signal<'weight' | 'e1rm' | 'volume'>('weight');
  showAllPRs = false;
  private _selectedExerciseProgress = signal<ExerciseProgress | null>(null);

  // Heatmap
  HEATMAP_MUSCLE_KEYS = HEATMAP_MUSCLE_KEYS;
  HEATMAP_MUSCLE_LABELS = HEATMAP_MUSCLE_LABELS;
  heatmapPeriod = signal<'weekly' | 'monthly'>('weekly');

  heatmapData = computed(() => {
    const rows = this.statisticsService.muscleHeatmapRows();
    const monthly = this.heatmapPeriod() === 'monthly';

    // Collect unique sorted periods
    const periodSet = new Set<string>();
    rows.forEach(r => periodSet.add(r.periodStart));
    const periods = Array.from(periodSet).sort();

    // Format period labels
    const labels = periods.map(p => {
      const d = new Date(p + 'T00:00:00');
      return monthly ? format(d, 'MMM') : format(d, 'MMM d');
    });

    // Build [muscleIdx][periodIdx] count grid
    const periodIndex = new Map(periods.map((p, i) => [p, i]));
    const cells: number[][] = HEATMAP_MUSCLE_KEYS.map(() => new Array(periods.length).fill(0));

    for (const row of rows) {
      const mi = HEATMAP_MUSCLE_KEYS.indexOf(row.muscleGroup as any);
      const pi = periodIndex.get(row.periodStart) ?? -1;
      if (mi !== -1 && pi !== -1) cells[mi][pi] += row.setCount;
    }

    const maxCount = Math.max(...cells.flat(), 1);
    return { labels, cells, maxCount, empty: periods.length === 0 };
  });

  // Strength Standards
  strengthStandards = computed(() => {
    const prs = this.workoutService.personalRecords().filter(pr => pr.type === 'max-weight');
    const bwKg = this.bodyStatsService.latestMeasurement()?.weight ?? null;
    const unit = this.settingsService.weightUnit();
    const bwInUnit = bwKg !== null ? (unit === 'lbs' ? bwKg * 2.20462 : bwKg) : null;

    return STRENGTH_STANDARDS.map(std => {
      const matching = prs.filter(pr => {
        const n = pr.exerciseName.toLowerCase();
        return std.keywords.some(k => n.includes(k)) && !std.excludes.some(k => n.includes(k));
      });
      const bestLift = matching.length > 0 ? Math.max(...matching.map(pr => pr.value)) : null;
      const ratio = bestLift !== null && bwInUnit !== null ? bestLift / bwInUnit : null;

      const level = ratio === null ? null
        : ratio >= std.benchmarks[3] ? 'elite'
        : ratio >= std.benchmarks[2] ? 'advanced'
        : ratio >= std.benchmarks[1] ? 'intermediate'
        : ratio >= std.benchmarks[0] ? 'beginner'
        : 'none';

      const maxVal = std.benchmarks[3] * 1.1;
      const markerPct = ratio !== null ? Math.min(97, (ratio / maxVal) * 100) : null;
      const ticks = std.benchmarks.map((v, i) => ({
        pct: (v / maxVal) * 100,
        label: ['Beg', 'Int', 'Adv', 'Elite'][i],
        value: v,
      }));

      return { name: std.name, bestLift, bodyweight: bwInUnit, ratio, level, markerPct, ticks };
    });
  });

  selectedExerciseProgress = this._selectedExerciseProgress.asReadonly();

  // Use API for exercises with history if authenticated, otherwise compute locally
  exercisesWithHistory = computed(() => {
    if (this.authService.isAuthenticated()) {
      return this.statisticsService.exercisesWithHistory();
    }

    // Fallback to local computation for non-authenticated users
    const completedWorkouts = this.workoutService.completedWorkouts();
    const exerciseIds = new Set<string>();

    completedWorkouts.forEach(workout => {
      (workout.exercises || []).forEach(ex => {
        if (ex.sets.some(s => s.isCompleted && !s.isWarmup)) {
          exerciseIds.add(ex.exerciseTemplateId);
        }
      });
    });

    return Array.from(exerciseIds)
      .map(id => {
        const template = this.exerciseService.getExerciseById(id);
        if (!template) return null;
        return { id: template.id, name: template.name, workoutCount: 0 };
      })
      .filter((ex): ex is NonNullable<typeof ex> => ex !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    this.volumeTrend = this.statisticsService.getWeeklyVolumeTrend(8);
    this.maxVolume = Math.max(...this.volumeTrend.map(d => d.volume), 1);

    this.frequencyTrend = this.statisticsService.getWorkoutsPerWeek(8);
    this.maxFrequency = Math.max(...this.frequencyTrend.map(d => d.count), 1);

    // Auto-select first exercise if available (with a slight delay for API data)
    setTimeout(() => {
      const exercises = this.exercisesWithHistory();
      if (exercises.length > 0) {
        this.selectExercise(exercises[0].id);
      }
    }, 500);
  }

  async selectExercise(exerciseId: string): Promise<void> {
    this.selectedExerciseId.set(exerciseId);
    if (!exerciseId) {
      this._selectedExerciseProgress.set(null);
      return;
    }

    // Load exercise progress from API or local
    const progress = await this.statisticsService.getExerciseProgressFromApi(exerciseId);
    this._selectedExerciseProgress.set(progress);
  }

  getBarHeight(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.max(5, (value / max) * 100);
  }

  formatVolume(kg: number): string {
    if (kg < 1000) return `${Math.round(kg)} kg`;
    if (kg < 1000000) return `${(kg / 1000).toFixed(1)}t`;
    return `${(kg / 1000000).toFixed(1)}kt`;
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }

  getPrTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'max-weight': 'Max Weight',
      'max-reps': 'Max Reps',
      'max-volume': 'Max Volume',
      'estimated-1rm': 'Est. 1RM'
    };
    return labels[type] || type;
  }

  // Exercise Progress Chart Methods
  getChartPoints(): string {
    const progress = this.selectedExerciseProgress();
    if (!progress || progress.dataPoints.length === 0) return '';

    const dataPoints = progress.dataPoints;
    const values = this.getChartValues();
    const maxValue = Math.max(...values, 1);

    return dataPoints.map((point, index) => {
      const x = dataPoints.length === 1 ? 50 : (index / (dataPoints.length - 1)) * 100;
      const y = 100 - (values[index] / maxValue) * 90 - 5;
      return `${x},${y}`;
    }).join(' ');
  }

  getDataPoints(): { index: number; x: number; y: number; label: string; value: number }[] {
    const progress = this.selectedExerciseProgress();
    if (!progress || progress.dataPoints.length === 0) return [];

    const dataPoints = progress.dataPoints;
    const values = this.getChartValues();
    const maxValue = Math.max(...values, 1);

    return dataPoints.map((point, index) => ({
      index,
      x: dataPoints.length === 1 ? 50 : (index / (dataPoints.length - 1)) * 100,
      y: 100 - (values[index] / maxValue) * 90 - 5,
      label: format(parseISO(point.date), 'MMM d'),
      value: Math.round(values[index] * 10) / 10
    }));
  }

  getChartValues(): number[] {
    const progress = this.selectedExerciseProgress();
    if (!progress) return [];

    const type = this.chartType();
    return progress.dataPoints.map(point => {
      if (type === 'weight') return point.maxWeight;
      if (type === 'e1rm') return point.estimated1RM;
      return point.totalVolume;
    });
  }

  getYAxisMax(): string {
    const values = this.getChartValues();
    const max = Math.max(...values, 1);
    return Math.round(max).toString();
  }

  getYAxisMid(): string {
    const values = this.getChartValues();
    const max = Math.max(...values, 1);
    return Math.round(max / 2).toString();
  }

  getXAxisLabels(): string[] {
    const progress = this.selectedExerciseProgress();
    if (!progress || progress.dataPoints.length === 0) return [];

    const dataPoints = progress.dataPoints;
    if (dataPoints.length <= 5) {
      return dataPoints.map(p => format(parseISO(p.date), 'MMM d'));
    }

    // Show first, middle, and last
    const first = format(parseISO(dataPoints[0].date), 'MMM d');
    const last = format(parseISO(dataPoints[dataPoints.length - 1].date), 'MMM d');
    return [first, '', last];
  }

  getProgressChange(): number | null {
    const values = this.getChartValues();
    if (values.length < 2) return null;

    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0) return null;

    return Math.round(((last - first) / first) * 100);
  }

  getBestValue(): number {
    const values = this.getChartValues();
    if (values.length === 0) return 0;
    return Math.round(Math.max(...values) * 10) / 10;
  }

  // Heatmap helpers
  getHeatmapColorClass(count: number, maxCount: number): string {
    if (count === 0) return 'heat-0';
    const r = count / maxCount;
    if (r < 0.25) return 'heat-1';
    if (r < 0.5)  return 'heat-2';
    if (r < 0.75) return 'heat-3';
    return 'heat-4';
  }

  onHeatmapPeriodChange(period: 'weekly' | 'monthly'): void {
    this.heatmapPeriod.set(period);
    this.statisticsService.loadMuscleHeatmap(period === 'monthly' ? 6 : 8, period === 'monthly');
  }

  // Strength standards helpers
  getLevelVariant(level: string | null): 'default' | 'success' | 'warning' | 'primary' | 'danger' {
    if (level === 'elite') return 'primary';
    if (level === 'advanced') return 'success';
    if (level === 'intermediate') return 'warning';
    if (level === 'beginner') return 'default';
    return 'default';
  }

  // PR Methods
  getMaxWeightPRs() {
    return this.workoutService.personalRecords()
      .filter(pr => pr.type === 'max-weight')
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }

  getEstimated1RMPRs() {
    return this.workoutService.personalRecords()
      .filter(pr => pr.type === 'estimated-1rm')
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }

  getDisplayedPRs() {
    const prs = this.workoutService.personalRecords();
    // Sort by date (most recent first)
    const sorted = [...prs].sort((a, b) =>
      new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
    );
    return this.showAllPRs ? sorted : sorted.slice(0, 10);
  }

  formatPrValue(pr: PersonalRecord): string {
    if (pr.type === 'estimated-1rm') {
      return Math.round(pr.value).toString();
    }
    return pr.value.toString();
  }

  formatPrDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM d, yyyy');
  }

  getSuggestionLabel(suggestion: ExerciseOverloadSuggestion): string {
    if (suggestion.suggestionType === 'increase_weight' && suggestion.suggestedWeight) {
      return `${suggestion.suggestedWeight} ${this.settingsService.weightUnit()}`;
    }
    if (suggestion.suggestionType === 'increase_reps' && suggestion.suggestedReps) {
      return `${suggestion.suggestedReps} reps`;
    }
    return '';
  }

  getCurrentLabel(suggestion: ExerciseOverloadSuggestion): string {
    return `${suggestion.currentWeight} ${this.settingsService.weightUnit()} x ${suggestion.currentReps}`;
  }
}
