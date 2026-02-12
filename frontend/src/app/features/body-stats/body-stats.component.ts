import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageContainerComponent } from '../../layout';
import { CardComponent, ButtonComponent, InputComponent, ModalComponent, EmptyStateComponent } from '../../shared/components';
import { BodyStatsService, SettingsService } from '../../core/services';
import { BodyMeasurement } from '../../core/models';
import { format, parseISO } from 'date-fns';

@Component({
  selector: 'app-body-stats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageContainerComponent,
    CardComponent,
    ButtonComponent,
    InputComponent,
    ModalComponent,
    EmptyStateComponent
  ],
  template: `
    <app-page-container title="Body Stats" subtitle="Track your body measurements">
      <!-- Add Measurement Button -->
      <app-button [fullWidth]="true" (clicked)="showAddModal = true" class="add-btn">
        <span class="add-btn-content">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Measurement
        </span>
      </app-button>

      @if (bodyStatsService.sortedMeasurements().length > 0) {
        <!-- Latest Stats -->
        <app-card class="latest-stats">
          <h3 class="section-title">Latest Measurements</h3>
          @if (bodyStatsService.latestMeasurement(); as latest) {
            <div class="stats-grid">
              @if (latest.weight) {
                <div class="stat-item">
                  <span class="stat-item__value">{{ latest.weight }}</span>
                  <span class="stat-item__label">Weight ({{ settingsService.weightUnit() }})</span>
                </div>
              }
              @if (latest.bodyFatPercentage) {
                <div class="stat-item">
                  <span class="stat-item__value">{{ latest.bodyFatPercentage }}%</span>
                  <span class="stat-item__label">Body Fat</span>
                </div>
              }
              @if (latest.chest) {
                <div class="stat-item">
                  <span class="stat-item__value">{{ latest.chest }}</span>
                  <span class="stat-item__label">Chest ({{ settingsService.measurementUnit() }})</span>
                </div>
              }
              @if (latest.waist) {
                <div class="stat-item">
                  <span class="stat-item__value">{{ latest.waist }}</span>
                  <span class="stat-item__label">Waist ({{ settingsService.measurementUnit() }})</span>
                </div>
              }
            </div>
            <p class="latest-date">Last updated: {{ formatDate(latest.date) }}</p>
          }
        </app-card>

        <!-- Weight Change -->
        @if (bodyStatsService.getWeightChange(); as change) {
          <app-card>
            <div class="weight-change">
              <span class="weight-change__label">Weight Change</span>
              <div class="weight-change__value" [class.weight-change__value--positive]="change.absolute > 0" [class.weight-change__value--negative]="change.absolute < 0">
                {{ change.absolute > 0 ? '+' : '' }}{{ change.absolute }} {{ settingsService.weightUnit() }}
                ({{ change.percentage > 0 ? '+' : '' }}{{ change.percentage }}%)
              </div>
            </div>
          </app-card>
        }

        <!-- History -->
        <div class="section">
          <h3 class="section-title">History</h3>
          <div class="history-list">
            @for (measurement of bodyStatsService.sortedMeasurements(); track measurement.id) {
              <app-card [compact]="true" [interactive]="true" (click)="editMeasurement(measurement)">
                <div class="measurement-item">
                  <div class="measurement-item__date">{{ formatDate(measurement.date) }}</div>
                  <div class="measurement-item__stats">
                    @if (measurement.weight) {
                      <span>{{ measurement.weight }} {{ settingsService.weightUnit() }}</span>
                    }
                    @if (measurement.bodyFatPercentage) {
                      <span>{{ measurement.bodyFatPercentage }}% BF</span>
                    }
                  </div>
                </div>
              </app-card>
            }
          </div>
        </div>
      } @else {
        <app-empty-state
          title="No Measurements"
          description="Start tracking your body measurements to monitor your progress."
        >
          <div empty-icon>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 20v-6"></path>
              <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
              <path d="M12 4v4"></path>
            </svg>
          </div>
        </app-empty-state>
      }

      <!-- Add/Edit Modal -->
      <app-modal
        [isOpen]="showAddModal"
        [title]="editingMeasurement ? 'Edit Measurement' : 'Add Measurement'"
        [showFooter]="true"
        size="lg"
        (closed)="closeModal()"
      >
        <div class="form-grid">
          <app-input
            label="Date"
            type="text"
            [value]="formData.date"
            (valueChange)="formData.date = $event.toString()"
            placeholder="YYYY-MM-DD"
          />
          <app-input
            label="Weight"
            type="number"
            [suffix]="settingsService.weightUnit()"
            [value]="formData.weight"
            (valueChange)="formData.weight = +$event"
          />
          <app-input
            label="Body Fat %"
            type="number"
            suffix="%"
            [value]="formData.bodyFatPercentage"
            (valueChange)="formData.bodyFatPercentage = +$event"
          />
          <app-input
            label="Chest"
            type="number"
            [suffix]="settingsService.measurementUnit()"
            [value]="formData.chest"
            (valueChange)="formData.chest = +$event"
          />
          <app-input
            label="Waist"
            type="number"
            [suffix]="settingsService.measurementUnit()"
            [value]="formData.waist"
            (valueChange)="formData.waist = +$event"
          />
          <app-input
            label="Hips"
            type="number"
            [suffix]="settingsService.measurementUnit()"
            [value]="formData.hips"
            (valueChange)="formData.hips = +$event"
          />
        </div>
        <div modal-footer>
          @if (editingMeasurement) {
            <app-button variant="danger" (clicked)="deleteMeasurement()">Delete</app-button>
          }
          <app-button variant="ghost" (clicked)="closeModal()">Cancel</app-button>
          <app-button (clicked)="saveMeasurement()">Save</app-button>
        </div>
      </app-modal>
    </app-page-container>
  `,
  styles: [`
    .add-btn {
      margin-bottom: var(--spacing-lg);
    }

    .add-btn-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .section-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      margin: 0 0 var(--spacing-md);
    }

    .latest-stats {
      margin-bottom: var(--spacing-lg);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);

      @media (min-width: 480px) {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .stat-item {
      text-align: center;

      &__value {
        display: block;
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
      }

      &__label {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }
    }

    .latest-date {
      margin-top: var(--spacing-md);
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
      text-align: center;
    }

    .weight-change {
      display: flex;
      align-items: center;
      justify-content: space-between;

      &__label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__value {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);

        &--positive {
          color: var(--color-success-600);
        }

        &--negative {
          color: var(--color-danger-600);
        }
      }
    }

    .section {
      margin-top: var(--spacing-lg);
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .measurement-item {
      display: flex;
      justify-content: space-between;
      align-items: center;

      &__date {
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
      }

      &__stats {
        display: flex;
        gap: var(--spacing-md);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);
    }
  `]
})
export class BodyStatsComponent {
  bodyStatsService = inject(BodyStatsService);
  settingsService = inject(SettingsService);

