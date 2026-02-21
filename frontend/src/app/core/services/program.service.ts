import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { WorkoutProgram, ProgramSummary, Workout } from '../models';

const PROGRAMS_KEY = 'programs';

interface ProgramListResponse {
  programs: ProgramSummary[];
}

interface CreateProgramWorkoutRequest {
  weekNumber: number;
  dayNumber: number;
  name: string;
  templateId?: string;
  isRestDay: boolean;
  notes?: string;
}

interface CreateProgramRequest {
  name: string;
  description?: string;
  durationWeeks: number;
  workouts: CreateProgramWorkoutRequest[];
}

interface UpdateProgramRequest {
  name?: string;
  description?: string;
  durationWeeks?: number;
  workouts?: CreateProgramWorkoutRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class ProgramService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private _programs = signal<ProgramSummary[]>([]);
  private _activeProgram = signal<WorkoutProgram | null>(null);
  private _isLoading = signal<boolean>(false);

  readonly programs = this._programs.asReadonly();
  readonly activeProgram = this._activeProgram.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly hasActiveProgram = computed(() => this._activeProgram() !== null);

  constructor() {
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.fetchPrograms();
        this.fetchActiveProgram();
      }
    });
  }

  private fetchPrograms(): void {
    this._isLoading.set(true);
    this.http.get<ProgramListResponse>(`${environment.apiUrl}/programs`)
      .subscribe({
        next: (response) => {
          this._programs.set(response.programs);
          this._isLoading.set(false);
        },
        error: (err) => {
          console.error('[ProgramService] Failed to fetch programs:', err);
          this.toastService.error('Failed to load programs');
          this._isLoading.set(false);
        }
      });
  }

  private fetchActiveProgram(): void {
    this.http.get<WorkoutProgram>(`${environment.apiUrl}/programs/active`)
      .subscribe({
        next: (program) => {
          this._activeProgram.set(program);
        },
        error: () => {
          // 404 is expected when no active program
          this._activeProgram.set(null);
        }
      });
  }

  createProgram(req: CreateProgramRequest): Observable<WorkoutProgram> {
    if (this.authService.isAuthenticated()) {
      return this.http.post<WorkoutProgram>(`${environment.apiUrl}/programs`, req)
        .pipe(
          tap(() => this.fetchPrograms()),
          catchError((err) => {
            console.error('[ProgramService] Failed to create program:', err);
            this.toastService.error('Failed to create program');
            throw err;
          })
        );
    } else {
      const program: WorkoutProgram = {
        id: crypto.randomUUID(),
        name: req.name,
        description: req.description,
        durationWeeks: req.durationWeeks,
        isActive: false,
        currentWeek: 1,
        currentDay: 1,
        createdAt: new Date().toISOString(),
        weeks: this.buildWeeksFromWorkouts(req.workouts, req.durationWeeks),
      };
      this._programs.update(current => [...current, {
        id: program.id,
        name: program.name,
        description: program.description,
        durationWeeks: program.durationWeeks,
        isActive: false,
        currentWeek: 1,
        currentDay: 1,
        createdAt: program.createdAt,
        totalWorkouts: req.workouts.filter(w => !w.isRestDay).length,
        completedWorkouts: 0,
      }]);
      this.saveToLocalStorage();
      return of(program);
    }
  }

  getProgramById(id: string): Observable<WorkoutProgram> {
    if (this.authService.isAuthenticated()) {
      return this.http.get<WorkoutProgram>(`${environment.apiUrl}/programs/${id}`)
        .pipe(
          catchError((err) => {
            console.error('[ProgramService] Failed to fetch program:', err);
            this.toastService.error('Failed to load program');
            throw err;
          })
        );
    } else {
      const programs = this.storage.get<WorkoutProgram[]>(PROGRAMS_KEY, []);
      const program = programs.find(p => p.id === id);
      if (program) return of(program);
      throw new Error('Program not found');
    }
  }

  updateProgram(id: string, req: UpdateProgramRequest): Observable<WorkoutProgram> {
    if (this.authService.isAuthenticated()) {
      return this.http.patch<WorkoutProgram>(`${environment.apiUrl}/programs/${id}`, req)
        .pipe(
          tap(() => this.fetchPrograms()),
          catchError((err) => {
            console.error('[ProgramService] Failed to update program:', err);
            this.toastService.error('Failed to update program');
            throw err;
          })
        );
    } else {
      return of(null as unknown as WorkoutProgram);
    }
  }

  deleteProgram(id: string): Observable<boolean> {
    if (this.authService.isAuthenticated()) {
      return this.http.delete(`${environment.apiUrl}/programs/${id}`)
        .pipe(
          tap(() => {
            this._programs.update(current => current.filter(p => p.id !== id));
            if (this._activeProgram()?.id === id) {
              this._activeProgram.set(null);
            }
          }),
          map(() => true),
          catchError((err) => {
            console.error('[ProgramService] Failed to delete program:', err);
            this.toastService.error('Failed to delete program');
            return of(false);
          })
        );
    } else {
      this._programs.update(current => current.filter(p => p.id !== id));
      this.saveToLocalStorage();
      return of(true);
    }
  }

  startProgram(id: string): Observable<WorkoutProgram> {
    if (this.authService.isAuthenticated()) {
      return this.http.post<WorkoutProgram>(`${environment.apiUrl}/programs/${id}/start`, {})
        .pipe(
          tap((program) => {
            this._activeProgram.set(program);
            this.fetchPrograms();
          }),
          catchError((err) => {
            console.error('[ProgramService] Failed to start program:', err);
            this.toastService.error('Failed to start program');
            throw err;
          })
        );
    } else {
      return of(null as unknown as WorkoutProgram);
    }
  }

  startProgramWorkout(programId: string, workoutId: string): Observable<Workout> {
    if (this.authService.isAuthenticated()) {
      return this.http.post<Workout>(
        `${environment.apiUrl}/programs/${programId}/workouts/${workoutId}/start`, {}
      ).pipe(
        tap(() => this.fetchActiveProgram()),
        catchError((err) => {
          console.error('[ProgramService] Failed to start program workout:', err);
          this.toastService.error('Failed to start workout');
          throw err;
        })
      );
    } else {
      return of(null as unknown as Workout);
    }
  }

  refresh(): void {
    if (this.authService.isAuthenticated()) {
      this.fetchPrograms();
      this.fetchActiveProgram();
    }
  }

  private buildWeeksFromWorkouts(workouts: CreateProgramWorkoutRequest[], durationWeeks: number): WorkoutProgram['weeks'] {
    const weeks: WorkoutProgram['weeks'] = [];
    for (let w = 1; w <= durationWeeks; w++) {
      weeks.push({
        weekNumber: w,
        workouts: workouts
          .filter(wo => wo.weekNumber === w)
          .map(wo => ({
            id: crypto.randomUUID(),
            weekNumber: wo.weekNumber,
            dayNumber: wo.dayNumber,
            name: wo.name,
            templateId: wo.templateId,
            isRestDay: wo.isRestDay,
            notes: wo.notes,
          })),
      });
    }
    return weeks;
  }

  private saveToLocalStorage(): void {
    if (!this.authService.isAuthenticated()) {
      this.storage.set(PROGRAMS_KEY, this._programs());
    }
  }
}
