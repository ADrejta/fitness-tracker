import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  WeightUnit,
  MeasurementUnit,
  Theme,
  PlateCalculatorSettings,
  BARBELL_PRESETS,
} from '../models';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

const SETTINGS_KEY = 'settings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private authService = inject(AuthService);

  private _settings = signal<UserSettings>(this.loadSettings());

  readonly settings = this._settings.asReadonly();

  readonly weightUnit = computed(() => this._settings().weightUnit);
  readonly measurementUnit = computed(() => this._settings().measurementUnit);
  readonly theme = computed(() => this._settings().theme);
  readonly defaultRestTimer = computed(() => this._settings().defaultRestTimer);
  readonly plateCalculatorSettings = computed(() => this._settings().plateCalculator);

  constructor() {
    // Auto-save settings when they change
    effect(() => {
      const settings = this._settings();
      this.storage.set(SETTINGS_KEY, settings);
    });

    // Apply theme on init and changes
    effect(() => {
      this.applyTheme(this._settings().theme);
    });

    // Load from API if authenticated
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.loadFromApi();
      }
    });
  }

  private async loadFromApi(): Promise<void> {
    try {
      const settings = await firstValueFrom(
        this.http.get<UserSettings>(`${environment.apiUrl}/settings`)
      );
      this._settings.set(settings);
    } catch (error) {
      console.error('Failed to load settings from API:', error);
    }
  }

  private loadSettings(): UserSettings {
    const stored = this.storage.get<Partial<UserSettings>>(SETTINGS_KEY, {});
    // Merge with defaults to ensure all fields exist (handles schema migrations)
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      // Deep merge nested objects
      plateCalculator: {
        ...DEFAULT_SETTINGS.plateCalculator,
        ...(stored.plateCalculator || {}),
      },
    };
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    if (this.authService.isAuthenticated()) {
      try {
        const updated = await firstValueFrom(
          this.http.put<UserSettings>(`${environment.apiUrl}/settings`, updates)
        );
        this._settings.set(updated);
        return;
      } catch (error) {
        console.error('Failed to update settings via API:', error);
      }
    }

    this._settings.update((current) => ({
      ...current,
      ...updates,
    }));
  }

  setWeightUnit(unit: WeightUnit): void {
    this.updateSettings({ weightUnit: unit });
  }

  setMeasurementUnit(unit: MeasurementUnit): void {
    this.updateSettings({ measurementUnit: unit });
  }

  setTheme(theme: Theme): void {
    this.updateSettings({ theme });
  }

  setDefaultRestTimer(seconds: number): void {
    this.updateSettings({ defaultRestTimer: Math.max(0, seconds) });
  }

  getSelectedBarbellWeight(): number {
    const settings = this.plateCalculatorSettings();
    const unit = this.weightUnit();

    if (settings.selectedBarbell === 'custom') {
      return unit === 'kg' ? settings.customBarbellWeightKg : settings.customBarbellWeightLbs;
    }

    const preset = BARBELL_PRESETS.find(p => p.type === settings.selectedBarbell);
    if (!preset) return unit === 'kg' ? 20 : 45;

    return unit === 'kg' ? preset.weightKg : preset.weightLbs;
  }

  getAvailablePlates(): number[] {
    const settings = this.plateCalculatorSettings();
    const unit = this.weightUnit();
    const plates = unit === 'kg' ? settings.availablePlatesKg : settings.availablePlatesLbs;

    return plates
      .filter(p => p.available)
      .map(p => p.weight)
      .sort((a, b) => b - a);
  }

  updatePlateCalculatorSettings(updates: Partial<PlateCalculatorSettings>): void {
    const current = this.plateCalculatorSettings();
    this.updateSettings({
      plateCalculator: { ...current, ...updates },
    });
  }

  resetToDefaults(): void {
    this._settings.set(DEFAULT_SETTINGS);
    if (this.authService.isAuthenticated()) {
      this.updateSettings(DEFAULT_SETTINGS);
    }
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
    if (from === to) return value;
    if (from === 'kg' && to === 'lbs') return value * 2.20462;
    if (from === 'lbs' && to === 'kg') return value / 2.20462;
    return value;
  }

  convertMeasurement(
    value: number,
    from: MeasurementUnit,
    to: MeasurementUnit
  ): number {
    if (from === to) return value;
    if (from === 'cm' && to === 'in') return value / 2.54;
    if (from === 'in' && to === 'cm') return value * 2.54;
    return value;
  }

  formatWeight(value: number, includeUnit = true): string {
    const unit = this.weightUnit();
    const displayValue = this.roundToDecimal(value, 1);
    return includeUnit ? `${displayValue} ${unit}` : `${displayValue}`;
  }

  formatMeasurement(value: number, includeUnit = true): string {
    const unit = this.measurementUnit();
    const displayValue = this.roundToDecimal(value, 1);
    return includeUnit ? `${displayValue} ${unit}` : `${displayValue}`;
  }

  private roundToDecimal(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}
