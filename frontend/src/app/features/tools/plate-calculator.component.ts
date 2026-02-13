import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageContainerComponent } from '../../layout';
import { CardComponent, ButtonComponent } from '../../shared/components';
import { SettingsService } from '../../core/services';
import { BARBELL_PRESETS, BarbellType } from '../../core/models';
import { calculatePlates, PlateCalculation, PlateCount } from '../../shared/utils';

@Component({
  selector: 'app-plate-calculator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageContainerComponent,
    CardComponent,
    ButtonComponent
  ],
  templateUrl: './plate-calculator.component.html',
  styleUrls: ['./plate-calculator.component.scss']
})
export class PlateCalculatorComponent {
  settingsService = inject(SettingsService);

  targetWeight = signal(0);
  selectedBarbell = signal<BarbellType>('olympic');

  barbellPresets = BARBELL_PRESETS;

  // Quick add amounts based on unit
  quickAddAmounts = computed(() => {
    return this.settingsService.weightUnit() === 'kg'
      ? [2.5, 5, 10, 20]
      : [5, 10, 25, 45];
  });

  // Common weights for quick selection
  commonWeights = computed(() => {
    return this.settingsService.weightUnit() === 'kg'
      ? [20, 40, 60, 80, 100, 120, 140, 160, 180, 200]
      : [45, 95, 135, 185, 225, 275, 315, 365, 405, 495];
  });

  currentBarbellWeight = computed(() => {
    const preset = BARBELL_PRESETS.find(p => p.type === this.selectedBarbell());
    if (!preset) return 20;
    return this.settingsService.weightUnit() === 'kg' ? preset.weightKg : preset.weightLbs;
  });

  calculation = computed((): PlateCalculation => {
    const weight = this.targetWeight();
    const unit = this.settingsService.weightUnit();
    const plateSettings = this.settingsService.plateCalculatorSettings();

    // Get available plates from settings
    const platesConfig = unit === 'kg'
      ? plateSettings.availablePlatesKg
      : plateSettings.availablePlatesLbs;

    const availablePlates = platesConfig
      .filter(p => p.available)
      .map(p => p.weight);

    return calculatePlates(weight, unit, {
      barbellWeight: this.currentBarbellWeight(),
      availablePlates
    });
  });

  weightPerSide = computed(() => {
    const calc = this.calculation();
    return calc.perSide.reduce((sum, p) => sum + p.weight * p.count, 0);
  });

  achievableWeight = computed(() => {
    return this.currentBarbellWeight() + this.weightPerSide() * 2;
  });

  totalPlateCount = computed(() => {
    return this.calculation().perSide.reduce((sum, p) => sum + p.count, 0);
  });

  getBarbellWeight(type: BarbellType): number {
    const preset = BARBELL_PRESETS.find(p => p.type === type);
    if (!preset) return 20;
    return this.settingsService.weightUnit() === 'kg' ? preset.weightKg : preset.weightLbs;
  }

  addWeight(amount: number): void {
    this.targetWeight.update(w => w + amount);
  }

  getPlateArray(count: number): number[] {
    return Array(count).fill(0).map((_, i) => i);
  }

  getPlateHeight(weight: number): number {
    const unit = this.settingsService.weightUnit();
    // Scale plate height based on weight
    if (unit === 'kg') {
      if (weight >= 25) return 140;
      if (weight >= 20) return 130;
      if (weight >= 15) return 110;
      if (weight >= 10) return 90;
      if (weight >= 5) return 70;
      if (weight >= 2.5) return 55;
      return 45;
    } else {
      if (weight >= 45) return 140;
      if (weight >= 35) return 120;
      if (weight >= 25) return 100;
      if (weight >= 10) return 75;
      if (weight >= 5) return 60;
      return 45;
    }
  }

  getPlateColor(weight: number): string {
    const unit = this.settingsService.weightUnit();
    // Standard Olympic plate colors
    if (unit === 'kg') {
      if (weight >= 25) return '#dc2626'; // Red
      if (weight >= 20) return '#2563eb'; // Blue
      if (weight >= 15) return '#eab308'; // Yellow
      if (weight >= 10) return '#16a34a'; // Green
      if (weight >= 5) return '#ffffff'; // White
      if (weight >= 2.5) return '#dc2626'; // Red (small)
      if (weight >= 1.25) return '#6b7280'; // Gray
      return '#9ca3af';
    } else {
      if (weight >= 45) return '#2563eb'; // Blue
      if (weight >= 35) return '#eab308'; // Yellow
      if (weight >= 25) return '#16a34a'; // Green
      if (weight >= 10) return '#ffffff'; // White
      if (weight >= 5) return '#dc2626'; // Red
      if (weight >= 2.5) return '#6b7280'; // Gray
      return '#9ca3af';
    }
  }
}
