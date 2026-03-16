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
  @Input() isCardio = false;
  @Input() isBodyweight = false;
  @Input() isCarry = false;
  @Input() isTimed = false;

  @Output() setUpdated = new EventEmitter<Partial<WorkoutSet>>();
  @Output() setCompleted = new EventEmitter<Partial<WorkoutSet>>();
  @Output() setUncompleted = new EventEmitter<void>();
  @Output() setDeleted = new EventEmitter<void>();

  settingsService = inject(SettingsService);
  private router = inject(Router);

  // Swipe gesture state
  swipeTranslateX = signal(0);
  isSwiping = signal(false);
  swipeDeleteRevealed = signal(false);
  swipeCompleteRevealed = signal(false);
  private touchStartX = 0;
  private touchStartY = 0;
  private touchCurrentX = 0;
  private swipeDirection: 'none' | 'left' | 'right' | 'vertical' = 'none';
  private readonly SWIPE_THRESHOLD = 80;
  private readonly MAX_SWIPE = 100;

  showPlateCalculator = signal(false);
  showE1rmOverlay = signal(false);
  weightFocused = signal(false);
  weightValue: number | null = null;
  repsValue: number | null = null;
  rpeValue: number | null = null;

  // Cardio state
  distanceKm: number | null = null;
  durationMin: number | null = null;
  durationSec: number | null = null;
  caloriesValue: number | null = null;

  // Carry state (weight + distance in metres)
  distanceM: number | null = null;

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

  // --- Swipe gesture handlers ---

  onTouchStart(event: TouchEvent): void {
    // Don't initiate swipe on input elements or buttons
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchCurrentX = touch.clientX;
    this.swipeDirection = 'none';
    this.isSwiping.set(false);

    // Reset any previously revealed state when starting a new touch
    if (this.swipeDeleteRevealed() || this.swipeCompleteRevealed()) {
      this.resetSwipe();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (this.touchStartX === 0 && this.touchStartY === 0) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Determine swipe direction on first significant move
    if (this.swipeDirection === 'none') {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          this.swipeDirection = 'vertical';
          return;
        }
        this.swipeDirection = deltaX < 0 ? 'left' : 'right';
        this.isSwiping.set(true);
      }
      return;
    }

    if (this.swipeDirection === 'vertical') return;

    // Prevent vertical scrolling while swiping horizontally
    event.preventDefault();

    this.touchCurrentX = touch.clientX;
    let translateX = touch.clientX - this.touchStartX;

    // Swipe left (delete) - only for incomplete sets
    if (this.swipeDirection === 'left') {
      if (this.set.isCompleted) {
        translateX = 0;
      } else {
        translateX = Math.max(translateX, -this.MAX_SWIPE);
        translateX = Math.min(translateX, 0);
      }
    }

    // Swipe right (complete) - only for incomplete sets
    if (this.swipeDirection === 'right') {
      if (this.set.isCompleted) {
        translateX = 0;
      } else {
        translateX = Math.min(translateX, this.MAX_SWIPE);
        translateX = Math.max(translateX, 0);
      }
    }

    this.swipeTranslateX.set(translateX);
  }

  onTouchEnd(): void {
    if (this.swipeDirection === 'vertical' || this.swipeDirection === 'none') {
      this.resetSwipeState();
      return;
    }

    const translateX = this.swipeTranslateX();

    // Swipe left past threshold -> reveal delete
    if (translateX <= -this.SWIPE_THRESHOLD && !this.set.isCompleted) {
      this.swipeTranslateX.set(-this.MAX_SWIPE);
      this.swipeDeleteRevealed.set(true);
      this.isSwiping.set(false);
      this.resetTouchTracking();
      return;
    }

    // Swipe right past threshold -> complete the set
    if (translateX >= this.SWIPE_THRESHOLD && !this.set.isCompleted) {
      this.triggerHaptic();
      this.toggleComplete();
      this.resetSwipe();
      return;
    }

    // Not past threshold -> snap back
    this.resetSwipe();
  }

  onSwipeDelete(): void {
    this.setDeleted.emit();
    this.resetSwipe();
  }

  resetSwipe(): void {
    this.swipeTranslateX.set(0);
    this.swipeDeleteRevealed.set(false);
    this.swipeCompleteRevealed.set(false);
    this.isSwiping.set(false);
    this.resetTouchTracking();
  }

  private resetTouchTracking(): void {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchCurrentX = 0;
    this.swipeDirection = 'none';
  }

  private resetSwipeState(): void {
    this.isSwiping.set(false);
    this.resetTouchTracking();
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  ngOnInit(): void {
    this.weightValue = this.set.actualWeight ?? this.set.targetWeight ?? null;
    this.repsValue = this.set.actualReps ?? this.set.targetReps ?? null;
    this.rpeValue = this.set.rpe ?? null;
    if (this.set.distanceMeters != null) {
      if (this.isCarry) {
        this.distanceM = this.set.distanceMeters;
      } else {
        this.distanceKm = this.set.distanceMeters / 1000;
      }
    }
    const durSrc = this.set.durationSeconds ?? (this.isTimed ? this.set.targetDurationSeconds : null);
    if (durSrc != null) {
      this.durationMin = Math.floor(durSrc / 60);
      this.durationSec = durSrc % 60;
    }
    this.caloriesValue = this.set.calories ?? null;
  }

  private computeDurationSeconds(): number | undefined {
    const min = this.durationMin ?? 0;
    const sec = this.durationSec ?? 0;
    return min === 0 && sec === 0 ? undefined : min * 60 + sec;
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
      this.triggerHaptic();
    }

    if (this.set.isCompleted) {
      // Already handled above with setUncompleted
      return;
    } else if (this.isCarry) {
      const weight = this.weightValue ?? this.set.targetWeight ?? 0;
      this.setCompleted.emit({
        actualWeight: weight,
        distanceMeters: this.distanceM ?? undefined,
        isCompleted: true,
      });
    } else if (this.isTimed) {
      this.setCompleted.emit({
        actualWeight: this.weightValue ?? undefined,
        durationSeconds: this.computeDurationSeconds(),
        isCompleted: true,
      });
    } else if (this.isCardio) {
      const updates: Partial<WorkoutSet> = {
        distanceMeters: this.distanceKm != null ? this.distanceKm * 1000 : undefined,
        durationSeconds: this.computeDurationSeconds(),
        calories: this.caloriesValue ?? undefined,
        isCompleted: true,
      };
      this.setCompleted.emit(updates);
    } else {
      const weight = this.weightValue ?? this.set.targetWeight ?? 0;
      const reps = this.repsValue ?? this.set.targetReps ?? 0;
      this.setCompleted.emit({ actualWeight: weight, actualReps: reps, isCompleted: true });
    }
  }
}
