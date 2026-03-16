import { Component, inject, isDevMode, OnDestroy, NgZone } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { HeaderComponent, NavigationComponent } from './layout';
import { ToastContainerComponent } from './shared/components';

/** Ordered list of main tab routes eligible for swipe navigation. */
const SWIPEABLE_TABS = ['/', '/history', '/statistics', '/exercises'];
const SWIPE_THRESHOLD = 80;

/**
 * Threshold (in pixels) for viewport height shrink that indicates the
 * soft keyboard has opened. Typically keyboards are >150 px tall.
 */
const KEYBOARD_HEIGHT_THRESHOLD = 150;

@Component({
    standalone: true,
    selector: 'app-root',
    imports: [RouterOutlet, HeaderComponent, NavigationComponent, ToastContainerComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  private swUpdate = inject(SwUpdate, { optional: true });
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private touchStartX = 0;
  private touchStartY = 0;
  private touchMoveX = 0;
  private touchMoveY = 0;

  /** Keyboard-aware layout: stored handler reference for cleanup. */
  private viewportResizeHandler: (() => void) | null = null;
  private initialViewportHeight = 0;

  constructor() {
    if (!isDevMode() && this.swUpdate?.isEnabled) {
      // When a new version is available, reload immediately so users
      // always get the latest build without a manual cache clear.
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          this.swUpdate!.activateUpdate().then(() => window.location.reload());
        }
      });

      // Also check for an update on every app launch.
      this.swUpdate.checkForUpdate();
    }

    this.initKeyboardAwareLayout();
  }

  ngOnDestroy(): void {
    if (this.viewportResizeHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.viewportResizeHandler);
    }
  }

  /**
   * Uses the visualViewport API to detect soft keyboard open/close.
   * When the viewport shrinks (keyboard opens) and an input/textarea is
   * focused, scrolls it into view so it isn't covered by the keyboard.
   */
  private initKeyboardAwareLayout(): void {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    this.initialViewportHeight = window.visualViewport.height;

    this.viewportResizeHandler = () => {
      const vp = window.visualViewport!;
      const heightDiff = this.initialViewportHeight - vp.height;

      // Keyboard opened: viewport shrank significantly
      if (heightDiff > KEYBOARD_HEIGHT_THRESHOLD) {
        const focused = document.activeElement as HTMLElement | null;
        if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.tagName === 'SELECT')) {
          // Run outside Angular zone to avoid unnecessary change detection
          this.ngZone.runOutsideAngular(() => {
            // Small delay to let the viewport settle after keyboard animation
            setTimeout(() => {
              focused.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 100);
          });
        }
      } else if (heightDiff < 50) {
        // Keyboard closed — update the baseline height in case of orientation change
        this.initialViewportHeight = vp.height;
      }
    };

    // Listen outside Angular zone to avoid triggering change detection on every resize
    this.ngZone.runOutsideAngular(() => {
      window.visualViewport!.addEventListener('resize', this.viewportResizeHandler!);
    });
  }

  onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchMoveX = touch.clientX;
    this.touchMoveY = touch.clientY;
  }

  onTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchMoveX = touch.clientX;
    this.touchMoveY = touch.clientY;
  }

  onTouchEnd(_event: TouchEvent): void {
    const deltaX = this.touchMoveX - this.touchStartX;
    const deltaY = this.touchMoveY - this.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Only trigger on primarily horizontal swipes that exceed the threshold
    if (absDeltaX < SWIPE_THRESHOLD || absDeltaX < absDeltaY) {
      return;
    }

    // Determine current tab index
    const currentUrl = this.router.url.split('?')[0];
    const currentIndex = SWIPEABLE_TABS.indexOf(currentUrl);
    if (currentIndex === -1) {
      // Not on a swipeable tab (e.g. workout, settings, sub-page) — do nothing
      return;
    }

    // Swipe left (negative deltaX) → next tab, swipe right (positive) → previous tab
    const targetIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= SWIPEABLE_TABS.length) {
      return;
    }

    this.router.navigate([SWIPEABLE_TABS[targetIndex]]);
  }
}
