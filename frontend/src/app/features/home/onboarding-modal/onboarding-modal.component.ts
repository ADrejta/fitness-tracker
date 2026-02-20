import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../shared/components';

@Component({
  selector: 'app-onboarding-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, ButtonComponent],
  templateUrl: './onboarding-modal.component.html',
  styleUrls: ['./onboarding-modal.component.scss']
})
export class OnboardingModalComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() startWorkout = new EventEmitter<void>();

  currentStep = signal(1);
  readonly totalSteps = 4;

  readonly steps = [
    {
      icon: 'dumbbell',
      title: 'Welcome to Fitness Tracker',
      body: 'Track your workouts, monitor your progress, and reach your fitness goals. Let\'s take a quick tour.',
    },
    {
      icon: 'play',
      title: 'Start a Workout',
      body: 'Tap <strong>Start Workout</strong> on the home screen to begin a blank session, or pick one of your templates for a pre-planned routine.',
    },
    {
      icon: 'check',
      title: 'Log Your Sets',
      body: 'Add exercises from the library, then enter your weight and reps for each set. Tap the checkmark to mark it complete — your data is saved automatically.',
    },
    {
      icon: 'trophy',
      title: 'You\'re all set!',
      body: 'Your first workout is one tap away. We\'ll track your progress, detect personal records, and suggest progressions as you train.',
    },
  ];

  get currentStepData() {
    return this.steps[this.currentStep() - 1];
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
    }
  }

  onDismiss(): void {
    this.currentStep.set(1);
    this.closed.emit();
  }

  onStartWorkout(): void {
    this.startWorkout.emit();
    this.closed.emit();
  }
}
