import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

@Component({
    standalone: true,
    selector: 'app-badge',
    imports: [CommonModule],
    templateUrl: './badge.component.html',
    styleUrls: ['./badge.component.scss']
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';
  @Input() size: BadgeSize = 'md';
  @Input() pill = true;
  @Input() outline = false;

  get badgeClasses(): string {
    const classes = [
      'badge',
      `badge--${this.variant}`,
      `badge--${this.size}`
    ];

    if (this.pill) classes.push('badge--pill');
    if (this.outline) classes.push('badge--outline');

    return classes.join(' ');
  }
}
