import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then(
        (m) => m.RegisterComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'workout',
    loadComponent: () =>
      import('./features/workout/workout.component').then(
        (m) => m.WorkoutComponent
      ),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./features/history/history.component').then(
        (m) => m.HistoryComponent
      ),
  },
  {
    path: 'history/:id',
    loadComponent: () =>
      import('./features/history/workout-detail/workout-detail.component').then(
        (m) => m.WorkoutDetailComponent
      ),
  },
  {
    path: 'statistics',
    loadComponent: () =>
      import('./features/statistics/statistics.component').then(
        (m) => m.StatisticsComponent
      ),
  },
  {
    path: 'body-stats',
    loadComponent: () =>
      import('./features/body-stats/body-stats.component').then(
        (m) => m.BodyStatsComponent
      ),
  },
  {
    path: 'exercises',
    loadComponent: () =>
      import('./features/exercises/exercises.component').then(
        (m) => m.ExercisesComponent
      ),
  },
  {
    path: 'programs',
    loadComponent: () =>
      import('./features/programs/programs.component').then(
        (m) => m.ProgramsComponent
      ),
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./features/templates/templates.component').then(
        (m) => m.TemplatesComponent
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent
      ),
  },
  {
    path: 'tools/plate-calculator',
    loadComponent: () =>
      import('./features/tools/plate-calculator.component').then(
        (m) => m.PlateCalculatorComponent
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [adminGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
