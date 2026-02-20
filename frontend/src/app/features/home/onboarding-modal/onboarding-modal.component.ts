import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../shared/components';

@Component({
  selector: 'app-onboarding-modal',
  standalone: true,
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
  readonly totalSteps = 4;

  // Step 2 mock interaction
  workoutButtonState = signal<'idle' | 'loading' | 'done'>('idle');

  // Step 3 mock interaction
  mockWeight = signal('80');
  mockReps = signal('8');
  setCompleted = signal(false);

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
    }
  }

  onDismiss(): void {
    this.currentStep.set(1);
    this.workoutButtonState.set('idle');
    this.setCompleted.set(false);
    this.closed.emit();
  }

  onStartWorkout(): void {
    this.startWorkout.emit();
    this.closed.emit();
  }
}
