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
  template: `
    <div class="plate-calculator">
      <div class="plate-calculator__header">
        <span class="plate-calculator__title">Plate Calculator</span>
        <span class="plate-calculator__target">{{ weight() }} {{ unit() }}</span>
      </div>

      <div class="plate-calculator__barbell-selector">
        <label class="plate-calculator__label">Barbell</label>
        <select
          class="plate-calculator__select"
          [ngModel]="selectedBarbell()"
          (ngModelChange)="onBarbellChange($event)"
        >
          @for (preset of barbellPresets; track preset.type) {
            <option [value]="preset.type">
              {{ preset.name }} ({{ unit() === 'kg' ? preset.weightKg : preset.weightLbs }} {{ unit() }})
            </option>
          }
        </select>
      </div>

      @if (selectedBarbell() === 'custom') {
        <div class="plate-calculator__custom-weight">
          <label class="plate-calculator__label">Custom bar weight ({{ unit() }})</label>
          <input
            type="number"
            class="plate-calculator__input"
            [ngModel]="customBarbellWeight()"
            (ngModelChange)="onCustomWeightChange($event)"
            min="0"
            step="0.5"
          />
        </div>
      }

      @if (calculation().perSide.length === 0 && calculation().isAchievable) {
        <div class="plate-calculator__empty">
          Just the bar ({{ barWeight() }} {{ unit() }})
        </div>
      } @else if (calculation().perSide.length === 0) {
        <div class="plate-calculator__empty">
          Weight is less than bar ({{ barWeight() }} {{ unit() }})
        </div>
      } @else {
        <div class="plate-calculator__visual">
          <!-- Bar visualization -->
          <div class="plate-calculator__bar"></div>

          <!-- Plates on one side -->
          <div class="plate-calculator__plates">
            @for (plate of calculation().perSide; track plate.weight) {
              @for (i of getRange(plate.count); track i) {
                <div
                  class="plate-calculator__plate"
                  [style.background-color]="getPlateColor(plate.weight)"
                  [style.height.px]="getPlateHeight(plate.weight)"
                >
                  {{ plate.weight }}
                </div>
              }
            }
          </div>
        </div>

        <div class="plate-calculator__breakdown">
          <div class="plate-calculator__row plate-calculator__row--header">
            <span>Plate</span>
            <span>Per Side</span>
            <span>Total</span>
          </div>
          @for (plate of calculation().perSide; track plate.weight) {
            <div class="plate-calculator__row">
              <span class="plate-calculator__plate-weight">
                <span
                  class="plate-calculator__color-dot"
                  [style.background-color]="getPlateColor(plate.weight)"
                ></span>
                {{ plate.weight }} {{ unit() }}
              </span>
              <span>{{ plate.count }}</span>
              <span>{{ plate.count * 2 }}</span>
            </div>
          }
          <div class="plate-calculator__row plate-calculator__row--total">
            <span>Bar</span>
            <span></span>
            <span>{{ barWeight() }} {{ unit() }}</span>
          </div>
        </div>

        @if (!calculation().isAchievable) {
          <div class="plate-calculator__warning">
            Cannot achieve exact weight. Off by {{ calculation().remainder }} {{ unit() }}
          </div>
        }
      }

      <button class="plate-calculator__settings-link" (click)="openSettings.emit()">
        Configure available plates
      </button>
    </div>
  `,
  styles: [`
    .plate-calculator {
      min-width: 240px;
      padding: var(--spacing-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
    }

    .plate-calculator__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
      padding-bottom: var(--spacing-sm);
      border-bottom: 1px solid var(--color-border);
    }

    .plate-calculator__title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }

    .plate-calculator__target {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-primary);
    }

    .plate-calculator__barbell-selector,
    .plate-calculator__custom-weight {
      margin-bottom: var(--spacing-md);
    }

    .plate-calculator__label {
      display: block;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-xs);
    }

    .plate-calculator__select,
    .plate-calculator__input {
      width: 100%;
      padding: var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--color-text);
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
      }
    }

    .plate-calculator__input {
      cursor: text;
    }

    .plate-calculator__empty {
      text-align: center;
      padding: var(--spacing-md);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .plate-calculator__visual {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: var(--spacing-md);
      background: var(--color-background-secondary);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-md);
    }

    .plate-calculator__bar {
      width: 8px;
      height: 60px;
      background: var(--color-text-secondary);
      border-radius: 2px;
    }

    .plate-calculator__plates {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .plate-calculator__plate {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      min-height: 30px;
      font-size: 10px;
      font-weight: var(--font-weight-bold);
      color: white;
      border-radius: 3px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .plate-calculator__breakdown {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .plate-calculator__row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: var(--spacing-md);
      font-size: var(--font-size-sm);
      padding: var(--spacing-xs) 0;
    }

    .plate-calculator__row--header {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-secondary);
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: var(--spacing-xs);
    }

    .plate-calculator__row--total {
      border-top: 1px solid var(--color-border);
      padding-top: var(--spacing-xs);
      font-weight: var(--font-weight-semibold);
    }

    .plate-calculator__plate-weight {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .plate-calculator__color-dot {
      width: 10px;
      height: 10px;
      border-radius: var(--radius-full);
    }

    .plate-calculator__warning {
      margin-top: var(--spacing-sm);
      padding: var(--spacing-sm);
      font-size: var(--font-size-xs);
      color: var(--color-warning);
      background: rgba(234, 179, 8, 0.1);
      border-radius: var(--radius-sm);
      text-align: center;
    }

    .plate-calculator__settings-link {
      display: block;
      width: 100%;
      margin-top: var(--spacing-md);
      padding: var(--spacing-sm);
      font-size: var(--font-size-xs);
      color: var(--color-primary);
      background: transparent;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: center;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary-50);
        border-color: var(--color-primary-200);
      }
    }
  `]
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
