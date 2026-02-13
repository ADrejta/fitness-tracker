import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-container.component.html',
  styleUrls: ['./page-container.component.scss']
})
export class PageContainerComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() fullWidth = false;
  @Input() noPadding = false;
}
