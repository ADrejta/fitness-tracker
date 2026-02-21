import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import {
  CardComponent, ButtonComponent, BadgeComponent, EmptyStateComponent,
  ModalComponent, InputComponent, ProgressComponent, TabsComponent,
} from '../../shared/components';
import { Tab } from '../../shared/components/tabs/tabs.component';
import { ProgramService, TemplateService, ToastService } from '../../core/services';
import { ProgramSummary, WorkoutProgram, ProgramWorkout, ProgramWeek, WorkoutTemplate } from '../../core/models';
import { format, parseISO } from 'date-fns';
import { PROGRAM_PRESETS, ProgramPreset, PresetDaySlot } from './program-presets';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBR = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];

interface DaySlot {
  dayNumber: number;
  dayName: string;
  name: string;
  templateId?: string;
  templateName?: string;
  isRestDay: boolean;
  notes?: string;
}

@Component({
    standalone: true,
    selector: 'app-programs',
    imports: [
        CommonModule,
        FormsModule,
        PageContainerComponent,
        CardComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        ModalComponent,
        InputComponent,
        ProgressComponent,
        TabsComponent,
    ],
    templateUrl: './programs.component.html',
    styleUrls: ['./programs.component.scss']
})
export class ProgramsComponent {
  programService = inject(ProgramService);
  templateService = inject(TemplateService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // Preset state
  presets = PROGRAM_PRESETS;
  showPresetsModal = false;
  showPresetDetail = false;
  selectedPreset: ProgramPreset | null = null;
  expandedPresetDay: number | null = null;

  // Modal state
  showCreateModal = false;
  showMenuModal = false;
  showDeleteConfirm = false;
  showDetailModal = false;
  showTemplatePicker = false;

  selectedProgram: ProgramSummary | null = null;
  detailProgram = signal<WorkoutProgram | null>(null);
  detailView = signal<'schedule' | 'progress'>('schedule');
  isEditing = false;

  DAY_ABBR = DAY_ABBR;

  detailAdherence = computed(() => {
    const program = this.detailProgram();
    if (!program) return { completed: 0, total: 0, pct: 0 };
    let total = 0, completed = 0;
    for (const week of program.weeks) {
      for (const wo of week.workouts) {
        if (!wo.isRestDay) {
          total++;
          if (wo.completedWorkoutId) completed++;
        }
      }
    }
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { completed, total, pct };
  });
  editingProgramId: string | null = null;

  // Form state
  programName = '';
  programDescription = '';
  programDurationWeeks = 4;
  activeWeekTab = 'week-1';
  weeks = signal<DaySlot[][]>([]);

  // Template picker state
  pickingDayIndex: { week: number; day: number } | null = null;

  weekTabs = computed((): Tab[] => {
    const tabs: Tab[] = [];
    for (let i = 1; i <= this.programDurationWeeks; i++) {
      tabs.push({ id: `week-${i}`, label: `Week ${i}` });
    }
    return tabs;
  });

  activeWeekIndex = computed(() => {
    const match = this.activeWeekTab.match(/week-(\d+)/);
    return match ? parseInt(match[1], 10) - 1 : 0;
  });

  currentWeekSlots = computed(() => {
    const allWeeks = this.weeks();
    const idx = this.activeWeekIndex();
    return idx < allWeeks.length ? allWeeks[idx] : [];
  });

  formatDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM d, yyyy');
  }

  progressPercent(program: ProgramSummary): number {
    if (program.totalWorkouts === 0) return 0;
    return Math.round((program.completedWorkouts / program.totalWorkouts) * 100);
  }

  // Create/Edit modal
  openCreateModal(): void {
    this.isEditing = false;
    this.editingProgramId = null;
    this.programName = '';
    this.programDescription = '';
    this.programDurationWeeks = 4;
    this.activeWeekTab = 'week-1';
    this.initWeeks(4);
    this.showCreateModal = true;
  }

