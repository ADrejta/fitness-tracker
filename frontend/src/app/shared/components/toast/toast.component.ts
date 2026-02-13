import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  dismiss(id: string): void {
    this.toastService.remove(id);
  }
}
