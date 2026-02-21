import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../shared/components';

interface PlateResult {
  weight: number;
  color: string;
  count: number;
}

@Component({
    selector: 'app-onboarding-modal',
    imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
    templateUrl: './onboarding-modal.component.html',
    styleUrls: ['./onboarding-modal.component.scss']
})
export class OnboardingModalComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() startWorkout = new EventEmitter<void>();

  currentStep = signal(1);
  slideDirection = signal<'forward' | 'back'>('forward');
  readonly totalSteps = 6;
  readonly stepRange = [1, 2, 3, 4, 5, 6];

  // Step 2 mock interaction
  workoutButtonState = signal<'idle' | 'loading' | 'done'>('idle');

  // Step 3 mock interaction
  mockWeight = signal('80');
  mockReps = signal('8');
  setCompleted = signal(false);

  // Step 4 — plate calculator
  plateTargetWeight = signal(100);
  plateBarWeight = 20;
  plateResults = signal<PlateResult[]>([]);
  plateCalculated = signal(false);

  readonly PLATE_DEFS: { weight: number; color: string }[] = [
    { weight: 25, color: '#ef4444' },
    { weight: 20, color: '#3b82f6' },
    { weight: 15, color: '#facc15' },
    { weight: 10, color: '#22c55e' },
    { weight: 5,  color: '#a855f7' },
    { weight: 2.5, color: '#f97316' },
    { weight: 1.25, color: '#6b7280' },
  ];

  readonly steps = [
    {
      icon: 'dumbbell',
      title: 'Welcome to Fitness Tracker',
      body: 'Track your workouts, monitor your progress, and reach your fitness goals. Let\'s take a quick tour.',
    },
    {
      icon: 'play',
      title: 'Start a Workout',
      body: 'Tap the button below — just like on the home screen — to begin a session.',
    },
    {
      icon: 'check',
      title: 'Log Your Sets',
      body: 'Add exercises, enter weight and reps, then tap the checkmark to complete a set.',
    },
    {
      icon: 'barbell',
      title: 'Plate Calculator',
      body: 'Not sure which plates to load? Set your target weight and the calculator shows exactly what to put on each side.',
    },
    {
      icon: 'chart',
      title: 'Track Your Progress',
      body: 'Every completed workout feeds into your statistics — personal records are detected automatically, and you\'ll get progression suggestions over time.',
    },
    {
      icon: 'trophy',
      title: 'You\'re all set!',
      body: 'Your first real workout is one tap away. We\'ll track progress, detect PRs, and suggest progressions as you train.',
    },
  ];

  get currentStepData() {
    return this.steps[this.currentStep() - 1];
  }

  tapStartWorkout(): void {
    if (this.workoutButtonState() !== 'idle') return;
    this.workoutButtonState.set('loading');
    setTimeout(() => {
      this.workoutButtonState.set('done');
      setTimeout(() => this.advanceTo(3), 700);
    }, 800);
  }

  tapCompleteSet(): void {
    if (this.setCompleted()) return;
    this.setCompleted.set(true);
    setTimeout(() => this.advanceTo(4), 900);
  }

  calculatePlates(): void {
    const target = this.plateTargetWeight();
    const perSide = (target - this.plateBarWeight) / 2;
    if (perSide <= 0) {
      this.plateResults.set([]);
      this.plateCalculated.set(true);
      return;
    }
    let remaining = perSide;
    const results: PlateResult[] = [];
    for (const plate of this.PLATE_DEFS) {
      const count = Math.floor(remaining / plate.weight);
      if (count > 0) {
        results.push({ weight: plate.weight, color: plate.color, count });
        remaining = Math.round((remaining - count * plate.weight) * 1000) / 1000;
      }
    }
    this.plateResults.set(results);
    this.plateCalculated.set(true);
  }

  advanceTo(step: number): void {
    this.slideDirection.set('forward');
    this.currentStep.set(step);
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.slideDirection.set('forward');
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.slideDirection.set('back');
      this.currentStep.update(s => s - 1);
      // Reset step interactions when going back
      if (this.currentStep() === 2) this.workoutButtonState.set('idle');
      if (this.currentStep() === 3) this.setCompleted.set(false);
      if (this.currentStep() === 4) { this.plateCalculated.set(false); this.plateResults.set([]); }
    }
  }

  onDismiss(): void {
    this.currentStep.set(1);
    this.workoutButtonState.set('idle');
    this.setCompleted.set(false);
    this.plateCalculated.set(false);
    this.plateResults.set([]);
    this.closed.emit();
  }

  onStartWorkout(): void {
    this.startWorkout.emit();
    this.closed.emit();
  }

  plateDecrement(): void {
    this.plateTargetWeight.update(w => Math.max(this.plateBarWeight + 2.5, w - 2.5));
    this.plateCalculated.set(false);
    this.plateResults.set([]);
  }

  plateIncrement(): void {
    this.plateTargetWeight.update(w => w + 2.5);
    this.plateCalculated.set(false);
    this.plateResults.set([]);
  }

  // Plate calculator helpers
  getRange(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  getPlateHeight(weight: number): number {
    if (weight >= 25) return 72;
    if (weight >= 20) return 64;
    if (weight >= 15) return 56;
    if (weight >= 10) return 48;
    if (weight >= 5)  return 40;
    if (weight >= 2.5) return 32;
    return 26;
  }

  getPlateWidth(weight: number): number {
    if (weight >= 10) return 14;
    if (weight >= 2.5) return 12;
    return 10;
  }
}
