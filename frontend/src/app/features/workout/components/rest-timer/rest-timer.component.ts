import { Component, Input, Output, EventEmitter, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../../core/services';

@Component({
    selector: 'app-rest-timer',
    imports: [CommonModule],
    templateUrl: './rest-timer.component.html',
    styleUrls: ['./rest-timer.component.scss']
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
