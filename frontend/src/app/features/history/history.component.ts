import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, BadgeComponent, EmptyStateComponent, ButtonComponent, SkeletonComponent } from '../../shared/components';
import { WorkoutService, SettingsService } from '../../core/services';
import { Workout } from '../../core/models';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

interface WorkoutGroup {
  label: string;
  workouts: Workout[];
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageContainerComponent,
    CardComponent,
    BadgeComponent,
    EmptyStateComponent,
    ButtonComponent,
    SkeletonComponent
  ],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);

  workoutGroups = signal<WorkoutGroup[]>([]);

  // Pagination state
  currentPage = signal(1);
  pageSize = signal(20);
  totalWorkouts = signal(0);
  isLoadingPage = signal(false);

  totalPages = computed(() => Math.ceil(this.totalWorkouts() / this.pageSize()) || 1);

  ngOnInit(): void {
    this.loadPage(1);
  }

  async loadPage(page: number): Promise<void> {
    this.isLoadingPage.set(true);
    try {
      const offset = (page - 1) * this.pageSize();
      const response = await this.workoutService.fetchWorkoutsPaginated({
        limit: this.pageSize(),
        offset,
        status: 'completed',
      });
      this.currentPage.set(page);
      this.totalWorkouts.set(response.total);
      this.groupWorkoutsFromList(response.workouts);
    } finally {
      this.isLoadingPage.set(false);
    }
  }

  private groupWorkoutsFromList(workouts: Workout[]): void {
    const groups: WorkoutGroup[] = [];

    const today: Workout[] = [];
    const yesterday: Workout[] = [];
    const thisWeek: Workout[] = [];
    const thisMonth: Workout[] = [];
    const older: Workout[] = [];

    workouts.forEach(workout => {
      const date = parseISO(workout.completedAt!);
      if (isToday(date)) {
        today.push(workout);
      } else if (isYesterday(date)) {
        yesterday.push(workout);
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        thisWeek.push(workout);
      } else if (isThisMonth(date)) {
        thisMonth.push(workout);
      } else {
        older.push(workout);
      }
    });

    if (today.length) groups.push({ label: 'Today', workouts: today });
    if (yesterday.length) groups.push({ label: 'Yesterday', workouts: yesterday });
    if (thisWeek.length) groups.push({ label: 'This Week', workouts: thisWeek });
    if (thisMonth.length) groups.push({ label: 'This Month', workouts: thisMonth });
    if (older.length) groups.push({ label: 'Older', workouts: older });

    this.workoutGroups.set(groups);
  }

  formatDate(dateString: string): string {
    const date = parseISO(dateString);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  }

  formatVolume(kg: number): string {
    if (kg < 1000) return `${Math.round(kg)} kg`;
    return `${(kg / 1000).toFixed(1)}t`;
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
}
