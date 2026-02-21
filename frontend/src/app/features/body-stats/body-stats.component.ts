import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageContainerComponent } from '../../layout';
import { CardComponent, ButtonComponent, InputComponent, ModalComponent, EmptyStateComponent } from '../../shared/components';
import { BodyStatsService, SettingsService } from '../../core/services';
import { BodyMeasurement } from '../../core/models';
import { format, parseISO } from 'date-fns';

@Component({
    standalone: true,
    selector: 'app-body-stats',
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
    templateUrl: './body-stats.component.html',
    styleUrls: ['./body-stats.component.scss']
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
