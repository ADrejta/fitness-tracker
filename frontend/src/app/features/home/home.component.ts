import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { ButtonComponent, CardComponent, BadgeComponent, ProgressComponent } from '../../shared/components';
import { WorkoutService, TemplateService, StatisticsService, SettingsService } from '../../core/services';
import { format, isToday, isYesterday } from 'date-fns';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageContainerComponent,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    ProgressComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  workoutService = inject(WorkoutService);
  templateService = inject(TemplateService);
  statisticsService = inject(StatisticsService);
  settingsService = inject(SettingsService);
  private router = inject(Router);

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

  startNewWorkout(): void {
    this.router.navigate(['/workout'], { queryParams: { start: 'true' } });
  }

  startFromTemplate(templateId: string): void {
    this.templateService.startWorkoutFromTemplate(templateId);
    this.router.navigate(['/workout']);
  }
}
