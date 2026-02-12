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
  template: `
    <app-page-container title="Plate Calculator" subtitle="Calculate plates needed for your target weight">
      <!-- Input Section -->
      <app-card>
        <div class="calculator-input">
          <div class="input-group">
            <label class="input-label">Target Weight</label>
            <div class="weight-input-row">
              <input
                type="number"
                class="weight-input"
                [ngModel]="targetWeight()"
                (ngModelChange)="targetWeight.set($event)"
                placeholder="0"
                min="0"
                step="2.5"
              />
              <span class="weight-unit">{{ settingsService.weightUnit() }}</span>
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Barbell Type</label>
            <select
              class="barbell-select"
              [ngModel]="selectedBarbell()"
              (ngModelChange)="selectedBarbell.set($event)"
            >
              @for (preset of barbellPresets; track preset.type) {
                <option [value]="preset.type">
                  {{ preset.name }} ({{ getBarbellWeight(preset.type) }} {{ settingsService.weightUnit() }})
                </option>
              }
            </select>
          </div>

          <!-- Quick Add Buttons -->
          <div class="quick-buttons">
            <label class="input-label">Quick Add</label>
            <div class="quick-buttons-row">
              @for (amount of quickAddAmounts(); track amount) {
                <button class="quick-btn" (click)="addWeight(amount)">
                  +{{ amount }}
                </button>
              }
              <button class="quick-btn quick-btn--clear" (click)="targetWeight.set(currentBarbellWeight())">
                Bar Only
              </button>
            </div>
          </div>
        </div>
      </app-card>

      <!-- Visual Barbell Display -->
      <app-card>
        <div class="barbell-visual">
          <h3 class="section-title">Barbell Setup</h3>

          @if (!calculation().isAchievable && targetWeight() > 0) {
            <div class="warning-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>
                Cannot achieve exactly {{ targetWeight() }} {{ settingsService.weightUnit() }} with available plates.
                @if (calculation().remainder > 0) {
                  Missing {{ calculation().remainder }} {{ settingsService.weightUnit() }}.
                }
              </span>
            </div>
          }

          <div class="barbell-container">
            <!-- Left Plates -->
            <div class="plates-side plates-side--left">
              @for (plate of calculation().perSide; track plate.weight) {
                @for (i of getPlateArray(plate.count); track i) {
                  <div
                    class="plate"
                    [style.height.px]="getPlateHeight(plate.weight)"
                    [style.background]="getPlateColor(plate.weight)"
                    [attr.title]="plate.weight + ' ' + settingsService.weightUnit()"
                  >
                    <span class="plate-label">{{ plate.weight }}</span>
                  </div>
                }
              }
            </div>

            <!-- Barbell Bar -->
            <div class="barbell-bar">
              <div class="barbell-sleeve barbell-sleeve--left"></div>
              <div class="barbell-grip"></div>
              <div class="barbell-sleeve barbell-sleeve--right"></div>
            </div>

            <!-- Right Plates (mirrored) -->
            <div class="plates-side plates-side--right">
              @for (plate of calculation().perSide; track plate.weight) {
                @for (i of getPlateArray(plate.count); track i) {
                  <div
                    class="plate"
                    [style.height.px]="getPlateHeight(plate.weight)"
                    [style.background]="getPlateColor(plate.weight)"
                    [attr.title]="plate.weight + ' ' + settingsService.weightUnit()"
                  >
                    <span class="plate-label">{{ plate.weight }}</span>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Weight Breakdown -->
          <div class="weight-breakdown">
            <div class="breakdown-item">
              <span class="breakdown-label">Bar</span>
              <span class="breakdown-value">{{ currentBarbellWeight() }} {{ settingsService.weightUnit() }}</span>
            </div>
            @if (calculation().perSide.length > 0) {
              <div class="breakdown-item">
                <span class="breakdown-label">Plates (per side)</span>
                <span class="breakdown-value">{{ weightPerSide() }} {{ settingsService.weightUnit() }}</span>
              </div>
              <div class="breakdown-item breakdown-item--total">
                <span class="breakdown-label">Total</span>
                <span class="breakdown-value">{{ achievableWeight() }} {{ settingsService.weightUnit() }}</span>
              </div>
            }
          </div>
        </div>
      </app-card>

      <!-- Plate List -->
      <app-card>
        <h3 class="section-title">Plates Per Side</h3>
        @if (calculation().perSide.length === 0) {
          <div class="empty-state">
            @if (targetWeight() <= currentBarbellWeight()) {
              <p>Bar only - no plates needed</p>
            } @else {
              <p>Enter a target weight above</p>
            }
          </div>
        } @else {
          <div class="plate-list">
            @for (plate of calculation().perSide; track plate.weight) {
              <div class="plate-list-item">
                <div
                  class="plate-color-dot"
                  [style.background]="getPlateColor(plate.weight)"
                ></div>
                <span class="plate-weight">{{ plate.weight }} {{ settingsService.weightUnit() }}</span>
                <span class="plate-count">× {{ plate.count }}</span>
                <span class="plate-total">= {{ plate.weight * plate.count }} {{ settingsService.weightUnit() }}</span>
              </div>
            }
          </div>
          <div class="total-plates">
            <span>Total plates needed: {{ totalPlateCount() }} ({{ totalPlateCount() * 2 }} total)</span>
          </div>
        }
      </app-card>

      <!-- Common Weights Reference -->
      <app-card>
        <h3 class="section-title">Common Weights</h3>
        <div class="common-weights">
          @for (weight of commonWeights(); track weight) {
            <button
              class="common-weight-btn"
              [class.active]="targetWeight() === weight"
              (click)="targetWeight.set(weight)"
            >
              {{ weight }} {{ settingsService.weightUnit() }}
            </button>
          }
        </div>
      </app-card>
    </app-page-container>
  `,
  styles: [`
    .calculator-input {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .input-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .weight-input-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .weight-input {
      flex: 1;
      padding: var(--spacing-md);
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
      background: var(--color-background-secondary);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-align: center;

      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
      }

      &::placeholder {
        color: var(--color-text-tertiary);
      }
    }

    .weight-unit {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-secondary);
      min-width: 40px;
    }

    .barbell-select {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-base);
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
      }
    }

    .quick-buttons-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .quick-btn {
      padding: var(--spacing-xs) var(--spacing-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
      background: var(--color-background-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary-50);
        border-color: var(--color-primary-300);
      }

      &--clear {
        color: var(--color-text-secondary);
      }
    }

    .section-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin: 0 0 var(--spacing-md);
    }

    .warning-banner {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-warning-50);
      border: 1px solid var(--color-warning-200);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-md);
      font-size: var(--font-size-sm);
      color: var(--color-warning-700);

      svg {
        flex-shrink: 0;
      }
    }

    .barbell-visual {
      padding: var(--spacing-sm) 0;
    }

    .barbell-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: var(--spacing-xl) var(--spacing-md);
      background: var(--color-background-secondary);
      border-radius: var(--radius-lg);
      overflow-x: auto;
      min-height: 180px;
    }

    .plates-side {
      display: flex;
      align-items: center;
      gap: 3px;

      &--left {
        flex-direction: row-reverse;
      }
    }

    .plate {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      min-width: 20px;
      border-radius: 4px;
      color: white;
      font-size: 10px;
      font-weight: var(--font-weight-bold);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.2),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                  0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .plate-label {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
    }

    .barbell-bar {
      display: flex;
      align-items: center;
    }

    .barbell-sleeve {
      width: 30px;
      height: 28px;
      background: linear-gradient(180deg, #d1d5db 0%, #9ca3af 50%, #d1d5db 100%);
      border-radius: 2px;

      &--left {
        border-radius: 2px 0 0 2px;
      }

      &--right {
        border-radius: 0 2px 2px 0;
      }
    }

    .barbell-grip {
      width: 120px;
      height: 20px;
      background: linear-gradient(180deg,
        #9ca3af 0%,
        #6b7280 20%,
        #4b5563 40%,
        #6b7280 60%,
        #9ca3af 80%,
        #6b7280 100%
      );
      background-size: 100% 8px;
    }

    .weight-breakdown {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--color-border-light);
    }

    .breakdown-item {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-sm);

      &--total {
        padding-top: var(--spacing-xs);
        border-top: 1px solid var(--color-border-light);
        font-weight: var(--font-weight-semibold);
      }
    }

    .breakdown-label {
      color: var(--color-text-secondary);
    }

    .breakdown-value {
      color: var(--color-text);
      font-weight: var(--font-weight-medium);
    }

    .empty-state {
      text-align: center;
      padding: var(--spacing-lg);
      color: var(--color-text-tertiary);
    }

    .plate-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .plate-list-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-background-secondary);
      border-radius: var(--radius-md);
    }

    .plate-color-dot {
      width: 16px;
      height: 16px;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }

    .plate-weight {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      min-width: 60px;
    }

    .plate-count {
      color: var(--color-text-secondary);
      min-width: 40px;
    }

    .plate-total {
      color: var(--color-text-secondary);
      margin-left: auto;
    }

    .total-plates {
      margin-top: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--color-border-light);
      text-align: center;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .common-weights {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
    }

    .common-weight-btn {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
      background: var(--color-background-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary-50);
        border-color: var(--color-primary-300);
      }

      &.active {
        background: var(--color-primary-100);
        border-color: var(--color-primary-500);
        color: var(--color-primary-700);
      }
    }
  `]
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
