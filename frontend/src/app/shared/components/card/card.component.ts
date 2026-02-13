import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() raised = false;
  @Input() interactive = false;
  @Input() highlight = false;
  @Input() compact = false;
  @Input() noPadding = false;
  @Input() hasHeader = false;
  @Input() hasFooter = false;

  get cardClasses(): string {
    const classes = ['card'];

    if (this.raised) classes.push('card--raised');
    if (this.interactive) classes.push('card--interactive');
    if (this.highlight) classes.push('card--highlight');
    if (this.compact) classes.push('card--compact');

    return classes.join(' ');
  }
}
