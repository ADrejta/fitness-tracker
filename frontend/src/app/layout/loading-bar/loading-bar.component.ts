import { Component, inject } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  standalone: true,
  selector: 'app-loading-bar',
  template: `
    @if (isLoading()) {
      <div class="loading-bar__track"></div>
    }
  `,
  styleUrls: ['./loading-bar.component.scss']
})
export class LoadingBarComponent {
  private loadingService = inject(LoadingService);
  protected isLoading = this.loadingService.isLoading;
}
