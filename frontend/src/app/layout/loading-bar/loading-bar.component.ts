import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  template: `
    @if (isLoading()) {
      <div class="loading-bar__track"></div>
    }
  `,
  styleUrls: ['./loading-bar.component.scss']
})
export class LoadingBarComponent {
  private loadingService = inject(LoadingService);
  protected isLoading = toSignal(this.loadingService.isLoading$, { initialValue: false });
}
