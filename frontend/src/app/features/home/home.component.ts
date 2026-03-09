import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageContainerComponent } from '../../layout';
import { ButtonComponent, CardComponent, BadgeComponent, ProgressComponent } from '../../shared/components';
import { WorkoutService, TemplateService, StatisticsService, SettingsService, ProgramService, OnboardingService } from '../../core/services';
import { ProgramWorkout } from '../../core/models';
import { OnboardingModalComponent } from './onboarding-modal/onboarding-modal.component';
import { format, isToday, isYesterday } from 'date-fns';

@Component({
    standalone: true,
    selector: 'app-home',
    imports: [
        CommonModule,
        RouterLink,
        PageContainerComponent,
        ButtonComponent,
        CardComponent,
        BadgeComponent,
        ProgressComponent,
        OnboardingModalComponent
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  workoutService = inject(WorkoutService);
  templateService = inject(TemplateService);
  statisticsService = inject(StatisticsService);
  settingsService = inject(SettingsService);
  programService = inject(ProgramService);
  private onboardingService = inject(OnboardingService);
  private router = inject(Router);

  showOnboarding = this.onboardingService.shouldShow;

  todaysProgramWorkout = computed((): ProgramWorkout | null => {
    const program = this.programService.activeProgram();
    if (!program?.weeks) return null;
    const week = program.weeks.find(w => w.weekNumber === program.currentWeek);
    if (!week) return null;
    return week.workouts.find(w => w.dayNumber === program.currentDay) ?? null;
  });

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  readonly motivationalMessage = (() => {
    const messages = [
      'Ready to crush your workout?',
      'Time to get stronger!',
      'Every rep counts!',
      'Push your limits today!',
      'Consistency is key!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  })();

  formatWorkoutDate(dateString: string): string {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  }

  formatVolume(kg: number): string {
    if (kg < 1000) return `${Math.round(kg)}`;
    return `${(kg / 1000).toFixed(1)}k`;
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  dismissOnboarding(): void {
    this.onboardingService.dismiss();
  }

  startWorkoutFromOnboarding(): void {
    this.onboardingService.dismiss();
    this.startNewWorkout();
  }

  startNewWorkout(): void {
    this.router.navigate(['/workout'], { queryParams: { start: 'true' } });
  }

  async startTodaysProgramWorkout(): Promise<void> {
    const program = this.programService.activeProgram();
    const workout = this.todaysProgramWorkout();
    if (!program || !workout) return;
    const result = await firstValueFrom(this.programService.startProgramWorkout(program.id, workout.id));
    if (result) {
      this.workoutService.setActiveWorkout(result);
      this.router.navigate(['/workout']);
    }
  }

  async startFromTemplate(templateId: string): Promise<void> {
    const workout = await this.templateService.startWorkoutFromTemplate(templateId);
    if (workout) {
      this.router.navigate(['/workout']);
    }
  }
}
