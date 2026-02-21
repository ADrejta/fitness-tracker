import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, BadgeComponent, EmptyStateComponent, ButtonComponent, SkeletonComponent } from '../../shared/components';
import { WorkoutService, SettingsService } from '../../core/services';
import { Workout } from '../../core/models';
import {
  format,
  isToday as isDateToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns';

interface WorkoutGroup {
  label: string;
  workouts: Workout[];
}

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  workoutCount: number;
}

@Component({
    standalone: true,
    selector: 'app-history',
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
  activeTagFilter = signal<string | null>(null);

  filteredWorkoutGroups = computed(() => {
    const filter = this.activeTagFilter();
    if (!filter) return this.workoutGroups();
    return this.workoutGroups()
      .map(group => ({
        ...group,
        workouts: group.workouts.filter(w => w.tags?.includes(filter)),
      }))
      .filter(group => group.workouts.length > 0);
  });

  allHistoryTags = computed(() => {
    const tags = new Set<string>();
    for (const group of this.workoutGroups()) {
      for (const workout of group.workouts) {
        for (const tag of workout.tags ?? []) {
          tags.add(tag);
        }
      }
    }
    return [...tags].sort();
  });

  // Pagination state
  currentPage = signal(1);
  pageSize = signal(20);
  totalWorkouts = signal(0);
  isLoadingPage = signal(false);

  totalPages = computed(() => Math.ceil(this.totalWorkouts() / this.pageSize()) || 1);

  // Calendar state
  viewMode = signal<'list' | 'calendar'>('list');
  selectedMonth = signal(new Date());
  selectedDate = signal<string | null>(null);

  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  selectedMonthLabel = computed(() => format(this.selectedMonth(), 'MMMM yyyy'));

  private workoutCountMap = computed(() => {
    const map = new Map<string, number>();
    const workouts = this.workoutService.completedWorkouts();
    workouts.forEach(w => {
      if (!w.completedAt) return;
      const key = format(parseISO(w.completedAt), 'yyyy-MM-dd');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  });

  calendarWeeks = computed<CalendarDay[][]>(() => {
    const month = this.selectedMonth();
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calStart, end: calEnd });
    const countMap = this.workoutCountMap();
    const today = new Date();

    const calendarDays: CalendarDay[] = days.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return {
        date,
        dayNumber: date.getDate(),
        dateKey,
        isCurrentMonth: isSameMonth(date, month),
        isToday: isSameDay(date, today),
        workoutCount: countMap.get(dateKey) || 0,
      };
    });

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  });

  selectedDateWorkouts = computed<Workout[]>(() => {
    const dateKey = this.selectedDate();
    if (!dateKey) return [];
    const targetDate = parseISO(dateKey);
    return this.workoutService.completedWorkouts().filter(w =>
      w.completedAt && isSameDay(parseISO(w.completedAt), targetDate)
    );
  });

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
      if (isDateToday(date)) {
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

  toggleTagFilter(tag: string): void {
    this.activeTagFilter.set(this.activeTagFilter() === tag ? null : tag);
  }

  toggleView(mode: 'list' | 'calendar'): void {
    this.viewMode.set(mode);
    if (mode === 'list') {
      this.selectedDate.set(null);
    }
  }

  previousMonth(): void {
    this.selectedMonth.set(subMonths(this.selectedMonth(), 1));
    this.selectedDate.set(null);
  }

  nextMonth(): void {
    this.selectedMonth.set(addMonths(this.selectedMonth(), 1));
    this.selectedDate.set(null);
  }

  goToToday(): void {
    this.selectedMonth.set(new Date());
    this.selectedDate.set(null);
  }

  selectDate(day: CalendarDay): void {
    if (day.workoutCount > 0 && day.isCurrentMonth) {
      this.selectedDate.set(
        this.selectedDate() === day.dateKey ? null : day.dateKey
      );
    }
  }

  formatDate(dateString: string): string {
    const date = parseISO(dateString);
    if (isDateToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  }

  formatSelectedDate(dateKey: string): string {
    return format(parseISO(dateKey), 'EEEE, MMMM d, yyyy');
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

  exportCsv(): void {
    const workouts = this.workoutService.completedWorkouts();
    if (!workouts.length) return;

    const unit = this.settingsService.weightUnit();
    const rows: string[] = [`Date,Workout,Exercise,Set,Reps,Weight (${unit}),RPE,Notes`];

    for (const workout of workouts) {
      const date = workout.completedAt ? format(parseISO(workout.completedAt), 'yyyy-MM-dd') : '';
      const workoutName = this.escapeCsvField(workout.name);

      for (const exercise of workout.exercises) {
        const exerciseName = this.escapeCsvField(exercise.exerciseName);

        for (const set of exercise.sets) {
          rows.push([
            date,
            workoutName,
            exerciseName,
            set.setNumber,
            set.actualReps ?? '',
            set.actualWeight ?? '',
            set.rpe ?? '',
            this.escapeCsvField(exercise.notes ?? ''),
          ].join(','));
        }
      }
    }

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workout-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
