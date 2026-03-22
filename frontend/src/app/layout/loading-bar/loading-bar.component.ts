import { Component, inject } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  standalone: true,
  selector: 'app-loading-bar',
  template: `
    @if (isLoading()) {
      <div class="loading-bar__track"></div>
    }
    @if (isSlowLoading()) {
      <div class="loading-bar__cold-start">
        <svg class="loading-bar__cold-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Server is waking up — this can take up to 30s
      </div>
    }
  `,
  styleUrls: ['./loading-bar.component.scss']
})
export class LoadingBarComponent {
  private loadingService = inject(LoadingService);
  protected isLoading = this.loadingService.isLoading;
  protected isSlowLoading = this.loadingService.isSlowLoading;
}
