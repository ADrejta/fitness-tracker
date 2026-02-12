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
  template: `
    <app-page-container title="Settings" subtitle="Customize your experience">
      <!-- Units Section -->
      <section class="settings-section">
        <h2 class="settings-section__title">Units</h2>
        <app-card>
          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Weight Unit</span>
              <span class="setting-row__description">Used for exercises and body weight</span>
            </div>
            <div class="setting-row__control">
              <select
                [value]="settingsService.weightUnit()"
                (change)="setWeightUnit($event)"
                class="setting-select"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lbs">Pounds (lbs)</option>
              </select>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Measurement Unit</span>
              <span class="setting-row__description">Used for body measurements</span>
            </div>
            <div class="setting-row__control">
              <select
                [value]="settingsService.measurementUnit()"
                (change)="setMeasurementUnit($event)"
                class="setting-select"
              >
                <option value="cm">Centimeters (cm)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>
          </div>
        </app-card>
      </section>

      <!-- Appearance Section -->
      <section class="settings-section">
        <h2 class="settings-section__title">Appearance</h2>
        <app-card>
          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Theme</span>
              <span class="setting-row__description">Choose your preferred color scheme</span>
            </div>
            <div class="setting-row__control">
              <select
                [value]="settingsService.theme()"
                (change)="setTheme($event)"
                class="setting-select"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </app-card>
      </section>

      <!-- Timer Section -->
      <section class="settings-section">
        <h2 class="settings-section__title">Rest Timer</h2>
        <app-card>
          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Default Rest Time</span>
              <span class="setting-row__description">Seconds between sets</span>
            </div>
            <div class="setting-row__control">
              <select
                [value]="settingsService.defaultRestTimer()"
                (change)="setDefaultRestTimer($event)"
                class="setting-select"
              >
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
                <option value="120">2 minutes</option>
                <option value="180">3 minutes</option>
              </select>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Auto-start Timer</span>
              <span class="setting-row__description">Start timer after completing a set</span>
            </div>
            <div class="setting-row__control">
              <label class="toggle">
                <input
                  type="checkbox"
                  [checked]="settingsService.settings().autoStartRestTimer"
                  (change)="toggleAutoStart($event)"
                />
                <span class="toggle__slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Vibrate on Timer End</span>
              <span class="setting-row__description">Vibrate when rest timer completes</span>
            </div>
            <div class="setting-row__control">
              <label class="toggle">
                <input
                  type="checkbox"
                  [checked]="settingsService.settings().vibrateOnTimerEnd"
                  (change)="toggleVibrate($event)"
                />
                <span class="toggle__slider"></span>
              </label>
            </div>
          </div>
        </app-card>
      </section>

      <!-- Plate Calculator Section -->
      <section class="settings-section">
        <h2 class="settings-section__title">Plate Calculator</h2>
        <app-card>
          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Default Barbell</span>
              <span class="setting-row__description">Used when opening the plate calculator</span>
            </div>
            <div class="setting-row__control">
              <select
                [value]="plateCalculatorSettings().selectedBarbell"
                (change)="setDefaultBarbell($event)"
                class="setting-select"
              >
                @for (preset of barbellPresets; track preset.type) {
                  <option [value]="preset.type">{{ preset.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Available Plates</span>
              <span class="setting-row__description">Configure which plates your gym has</span>
            </div>
            <div class="setting-row__control">
              <app-button variant="secondary" size="sm" (clicked)="showPlateConfigModal = true">Configure</app-button>
            </div>
          </div>
        </app-card>
      </section>

      <!-- Account Section -->
      <section class="settings-section">
        <h2 class="settings-section__title">Account</h2>
        <app-card>
          @if (!authService.isAuthenticated()) {
            <div class="setting-row">
              <div class="setting-row__info">
                <span class="setting-row__label">Sign In</span>
                <span class="setting-row__description">Sign in to sync your data across devices</span>
              </div>
              <div class="setting-row__control">
                <app-button variant="primary" size="sm" (clicked)="goToLogin()">Sign In</app-button>
              </div>
            </div>
          } @else {
            <div class="setting-row">
              <div class="setting-row__info">
                <span class="setting-row__label">{{ authService.user()?.email }}</span>
                <span class="setting-row__description">Signed in</span>
              </div>
              <div class="setting-row__control">
                <app-button variant="secondary" size="sm" (clicked)="authService.logout()">Sign Out</app-button>
              </div>
            </div>
          }
        </app-card>
      </section>

      <!-- Data Section -->
      <section class="settings-section">
        <h2 class="settings-section__title">Data</h2>
        <app-card>
          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Export Data</span>
              <span class="setting-row__description">Download all your data as JSON</span>
            </div>
            <div class="setting-row__control">
              <app-button variant="secondary" size="sm" (clicked)="exportData()">Export</app-button>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-row__info">
              <span class="setting-row__label">Import Data</span>
              <span class="setting-row__description">Restore data from a JSON file</span>
            </div>
            <div class="setting-row__control">
              <input
                type="file"
                accept=".json"
                (change)="importData($event)"
                class="file-input"
                #fileInput
              />
              <app-button variant="secondary" size="sm" (clicked)="fileInput.click()">Import</app-button>
            </div>
          </div>

          <div class="setting-row setting-row--danger">
            <div class="setting-row__info">
              <span class="setting-row__label">Clear All Data</span>
              <span class="setting-row__description">Delete all workouts, templates, and settings</span>
            </div>
            <div class="setting-row__control">
              <app-button variant="danger" size="sm" (clicked)="showClearModal = true">Clear</app-button>
            </div>
          </div>
        </app-card>
      </section>

      <!-- Storage Info -->
      <section class="settings-section">
        <div class="storage-info">
          <span>Storage used: {{ formatStorageSize(storageSize.used) }} / {{ formatStorageSize(storageSize.available) }}</span>
        </div>
      </section>

      <!-- Clear Data Modal -->
      <app-modal
        [isOpen]="showClearModal"
        title="Clear All Data?"
        [showFooter]="true"
        size="sm"
        (closed)="showClearModal = false"
      >
        <p>This will permanently delete all your workouts, templates, body measurements, and settings. This action cannot be undone.</p>
        <div modal-footer>
          <app-button variant="ghost" (clicked)="showClearModal = false">Cancel</app-button>
          <app-button variant="danger" (clicked)="clearAllData()">Clear All Data</app-button>
        </div>
      </app-modal>

      <!-- Plate Configuration Modal -->
      <app-modal
        [isOpen]="showPlateConfigModal"
        title="Configure Available Plates"
        [showFooter]="true"
        size="md"
        (closed)="showPlateConfigModal = false"
      >
        <div class="plate-config">
          <p class="plate-config__description">
            Select the plates available at your gym. Only selected plates will be used in calculations.
          </p>

          <div class="plate-config__section">
            <h4 class="plate-config__title">{{ settingsService.weightUnit() === 'kg' ? 'Kilogram Plates' : 'Pound Plates' }}</h4>
            <div class="plate-config__grid">
              @for (plate of currentPlates(); track plate.weight) {
                <label class="plate-config__item">
                  <input
                    type="checkbox"
                    [checked]="plate.available"
                    (change)="togglePlate(plate.weight, $event)"
                  />
                  <span class="plate-config__weight">{{ plate.weight }} {{ settingsService.weightUnit() }}</span>
                </label>
              }
            </div>
          </div>

          <div class="plate-config__actions">
            <app-button variant="ghost" size="sm" (clicked)="selectAllPlates()">Select All</app-button>
            <app-button variant="ghost" size="sm" (clicked)="resetPlates()">Reset to Defaults</app-button>
          </div>
        </div>
        <div modal-footer>
          <app-button variant="primary" (clicked)="showPlateConfigModal = false">Done</app-button>
        </div>
      </app-modal>
    </app-page-container>
  `,
  styles: [`
    .settings-section {
      margin-bottom: var(--spacing-xl);

      &__title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--spacing-sm);
      }
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) 0;
      border-bottom: 1px solid var(--color-border-light);

      &:last-child {
        border-bottom: none;
      }

      &--danger {
        .setting-row__label {
          color: var(--color-danger-600);
        }
      }

      &__info {
        flex: 1;
        margin-right: var(--spacing-md);
      }

      &__label {
        display: block;
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        margin-bottom: 2px;
      }

      &__description {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__control {
        flex-shrink: 0;
      }
    }

    .setting-select {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
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

    .toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;

      input {
        opacity: 0;
        width: 0;
        height: 0;

        &:checked + .toggle__slider {
          background: var(--color-primary-600);

          &::before {
            transform: translateX(20px);
          }
        }
      }

      &__slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: var(--color-gray-300);
        border-radius: var(--radius-full);
        transition: all var(--transition-fast);

        &::before {
          content: '';
          position: absolute;
          height: 20px;
          width: 20px;
          left: 2px;
          bottom: 2px;
          background: white;
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }
      }
    }

    .file-input {
      display: none;
    }

    .storage-info {
      text-align: center;
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
    }

    .plate-config {
      &__description {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-lg);
      }

      &__section {
        margin-bottom: var(--spacing-lg);
      }

      &__title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin-bottom: var(--spacing-md);
      }

      &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: var(--spacing-sm);
      }

      &__item {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          border-color: var(--color-primary-300);
        }

        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--color-primary-600);
        }
      }

      &__weight {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      &__actions {
        display: flex;
        gap: var(--spacing-sm);
        padding-top: var(--spacing-md);
        border-top: 1px solid var(--color-border);
      }
    }
  `]
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
