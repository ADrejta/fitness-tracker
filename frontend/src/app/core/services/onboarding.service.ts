import { Injectable, inject, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { WorkoutService } from './workout.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private storage = inject(StorageService);
  private workoutService = inject(WorkoutService);

  private _dismissed = signal(this.storage.get<boolean>('onboardingDismissed', false));

  readonly shouldShow = computed(() =>
    !this._dismissed() &&
    this.workoutService.completedWorkouts().length === 0
  );

  dismiss(): void {
    this._dismissed.set(true);
    this.storage.set('onboardingDismissed', true);
  }
}
