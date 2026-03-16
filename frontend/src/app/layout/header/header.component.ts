import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WorkoutService, AuthService } from '../../core/services';
import { SyncQueueService } from '../../core/services/sync-queue.service';
import { LoadingBarComponent } from '../loading-bar/loading-bar.component';

@Component({
    standalone: true,
    selector: 'app-header',
    imports: [CommonModule, RouterLink, LoadingBarComponent],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private router = inject(Router);
  workoutService = inject(WorkoutService);
  authService = inject(AuthService);
  syncQueue = inject(SyncQueueService);

  isOnline = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  isRefreshing = signal(false);

  refresh(): void {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    const url = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(url).then(() => {
        this.isRefreshing.set(false);
      });
    });
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }
  }
}
