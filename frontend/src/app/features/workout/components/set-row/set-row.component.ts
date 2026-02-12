import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkoutSet } from '../../../../core/models';
import { SettingsService } from '../../../../core/services';
import { PlateCalculatorComponent } from '../../../../shared/components';

export interface ProgressionSuggestion {
  suggestedWeight: number;
  reason: string;
}

@Component({
  selector: 'app-set-row',
  standalone: true,
  imports: [CommonModule, FormsModule, PlateCalculatorComponent],
  template: `
    <div
      class="set-row"
      [class.set-row--warmup]="set.isWarmup"
      [class.set-row--completed]="set.isCompleted"
    >
      <div class="set-row__number">
        @if (set.isWarmup) {
          <span class="set-row__warmup-badge">W</span>
        } @else {
          {{ set.setNumber }}
        }
      </div>

      <div class="set-row__previous">
        @if (previousSet) {
          <span class="set-row__previous-value">
            {{ previousSet.actualWeight || '-' }} × {{ previousSet.actualReps || '-' }}
          </span>
        } @else {
          <span class="set-row__previous-value set-row__previous-value--empty">—</span>
        }
      </div>

      <div class="set-row__inputs">
        <div class="set-row__input-group">
          @if (progressionSuggestion && !set.isCompleted && set.setNumber === 1) {
            <button
              class="set-row__suggestion"
              (click)="applySuggestion()"
              [title]="progressionSuggestion.reason"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              {{ progressionSuggestion.suggestedWeight }}
            </button>
          }
          <input
            type="number"
            class="set-row__input"
            [class.set-row__input--filled]="weightValue !== null"
            [class.set-row__input--has-suggestion]="progressionSuggestion && !set.isCompleted && set.setNumber === 1"
            [placeholder]="set.targetWeight?.toString() || '0'"
            [value]="weightValue"
            (input)="onWeightChange($event)"
            [disabled]="set.isCompleted"
            inputmode="decimal"
          />
          <span class="set-row__unit">{{ settingsService.weightUnit() }}</span>
          <div class="set-row__calc-wrapper">
            <button
              type="button"
              class="set-row__calc-btn"
              (click)="togglePlateCalculator($event)"
              [class.set-row__calc-btn--active]="showPlateCalculator()"
              title="Plate Calculator"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="8" y1="10" x2="16" y2="10"></line>
                <line x1="8" y1="14" x2="12" y2="14"></line>
                <line x1="8" y1="18" x2="12" y2="18"></line>
              </svg>
            </button>
            @if (showPlateCalculator()) {
              <div class="set-row__calc-popover" (click)="$event.stopPropagation()">
                <app-plate-calculator
                  [targetWeight]="currentWeight"
                  [weightUnit]="settingsService.weightUnit()"
                  (openSettings)="navigateToSettings()"
                ></app-plate-calculator>
              </div>
            }
          </div>
        </div>

        <span class="set-row__separator">×</span>

        <div class="set-row__input-group">
          <input
            type="number"
            class="set-row__input"
            [class.set-row__input--filled]="repsValue !== null"
            [placeholder]="set.targetReps?.toString() || '0'"
            [value]="repsValue"
            (input)="onRepsChange($event)"
            [disabled]="set.isCompleted"
            inputmode="numeric"
          />
          <span class="set-row__unit">reps</span>
        </div>
      </div>

      @if (estimated1RM !== null && !set.isCompleted) {
        <div class="set-row__e1rm">
          <span class="set-row__e1rm-value">{{ estimated1RM }}</span>
          <span class="set-row__e1rm-label">e1RM</span>
        </div>
      }

      <div class="set-row__actions">
        @if (set.isCompleted) {
          <button class="set-row__check set-row__check--completed" (click)="toggleComplete()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        } @else {
          <button class="set-row__check" (click)="toggleComplete()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .set-row {
      display: grid;
      grid-template-columns: 2.5rem 1fr auto 3rem;
      gap: var(--spacing-sm);
      align-items: center;
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--color-border-light);

      @media (min-width: 480px) {
        grid-template-columns: 2.5rem 5rem 1fr auto 3rem;
      }

      &:last-child {
        border-bottom: none;
      }

      &--warmup {
        opacity: 0.7;
      }

      &--completed {
        grid-template-columns: 2.5rem 1fr 3rem;

        @media (min-width: 480px) {
          grid-template-columns: 2.5rem 5rem 1fr 3rem;
        }

        .set-row__input {
          color: var(--color-success-600);
        }
      }
    }

    .set-row__number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-secondary);
      background: var(--color-background-secondary);
      border-radius: var(--radius-md);
    }

    .set-row__warmup-badge {
      font-size: var(--font-size-xs);
      color: var(--color-warning-600);
    }

    .set-row__previous {
      display: none;

      @media (min-width: 480px) {
        display: block;
      }

      &-value {
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
        font-variant-numeric: tabular-nums;

        &--empty {
          opacity: 0.5;
        }
      }
    }

    .set-row__inputs {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .set-row__input-group {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .set-row__input {
      width: 4rem;
      padding: var(--spacing-sm);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
      text-align: center;
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &::placeholder {
        color: var(--color-text-tertiary);
        font-weight: var(--font-weight-normal);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 2px var(--color-primary-100);
      }

      &--filled {
        background: var(--color-primary-50);
        border-color: var(--color-primary-200);
      }

      &:disabled {
        background: var(--color-background-secondary);
        cursor: not-allowed;
      }

      &--has-suggestion {
        border-color: var(--color-success-300);
      }

      // Remove spinners
      -moz-appearance: textfield;
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }

    .set-row__suggestion {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px 6px;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-success-700);
      background: var(--color-success-100);
      border: 1px solid var(--color-success-200);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;

      &:hover {
        background: var(--color-success-200);
        border-color: var(--color-success-300);
      }

      svg {
        flex-shrink: 0;
      }
    }

    .set-row__unit {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      min-width: 2rem;
    }

    .set-row__separator {
      color: var(--color-text-tertiary);
    }

    .set-row__calc-wrapper {
      position: relative;
    }

    .set-row__calc-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      background: none;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--color-text-tertiary);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-background-secondary);
        color: var(--color-text-secondary);
        border-color: var(--color-border);
      }

      &--active {
        background: var(--color-primary-50);
        color: var(--color-primary-600);
        border-color: var(--color-primary-200);
      }
    }

    .set-row__calc-popover {
      position: absolute;
      top: calc(100% + var(--spacing-xs));
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
    }

    .set-row__e1rm {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 var(--spacing-xs);
      min-width: 3rem;

      &-value {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-primary-600);
        font-variant-numeric: tabular-nums;
      }

      &-label {
        font-size: 0.625rem;
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }
    }

    .set-row__actions {
      display: flex;
      justify-content: flex-end;
    }

    .set-row__check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-full);
      cursor: pointer;
      color: var(--color-text-tertiary);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-background-secondary);
        color: var(--color-text-secondary);
      }

      &--completed {
        background: var(--color-success-100);
        color: var(--color-success-600);

        &:hover {
          background: var(--color-success-200);
        }
      }
    }
  `]
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
  }

  onWeightChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.weightValue = value ? parseFloat(value) : null;
    this.setUpdated.emit({ targetWeight: this.weightValue ?? undefined });
  }

  applySuggestion(): void {
    if (this.progressionSuggestion) {
      this.weightValue = this.progressionSuggestion.suggestedWeight;
      this.setUpdated.emit({ targetWeight: this.weightValue });
    }
  }

  onRepsChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.repsValue = value ? parseInt(value, 10) : null;
    this.setUpdated.emit({ targetReps: this.repsValue ?? undefined });
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
