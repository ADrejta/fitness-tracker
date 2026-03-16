import {
  Directive,
  ElementRef,
  EventEmitter,
  OnInit,
  OnDestroy,
  Output,
  Renderer2,
  NgZone,
  inject,
} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appPullToRefresh]',
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  @Output() refresh = new EventEmitter<void>();

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private zone = inject(NgZone);

  private indicator!: HTMLElement;
  private spinnerEl!: HTMLElement;
  private textEl!: HTMLElement;

  private startY = 0;
  private currentY = 0;
  private pulling = false;
  private refreshing = false;

  private readonly threshold = 60;
  private readonly maxPull = 100;

  private removeTouchStart: (() => void) | null = null;
  private removeTouchMove: (() => void) | null = null;
  private removeTouchEnd: (() => void) | null = null;

  ngOnInit(): void {
    this.createIndicator();
    this.zone.runOutsideAngular(() => {
      this.bindTouchEvents();
    });
  }

  ngOnDestroy(): void {
    this.removeTouchStart?.();
    this.removeTouchMove?.();
    this.removeTouchEnd?.();
    this.indicator?.remove();
  }

  private createIndicator(): void {
    const host = this.el.nativeElement as HTMLElement;

    this.indicator = this.renderer.createElement('div');
    this.renderer.addClass(this.indicator, 'ptr-indicator');

    const inner = this.renderer.createElement('div');
    this.renderer.addClass(inner, 'ptr-indicator__inner');

    this.spinnerEl = this.renderer.createElement('div');
    this.renderer.addClass(this.spinnerEl, 'ptr-indicator__spinner');

    // Arrow SVG
    this.spinnerEl.innerHTML = `
      <svg class="ptr-indicator__arrow" width="20" height="20" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="7 13 12 18 17 13"></polyline>
        <polyline points="7 6 12 11 17 6"></polyline>
      </svg>
      <svg class="ptr-indicator__loading" width="20" height="20" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
    `;

    this.textEl = this.renderer.createElement('span');
    this.renderer.addClass(this.textEl, 'ptr-indicator__text');
    this.textEl.textContent = 'Pull to refresh';

    this.renderer.appendChild(inner, this.spinnerEl);
    this.renderer.appendChild(inner, this.textEl);
    this.renderer.appendChild(this.indicator, inner);

    // Insert before first child of host
    if (host.firstChild) {
      this.renderer.insertBefore(host, this.indicator, host.firstChild);
    } else {
      this.renderer.appendChild(host, this.indicator);
    }
  }

  private bindTouchEvents(): void {
    const host = this.el.nativeElement as HTMLElement;

    this.removeTouchStart = this.renderer.listen(host, 'touchstart', (e: TouchEvent) => {
      this.onTouchStart(e);
    });

    this.removeTouchMove = this.renderer.listen(host, 'touchmove', (e: TouchEvent) => {
      this.onTouchMove(e);
    });

    this.removeTouchEnd = this.renderer.listen(host, 'touchend', () => {
      this.onTouchEnd();
    });
  }

  private onTouchStart(e: TouchEvent): void {
    if (this.refreshing) return;

    // Only activate when scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    this.startY = e.touches[0].clientY;
    this.pulling = true;
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.pulling || this.refreshing) return;

    this.currentY = e.touches[0].clientY;
    const delta = this.currentY - this.startY;

    if (delta < 0) {
      this.resetIndicator();
      return;
    }

    // Dampen the pull distance for a natural feel
    const pullDistance = Math.min(delta * 0.5, this.maxPull);

    if (pullDistance > 5) {
      // Prevent default scrolling only while actively pulling down
      e.preventDefault();
    }

    this.updateIndicator(pullDistance);
  }

  private onTouchEnd(): void {
    if (!this.pulling || this.refreshing) return;

    const delta = this.currentY - this.startY;
    const pullDistance = Math.min(delta * 0.5, this.maxPull);

    if (pullDistance >= this.threshold) {
      this.startRefreshing();
    } else {
      this.resetIndicator();
    }

    this.pulling = false;
  }

  private updateIndicator(distance: number): void {
    const progress = Math.min(distance / this.threshold, 1);

    this.indicator.style.height = `${distance}px`;
    this.indicator.style.opacity = `${Math.min(progress, 1)}`;
    this.indicator.classList.toggle('ptr-indicator--ready', progress >= 1);
    this.indicator.classList.remove('ptr-indicator--refreshing');

    // Rotate the arrow based on pull progress
    const arrow = this.indicator.querySelector('.ptr-indicator__arrow') as HTMLElement;
    if (arrow) {
      const rotation = progress >= 1 ? 180 : progress * 180;
      arrow.style.transform = `rotate(${rotation}deg)`;
    }

    this.textEl.textContent = progress >= 1 ? 'Release to refresh' : 'Pull to refresh';
  }

  private startRefreshing(): void {
    this.refreshing = true;
    this.indicator.style.height = `${this.threshold}px`;
    this.indicator.style.opacity = '1';
    this.indicator.classList.remove('ptr-indicator--ready');
    this.indicator.classList.add('ptr-indicator--refreshing');
    this.textEl.textContent = 'Refreshing...';

    this.zone.run(() => {
      this.refresh.emit();
    });

    // Auto-complete after a reasonable timeout in case the caller doesn't call completeRefresh
    setTimeout(() => {
      this.completeRefresh();
    }, 3000);
  }

  completeRefresh(): void {
    if (!this.refreshing) return;
    this.refreshing = false;
    this.resetIndicator();
  }

  private resetIndicator(): void {
    this.indicator.style.height = '0';
    this.indicator.style.opacity = '0';
    this.indicator.classList.remove('ptr-indicator--ready', 'ptr-indicator--refreshing');
    this.textEl.textContent = 'Pull to refresh';
  }
}
