import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

@Component({
    selector: 'app-progress',
    imports: [CommonModule],
    templateUrl: './progress.component.html',
    styleUrls: ['./progress.component.scss']
})
export class ProgressComponent {
  @Input() value = 0;
  @Input() max = 100;
  @Input() variant: ProgressVariant = 'primary';
  @Input() size: ProgressSize = 'md';
  @Input() label = '';
  @Input() showValue = false;
  @Input() animated = false;
  @Input() valueFormat: 'percentage' | 'fraction' | 'value' = 'percentage';

  get percentage(): number {
    return Math.min(100, Math.max(0, (this.value / this.max) * 100));
  }

  get displayValue(): string {
    switch (this.valueFormat) {
      case 'fraction':
        return `${this.value}/${this.max}`;
      case 'value':
        return `${this.value}`;
      case 'percentage':
      default:
        return `${Math.round(this.percentage)}%`;
    }
  }

  get trackClasses(): string {
    return `progress-track progress-track--${this.size}`;
  }

  get barClasses(): string {
    const classes = [
      'progress-bar',
      `progress-bar--${this.variant}`
    ];

    if (this.animated) classes.push('progress-bar--animated');

    return classes.join(' ');
  }
}