  showAddModal = false;
  editingMeasurement: BodyMeasurement | null = null;

  formData = {
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: 0,
    bodyFatPercentage: 0,
    chest: 0,
    waist: 0,
    hips: 0
  };

  formatDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM d, yyyy');
  }

  editMeasurement(measurement: BodyMeasurement): void {
    this.editingMeasurement = measurement;
    this.formData = {
      date: format(parseISO(measurement.date), 'yyyy-MM-dd'),
      weight: measurement.weight || 0,
      bodyFatPercentage: measurement.bodyFatPercentage || 0,
      chest: measurement.chest || 0,
      waist: measurement.waist || 0,
      hips: measurement.hips || 0
    };
    this.showAddModal = true;
  }

  closeModal(): void {
    this.showAddModal = false;
    this.editingMeasurement = null;
    this.resetForm();
  }

  resetForm(): void {
    this.formData = {
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: 0,
      bodyFatPercentage: 0,
      chest: 0,
      waist: 0,
      hips: 0
    };
  }

  saveMeasurement(): void {
    const measurement: Omit<BodyMeasurement, 'id'> = {
      date: this.formData.date,
      weight: this.formData.weight || undefined,
      bodyFatPercentage: this.formData.bodyFatPercentage || undefined,
      chest: this.formData.chest || undefined,
      waist: this.formData.waist || undefined,
      hips: this.formData.hips || undefined
    };

    if (this.editingMeasurement) {
      this.bodyStatsService.updateMeasurement(this.editingMeasurement.id, measurement);
    } else {
      this.bodyStatsService.addMeasurement(measurement);
    }

    this.closeModal();
  }

  deleteMeasurement(): void {
    if (this.editingMeasurement) {
      this.bodyStatsService.deleteMeasurement(this.editingMeasurement.id);
      this.closeModal();
    }
  }
}
