import { Component, Input, Output, EventEmitter, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkoutSet } from '../../../../core/models';
import { SettingsService } from '../../../../core/services';
import { PlateCalculatorComponent } from '../../../../shared/components';

export interface ProgressionSuggestion {
  suggestedWeight: number;
  suggestedReps?: number;
  type: 'increase_weight' | 'increase_reps' | 'maintain';
  reason: string;
}

@Component({
    standalone: true,
    selector: 'app-set-row',
    imports: [CommonModule, FormsModule, PlateCalculatorComponent],
    templateUrl: './set-row.component.html',
    styleUrls: ['./set-row.component.scss']
})
export class SetRowComponent {
  @Input() set!: WorkoutSet;
  @Input() previousSet?: WorkoutSet;
  @Input() progressionSuggestion?: ProgressionSuggestion;

  @Output() setUpdated = new EventEmitter<Partial<WorkoutSet>>();
  @Output() setCompleted = new EventEmitter<{ reps: number; weight: number }>();
  @Output() setUncompleted = new EventEmitter<void>();
  @Output() setDeleted = new EventEmitter<void>();

  settingsService = inject(SettingsService);
  private router = inject(Router);

  showPlateCalculator = signal(false);
  showE1rmOverlay = signal(false);
  weightValue: number | null = null;
  repsValue: number | null = null;
  rpeValue: number | null = null;

  get estimated1RM(): number | null {
    const weight = this.weightValue ?? this.set.targetWeight;
    const reps = this.repsValue ?? this.set.targetReps;

    if (!weight || weight <= 0 || !reps || reps <= 1) {
      return null;
    }

    // Brzycki formula: weight / (1.0278 - 0.0278 * reps)
    const e1rm = weight / (1.0278 - 0.0278 * reps);
    return Math.round(e1rm);
  }

  get currentWeight(): number {
    return this.weightValue ?? this.set.targetWeight ?? 0;
  }

  togglePlateCalculator(event: Event): void {
    event.stopPropagation();
    this.showE1rmOverlay.set(false);
    this.showPlateCalculator.update(v => !v);
  }

  toggleE1rmOverlay(event: Event): void {
    event.stopPropagation();
    this.showPlateCalculator.set(false);
    this.showE1rmOverlay.update(v => !v);
  }

  get e1rmPercentages(): { pct: number; weight: number }[] {
    const e1rm = this.estimated1RM;
    if (e1rm === null) return [];
    return [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50].map(pct => ({
      pct,
      weight: Math.round(e1rm * pct / 100),
    }));
  }

  @HostListener('document:click')
  closeOverlays(): void {
    this.showE1rmOverlay.set(false);
  }

  navigateToSettings(): void {
    this.showPlateCalculator.set(false);
    this.router.navigate(['/settings']);
  }

  ngOnInit(): void {
    this.weightValue = this.set.actualWeight ?? this.set.targetWeight ?? null;
    this.repsValue = this.set.actualReps ?? this.set.targetReps ?? null;
    this.rpeValue = this.set.rpe ?? null;
  }

  onWeightChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.weightValue = value ? parseFloat(value) : null;
    this.setUpdated.emit({ targetWeight: this.weightValue ?? undefined });
  }

  applySuggestion(): void {
    if (this.progressionSuggestion) {
      if (this.progressionSuggestion.type === 'increase_weight') {
        this.weightValue = this.progressionSuggestion.suggestedWeight;
        this.setUpdated.emit({ targetWeight: this.weightValue });
      } else if (this.progressionSuggestion.type === 'increase_reps' && this.progressionSuggestion.suggestedReps) {
        this.repsValue = this.progressionSuggestion.suggestedReps;
        this.setUpdated.emit({ targetReps: this.repsValue });
      }
    }
  }

  onRepsChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.repsValue = value ? parseInt(value, 10) : null;
    this.setUpdated.emit({ targetReps: this.repsValue ?? undefined });
  }

  onRpeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.rpeValue = value ? parseInt(value, 10) : null;
    this.setUpdated.emit({ rpe: this.rpeValue ?? undefined });
  }

  toggleWarmup(): void {
    this.setUpdated.emit({ isWarmup: !this.set.isWarmup });
  }

  toggleComplete(): void {
    if (this.set.isCompleted) {
      this.setUncompleted.emit();
    } else {
      const weight = this.weightValue ?? this.set.targetWeight ?? 0;
      const reps = this.repsValue ?? this.set.targetReps ?? 0;
      this.setCompleted.emit({ weight, reps });
    }
  }
}
