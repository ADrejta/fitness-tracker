import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageContainerComponent } from '../../../layout';
import { CardComponent, BadgeComponent, ButtonComponent, ModalComponent } from '../../../shared/components';
import { WorkoutService, SettingsService, ExerciseService, TemplateService, ToastService } from '../../../core/services';
import { Workout } from '../../../core/models';
import { format, parseISO } from 'date-fns';

@Component({
    standalone: true,
    selector: 'app-workout-detail',
    imports: [
        CommonModule,
        RouterLink,
        PageContainerComponent,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        ModalComponent
    ],
    templateUrl: './workout-detail.component.html',
    styleUrls: ['./workout-detail.component.scss']
})
export class WorkoutDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);
  workoutService = inject(WorkoutService);
  settingsService = inject(SettingsService);
  exerciseService = inject(ExerciseService);
  templateService = inject(TemplateService);

  workout = signal<Workout | null>(null);
  showMenu = false;
  showDeleteModal = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const workout = this.workoutService.getWorkoutById(id);
      if (workout) {
        this.workout.set(workout);
      } else {
        this.router.navigate(['/history']);
      }
    }
  }

  getMuscleGroups(exerciseTemplateId: string) {
    const template = this.exerciseService.getExerciseById(exerciseTemplateId);
    return template?.muscleGroups || [];
  }

  formatFullDate(dateString: string): string {
    return format(parseISO(dateString), 'EEEE, MMMM d, yyyy \'at\' h:mm a');
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  saveAsTemplate(): void {
    this.showMenu = false;
    const workout = this.workout();
    if (workout) {
      this.templateService.createTemplateFromWorkout(workout.id, `${workout.name} Template`);
      this.router.navigate(['/templates']);
    }
  }

  deleteWorkout(): void {
    const workout = this.workout();
    if (workout) {
      this.workoutService.deleteWorkout(workout.id);
      this.router.navigate(['/history']);
    }
  }

  async repeatWorkout(): Promise<void> {
    this.showMenu = false;
    const workout = this.workout();
    if (!workout) return;

    if (this.workoutService.hasActiveWorkout()) {
      this.toastService.warning('Please finish or cancel your current workout first');
      return;
    }

    const newWorkout = await this.workoutService.repeatWorkout(workout.id);
    if (newWorkout) {
      this.toastService.success('Workout started! Good luck!');
      this.router.navigate(['/workout']);
    } else {
      this.toastService.error('Failed to start workout');
    }
  }
}
