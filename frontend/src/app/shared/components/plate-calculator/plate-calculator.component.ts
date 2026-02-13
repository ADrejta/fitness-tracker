import { Component, Input, computed, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { calculatePlates, PlateCalculatorConfig } from '../../utils/plate-calculator';
import { SettingsService } from '../../../core/services';
import { BARBELL_PRESETS, BarbellType } from '../../../core/models';

// Plate colors for visual representation
const PLATE_COLORS: Record<number, string> = {
  // KG plates
  25: '#dc2626',   // Red
  20: '#dc2626',   // Red
  15: '#eab308',   // Yellow
  10: '#22c55e',   // Green
  5: '#3b82f6',    // Blue
  2.5: '#f97316',  // Orange
  1.25: '#6b7280', // Gray
  // LBS plates
  45: '#dc2626',   // Red
  35: '#eab308',   // Yellow
};

@Component({
  selector: 'app-plate-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plate-calculator.component.html',
  styleUrls: ['./plate-calculator.component.scss']
})
export class PlateCalculatorComponent {
  private settingsService = inject(SettingsService);

  @Input() set targetWeight(value: number) {
    this.weight.set(value);
  }
  @Input() set weightUnit(value: 'kg' | 'lbs') {
    this.unit.set(value);
  }

  openSettings = output<void>();

  weight = signal(0);
  unit = signal<'kg' | 'lbs'>('kg');

  barbellPresets = BARBELL_PRESETS;

  selectedBarbell = computed(() => this.settingsService.plateCalculatorSettings().selectedBarbell);

  customBarbellWeight = computed(() => {
    const settings = this.settingsService.plateCalculatorSettings();
    return this.unit() === 'kg' ? settings.customBarbellWeightKg : settings.customBarbellWeightLbs;
  });

  barWeight = computed(() => {
    const settings = this.settingsService.plateCalculatorSettings();
    const unit = this.unit();

    if (settings.selectedBarbell === 'custom') {
      return unit === 'kg' ? settings.customBarbellWeightKg : settings.customBarbellWeightLbs;
    }

    const preset = BARBELL_PRESETS.find(p => p.type === settings.selectedBarbell);
    if (!preset) return unit === 'kg' ? 20 : 45;

    return unit === 'kg' ? preset.weightKg : preset.weightLbs;
  });

  availablePlates = computed(() => {
    const settings = this.settingsService.plateCalculatorSettings();
    const unit = this.unit();
    const plates = unit === 'kg' ? settings.availablePlatesKg : settings.availablePlatesLbs;

    return plates
      .filter(p => p.available)
      .map(p => p.weight)
      .sort((a, b) => b - a);
  });

  config = computed((): PlateCalculatorConfig => ({
    barbellWeight: this.barWeight(),
    availablePlates: this.availablePlates(),
  }));

  calculation = computed(() => calculatePlates(this.weight(), this.unit(), this.config()));

  onBarbellChange(type: BarbellType): void {
    this.settingsService.updatePlateCalculatorSettings({ selectedBarbell: type });
  }

  onCustomWeightChange(weight: number): void {
    const unit = this.unit();
    if (unit === 'kg') {
      this.settingsService.updatePlateCalculatorSettings({ customBarbellWeightKg: weight });
    } else {
      this.settingsService.updatePlateCalculatorSettings({ customBarbellWeightLbs: weight });
    }
  }

  getPlateColor(weight: number): string {
    return PLATE_COLORS[weight] || '#6b7280';
  }

  getPlateHeight(weight: number): number {
    // Larger plates are taller
    const maxPlate = this.unit() === 'kg' ? 25 : 45;
    const minHeight = 30;
    const maxHeight = 60;
    const ratio = weight / maxPlate;
    return minHeight + (maxHeight - minHeight) * ratio;
  }

  getRange(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }
}
