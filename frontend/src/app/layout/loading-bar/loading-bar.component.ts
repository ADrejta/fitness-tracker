import { Component, inject } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  template: `
    @if (loadingService.isLoading()) {
      <div class="loading-bar__track"></div>
    }
  `,
  styleUrls: ['./loading-bar.component.scss']
})
export class LoadingBarComponent {
  protected loadingService = inject(LoadingService);
}
