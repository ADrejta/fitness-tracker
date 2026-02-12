import { Component, Input, Output, EventEmitter, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../../core/services';

@Component({
  selector: 'app-rest-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible()) {
      <div class="rest-timer" [class.rest-timer--minimized]="isMinimized()">
        @if (isMinimized()) {
          <button class="rest-timer__expand" (click)="isMinimized.set(false)">
            <span class="rest-timer__mini-time">{{ formatTime(remainingSeconds()) }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        } @else {
          <div class="rest-timer__content">
            <div class="rest-timer__header">
              <span class="rest-timer__label">Rest Timer</span>
              <button class="rest-timer__minimize" (click)="isMinimized.set(true)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <div class="rest-timer__display">
              <svg class="rest-timer__progress" viewBox="0 0 100 100">
                <circle class="rest-timer__track" cx="50" cy="50" r="45" />
                <circle
                  class="rest-timer__bar"
                  cx="50" cy="50" r="45"
                  [style.strokeDasharray]="circumference"
                  [style.strokeDashoffset]="progressOffset()"
                />
              </svg>
              <span class="rest-timer__time">{{ formatTime(remainingSeconds()) }}</span>
            </div>

            <div class="rest-timer__presets">
              @for (preset of presets; track preset) {
                <button
                  class="rest-timer__preset"
                  [class.rest-timer__preset--active]="duration() === preset"
                  (click)="setDuration(preset)"
                >
                  {{ formatPreset(preset) }}
                </button>
              }
            </div>

            <div class="rest-timer__actions">
              @if (isRunning()) {
                <button class="rest-timer__btn rest-timer__btn--pause" (click)="pause()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                </button>
              } @else {
                <button class="rest-timer__btn rest-timer__btn--play" (click)="start()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
              }
              <button class="rest-timer__btn rest-timer__btn--skip" (click)="skip()">
                Skip
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .rest-timer {
      position: fixed;
      bottom: calc(var(--nav-height) + var(--spacing-md) + env(safe-area-inset-bottom, 0));
      left: 50%;
      transform: translateX(-50%);
      z-index: var(--z-sticky);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      overflow: hidden;

      @media (min-width: 1024px) {
        bottom: var(--spacing-lg);
      }

      &--minimized {
        border-radius: var(--radius-full);
      }
    }

    .rest-timer__expand {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text);
    }

    .rest-timer__mini-time {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      font-variant-numeric: tabular-nums;
    }

    .rest-timer__content {
      padding: var(--spacing-md);
      width: 280px;
    }

    .rest-timer__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .rest-timer__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
    }

    .rest-timer__minimize {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      background: none;
      border: none;
      color: var(--color-text-tertiary);
      cursor: pointer;

      &:hover {
        color: var(--color-text);
      }
    }

    .rest-timer__display {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      margin: 0 auto var(--spacing-md);
    }

    .rest-timer__progress {
      position: absolute;
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .rest-timer__track {
      fill: none;
      stroke: var(--color-gray-200);
      stroke-width: 6;
    }

    .rest-timer__bar {
      fill: none;
      stroke: var(--color-primary-500);
      stroke-width: 6;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.3s ease;
    }

    .rest-timer__time {
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-bold);
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
    }

    .rest-timer__presets {
      display: flex;
      justify-content: center;
      gap: var(--spacing-xs);
      margin-bottom: var(--spacing-md);
    }

    .rest-timer__preset {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      background: var(--color-background-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-background-tertiary);
      }

      &--active {
        background: var(--color-primary-100);
        border-color: var(--color-primary-300);
        color: var(--color-primary-700);
      }
    }

    .rest-timer__actions {
      display: flex;
      justify-content: center;
      gap: var(--spacing-sm);
    }

    .rest-timer__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      border: none;
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);

      &--play, &--pause {
        background: var(--color-primary-600);
        color: white;

        &:hover {
          background: var(--color-primary-700);
        }
      }

      &--skip {
        background: var(--color-background-secondary);
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-background-tertiary);
        }
      }
    }
  `]
})
export class RestTimerComponent implements OnDestroy {
  @Input() autoStart = true;

  @Output() timerComplete = new EventEmitter<void>();
  @Output() timerSkipped = new EventEmitter<void>();

  settingsService = inject(SettingsService);

  isVisible = signal(false);
  isMinimized = signal(false);
  isRunning = signal(false);
  duration = signal(90);
  remainingSeconds = signal(90);

  presets = [30, 60, 90, 120, 180];
  circumference = 2 * Math.PI * 45;

  private intervalId: number | null = null;

  progressOffset(): number {
    const progress = this.remainingSeconds() / this.duration();
    return this.circumference * (1 - progress);
  }

  show(autoStart = true): void {
    const defaultDuration = this.settingsService.defaultRestTimer();
    this.duration.set(defaultDuration);
    this.remainingSeconds.set(defaultDuration);
    this.isVisible.set(true);
    this.isMinimized.set(false);

    if (autoStart && this.settingsService.settings().autoStartRestTimer) {
      this.start();
    }
  }

  hide(): void {
    this.stop();
    this.isVisible.set(false);
  }

  start(): void {
    if (this.isRunning()) return;

    this.isRunning.set(true);
    this.intervalId = window.setInterval(() => {
      const remaining = this.remainingSeconds() - 1;
      this.remainingSeconds.set(remaining);

      if (remaining <= 0) {
        this.complete();
      }
    }, 1000);
  }

  pause(): void {
    this.isRunning.set(false);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  stop(): void {
    this.pause();
    this.remainingSeconds.set(this.duration());
  }

  skip(): void {
    this.hide();
    this.timerSkipped.emit();
  }

  setDuration(seconds: number): void {
    this.duration.set(seconds);
    this.remainingSeconds.set(seconds);
    if (this.isRunning()) {
      this.pause();
      this.start();
    }
  }

  private complete(): void {
    this.pause();

    // Vibrate if enabled
    if (this.settingsService.settings().vibrateOnTimerEnd && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    this.timerComplete.emit();
    this.hide();
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatPreset(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    return `${seconds / 60}m`;
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
