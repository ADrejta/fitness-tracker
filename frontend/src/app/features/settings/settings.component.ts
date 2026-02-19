import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, ButtonComponent, ModalComponent } from '../../shared/components';
import { SettingsService, StorageService, AuthService } from '../../core/services';
import {
  WeightUnit,
  MeasurementUnit,
  Theme,
  BARBELL_PRESETS,
  BarbellType,
  PlateConfig,
  DEFAULT_PLATES_KG,
  DEFAULT_PLATES_LBS,
} from '../../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageContainerComponent,
    CardComponent,
    ButtonComponent,
    ModalComponent
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  settingsService = inject(SettingsService);
  storageService = inject(StorageService);
  authService = inject(AuthService);
  private router = inject(Router);

  showClearModal = false;
  showPlateConfigModal = false;
  storageSize = this.storageService.getStorageSize();

  barbellPresets = BARBELL_PRESETS;
  plateCalculatorSettings = computed(() => this.settingsService.plateCalculatorSettings());

  currentPlates = computed(() => {
    const settings = this.plateCalculatorSettings();
    return this.settingsService.weightUnit() === 'kg'
      ? settings.availablePlatesKg
      : settings.availablePlatesLbs;
  });

  setWeightUnit(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as WeightUnit;
    this.settingsService.setWeightUnit(value);
  }

  setMeasurementUnit(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MeasurementUnit;
    this.settingsService.setMeasurementUnit(value);
  }

  setTheme(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Theme;
    this.settingsService.setTheme(value);
  }

  setDefaultRestTimer(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.settingsService.setDefaultRestTimer(value);
  }

  toggleAutoStart(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.settingsService.updateSettings({ autoStartRestTimer: checked });
  }

  toggleVibrate(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.settingsService.updateSettings({ vibrateOnTimerEnd: checked });
  }

  toggleCompactMode(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.settingsService.setCompactMode(checked);
  }

  setDefaultBarbell(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as BarbellType;
    this.settingsService.updatePlateCalculatorSettings({ selectedBarbell: value });
  }

  togglePlate(weight: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const settings = this.plateCalculatorSettings();
    const isKg = this.settingsService.weightUnit() === 'kg';
    const plates = isKg ? [...settings.availablePlatesKg] : [...settings.availablePlatesLbs];

    const plateIndex = plates.findIndex(p => p.weight === weight);
    if (plateIndex !== -1) {
      plates[plateIndex] = { ...plates[plateIndex], available: checked };

      if (isKg) {
        this.settingsService.updatePlateCalculatorSettings({ availablePlatesKg: plates });
      } else {
        this.settingsService.updatePlateCalculatorSettings({ availablePlatesLbs: plates });
      }
    }
  }

  selectAllPlates(): void {
    const settings = this.plateCalculatorSettings();
    const isKg = this.settingsService.weightUnit() === 'kg';
    const plates = isKg ? settings.availablePlatesKg : settings.availablePlatesLbs;
    const updatedPlates = plates.map(p => ({ ...p, available: true }));

    if (isKg) {
      this.settingsService.updatePlateCalculatorSettings({ availablePlatesKg: updatedPlates });
    } else {
      this.settingsService.updatePlateCalculatorSettings({ availablePlatesLbs: updatedPlates });
    }
  }

  resetPlates(): void {
    const isKg = this.settingsService.weightUnit() === 'kg';

    if (isKg) {
      this.settingsService.updatePlateCalculatorSettings({
        availablePlatesKg: DEFAULT_PLATES_KG.map(p => ({ ...p })),
      });
    } else {
      this.settingsService.updatePlateCalculatorSettings({
        availablePlatesLbs: DEFAULT_PLATES_LBS.map(p => ({ ...p })),
      });
    }
  }

  exportData(): void {
    const data = this.storageService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (this.storageService.importData(content)) {
        window.location.reload();
      }
    };
    reader.readAsText(file);
  }

  clearAllData(): void {
    this.storageService.clear();
    this.settingsService.resetToDefaults();
    this.showClearModal = false;
    window.location.reload();
  }

  formatStorageSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
