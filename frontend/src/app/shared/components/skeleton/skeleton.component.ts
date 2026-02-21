import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-skeleton',
    imports: [CommonModule],
    templateUrl: './skeleton.component.html',
    styleUrls: ['./skeleton.component.scss']
})
export class SkeletonComponent {
  @Input() variant: 'text' | 'title' | 'avatar' | 'card' = 'text';
  @Input() width?: string;
  @Input() height?: string;
}