  openEditModal(program: ProgramSummary): void {
    this.showMenuModal = false;
    this.isEditing = true;
    this.editingProgramId = program.id;
    this.programName = program.name;
    this.programDescription = program.description || '';
    this.programDurationWeeks = program.durationWeeks;
    this.activeWeekTab = 'week-1';

    // Load full program details to populate weeks
    this.programService.getProgramById(program.id).subscribe({
      next: (full) => {
        this.loadWeeksFromProgram(full);
        this.showCreateModal = true;
      },
      error: () => {
        this.toastService.error('Failed to load program details');
      }
    });
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  onDurationChange(): void {
    // Clamp
    if (this.programDurationWeeks < 1) this.programDurationWeeks = 1;
    if (this.programDurationWeeks > 52) this.programDurationWeeks = 52;

    const current = this.weeks();
    if (this.programDurationWeeks > current.length) {
      // Add new weeks
      const newWeeks = [...current];
      for (let i = current.length; i < this.programDurationWeeks; i++) {
        newWeeks.push(this.createEmptyWeek());
      }
      this.weeks.set(newWeeks);
    } else if (this.programDurationWeeks < current.length) {
      this.weeks.set(current.slice(0, this.programDurationWeeks));
    }

    // Ensure active tab is valid
    const idx = this.activeWeekIndex();
    if (idx >= this.programDurationWeeks) {
      this.activeWeekTab = `week-${this.programDurationWeeks}`;
    }
  }

  copyWeekToAll(): void {
    const source = this.currentWeekSlots();
    const updated = this.weeks().map(() =>
      source.map(slot => ({ ...slot }))
    );
    this.weeks.set(updated);
    this.toastService.success('Week copied to all weeks');
  }

  // Day slot actions
  toggleRestDay(dayIndex: number): void {
    const weekIdx = this.activeWeekIndex();
    const allWeeks = this.weeks();
    const week = [...allWeeks[weekIdx]];
    const slot = week[dayIndex];
    week[dayIndex] = {
      ...slot,
      isRestDay: !slot.isRestDay,
      name: !slot.isRestDay ? 'Rest Day' : DAY_NAMES[dayIndex],
      templateId: undefined,
      templateName: undefined,
    };
    const updated = [...allWeeks];
    updated[weekIdx] = week;
    this.weeks.set(updated);
  }

  openTemplatePicker(dayIndex: number): void {
    this.pickingDayIndex = { week: this.activeWeekIndex(), day: dayIndex };
    this.showTemplatePicker = true;
  }

  selectTemplate(template: WorkoutTemplate): void {
    if (!this.pickingDayIndex) return;
    const { week, day } = this.pickingDayIndex;
    const allWeeks = this.weeks();
    const weekSlots = [...allWeeks[week]];
    weekSlots[day] = {
      ...weekSlots[day],
      name: template.name,
      templateId: template.id,
      templateName: template.name,
      isRestDay: false,
    };
    const updated = [...allWeeks];
    updated[week] = weekSlots;
    this.weeks.set(updated);
    this.showTemplatePicker = false;
    this.pickingDayIndex = null;
  }

  clearTemplate(dayIndex: number): void {
    const weekIdx = this.activeWeekIndex();
    const allWeeks = this.weeks();
    const week = [...allWeeks[weekIdx]];
    week[dayIndex] = {
      ...week[dayIndex],
      templateId: undefined,
      templateName: undefined,
      name: DAY_NAMES[dayIndex],
    };
    const updated = [...allWeeks];
    updated[weekIdx] = week;
    this.weeks.set(updated);
  }

  updateDayName(dayIndex: number, name: string): void {
    const weekIdx = this.activeWeekIndex();
    const allWeeks = this.weeks();
    const week = [...allWeeks[weekIdx]];
    week[dayIndex] = { ...week[dayIndex], name };
    const updated = [...allWeeks];
    updated[weekIdx] = week;
    this.weeks.set(updated);
  }

  saveProgram(): void {
    if (!this.programName.trim()) {
      this.toastService.error('Program name is required');
      return;
    }

    const workouts = this.buildWorkoutsPayload();

    if (this.isEditing && this.editingProgramId) {
      this.programService.updateProgram(this.editingProgramId, {
        name: this.programName,
        description: this.programDescription || undefined,
        durationWeeks: this.programDurationWeeks,
        workouts,
      }).subscribe({
        next: () => {
          this.toastService.success('Program updated');
          this.showCreateModal = false;
        },
        error: () => {}
      });
    } else {
      this.programService.createProgram({
        name: this.programName,
        description: this.programDescription || undefined,
        durationWeeks: this.programDurationWeeks,
        workouts,
      }).subscribe({
        next: () => {
          this.toastService.success('Program created');
          this.showCreateModal = false;
        },
        error: () => {}
      });
    }
  }

  // Menu actions
  showProgramMenu(program: ProgramSummary): void {
    this.selectedProgram = program;
    this.showMenuModal = true;
  }

  closeMenu(): void {
    this.showMenuModal = false;
    this.selectedProgram = null;
  }

  viewProgram(program: ProgramSummary): void {
    this.showMenuModal = false;
    this.programService.getProgramById(program.id).subscribe({
      next: (full) => {
        this.detailProgram.set(full);
        this.showDetailModal = true;
      },
      error: () => {
        this.toastService.error('Failed to load program');
      }
    });
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.detailProgram.set(null);
    this.detailView.set('schedule');
  }

  weekWorkoutCount(week: ProgramWeek): number {
    return week.workouts.filter(w => !w.isRestDay).length;
  }

  weekCompletedCount(week: ProgramWeek): number {
    return week.workouts.filter(w => !!w.completedWorkoutId).length;
  }

  getDayStatus(workout: ProgramWorkout, weekNumber: number, program: WorkoutProgram): 'completed' | 'rest' | 'current' | 'skipped' | 'upcoming' {
    if (workout.completedWorkoutId) return 'completed';
    if (workout.isRestDay) return 'rest';
    if (program.isActive) {
      if (weekNumber < program.currentWeek) return 'skipped';
      if (weekNumber === program.currentWeek) {
        if (workout.dayNumber < program.currentDay) return 'skipped';
        if (workout.dayNumber === program.currentDay) return 'current';
      }
    }
    return 'upcoming';
  }

  startProgram(program: ProgramSummary): void {
    this.showMenuModal = false;
    this.programService.startProgram(program.id).subscribe({
      next: () => {
        this.toastService.success(`${program.name} activated`);
      },
      error: () => {}
    });
  }

  confirmDelete(program: ProgramSummary): void {
    this.showMenuModal = false;
    this.selectedProgram = program;
    this.showDeleteConfirm = true;
  }

  deleteProgram(): void {
    if (!this.selectedProgram) return;
    this.programService.deleteProgram(this.selectedProgram.id).subscribe({
      next: (success) => {
        if (success) {
          this.toastService.success('Program deleted');
        }
        this.showDeleteConfirm = false;
        this.selectedProgram = null;
      }
    });
  }

  startProgramWorkout(programId: string, workout: ProgramWorkout): void {
    if (workout.isRestDay || workout.completedWorkoutId) return;
    this.programService.startProgramWorkout(programId, workout.id).subscribe({
      next: () => {
        this.router.navigate(['/workout']);
      },
      error: () => {}
    });
  }

  // Preset actions
  openPresetsModal(): void {
    this.showPresetsModal = true;
  }

  viewPresetDetail(preset: ProgramPreset): void {
    this.selectedPreset = preset;
    this.expandedPresetDay = null;
    this.showPresetsModal = false;
    this.showPresetDetail = true;
  }

  closePresetDetail(): void {
    this.showPresetDetail = false;
    this.selectedPreset = null;
    this.expandedPresetDay = null;
  }

  backToPresets(): void {
    this.showPresetDetail = false;
    this.selectedPreset = null;
    this.expandedPresetDay = null;
    this.showPresetsModal = true;
  }

  togglePresetDay(day: PresetDaySlot): void {
    if (day.isRestDay) return;
    this.expandedPresetDay = this.expandedPresetDay === day.dayNumber ? null : day.dayNumber;
  }

  usePreset(preset: ProgramPreset): void {
    const workouts = preset.schedule.map(slot => ({
      weekNumber: slot.weekNumber,
      dayNumber: slot.dayNumber,
      name: slot.name,
      isRestDay: slot.isRestDay,
    }));

    this.programService.createProgram({
      name: preset.name,
      description: preset.description,
      durationWeeks: preset.durationWeeks,
      workouts,
    }).subscribe({
      next: () => {
        this.toastService.success(`${preset.name} added to your programs`);
        this.showPresetDetail = false;
        this.selectedPreset = null;
      },
      error: () => {}
    });
  }

  getPresetWeekDays(preset: ProgramPreset, weekNumber: number) {
    return preset.schedule.filter(s => s.weekNumber === weekNumber);
  }

  // Helpers
  private initWeeks(count: number): void {
    const newWeeks: DaySlot[][] = [];
    for (let i = 0; i < count; i++) {
      newWeeks.push(this.createEmptyWeek());
    }
    this.weeks.set(newWeeks);
  }

  private createEmptyWeek(): DaySlot[] {
    return DAY_NAMES.map((name, idx) => ({
      dayNumber: idx + 1,
      dayName: name,
      name,
      isRestDay: false,
    }));
  }

  private loadWeeksFromProgram(program: WorkoutProgram): void {
    const newWeeks: DaySlot[][] = [];
    for (let w = 0; w < program.durationWeeks; w++) {
      const week = program.weeks.find(pw => pw.weekNumber === w + 1);
      const slots = this.createEmptyWeek();
      if (week) {
        for (const wo of week.workouts) {
          const dayIdx = wo.dayNumber - 1;
          if (dayIdx >= 0 && dayIdx < 7) {
            slots[dayIdx] = {
              dayNumber: wo.dayNumber,
              dayName: DAY_NAMES[dayIdx],
              name: wo.name,
              templateId: wo.templateId,
              templateName: wo.templateId
                ? this.templateService.getTemplateById(wo.templateId)?.name
                : undefined,
              isRestDay: wo.isRestDay,
              notes: wo.notes,
            };
          }
        }
      }
      newWeeks.push(slots);
    }
    this.weeks.set(newWeeks);
  }

  private buildWorkoutsPayload(): Array<{
    weekNumber: number;
    dayNumber: number;
    name: string;
    templateId?: string;
    isRestDay: boolean;
    notes?: string;
  }> {
    const workouts: Array<{
      weekNumber: number;
      dayNumber: number;
      name: string;
      templateId?: string;
      isRestDay: boolean;
      notes?: string;
    }> = [];

    this.weeks().forEach((week, weekIdx) => {
      week.forEach(slot => {
        workouts.push({
          weekNumber: weekIdx + 1,
          dayNumber: slot.dayNumber,
          name: slot.name,
          templateId: slot.templateId,
          isRestDay: slot.isRestDay,
          notes: slot.notes,
        });
      });
    });

    return workouts;
  }
}
