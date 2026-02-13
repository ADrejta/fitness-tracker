import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, BadgeComponent, EmptyStateComponent, ButtonComponent, ProgressComponent } from '../../shared/components';
import { StatisticsService, WorkoutService, SettingsService, ExerciseService, AuthService } from '../../core/services';
import { ExerciseProgress, ExerciseWithHistory } from '../../core/services/statistics.service';
import { PersonalRecord } from '../../core/models';
import { format, parseISO } from 'date-fns';

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
  private authService = inject(AuthService);

  muscleGroupData = computed(() => this.statisticsService.muscleGroupDistribution());
  volumeTrend: { label: string; volume: number }[] = [];
  frequencyTrend: { week: string; count: number }[] = [];
  maxVolume = 0;
  maxFrequency = 0;

  // Exercise Progress Chart
  selectedExerciseId = signal<string>('');
  chartType = signal<'weight' | 'e1rm' | 'volume'>('weight');
  showAllPRs = false;
  private _selectedExerciseProgress = signal<ExerciseProgress | null>(null);

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
}
