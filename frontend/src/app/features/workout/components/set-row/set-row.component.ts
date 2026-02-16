import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
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
  selector: 'app-set-row',
  standalone: true,
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

  settingsService = inject(SettingsService);
  private router = inject(Router);

  showPlateCalculator = signal(false);
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
    this.showPlateCalculator.update(v => !v);
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
