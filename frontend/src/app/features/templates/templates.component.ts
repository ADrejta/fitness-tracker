import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageContainerComponent } from '../../layout';
import { CardComponent, ButtonComponent, BadgeComponent, EmptyStateComponent, ModalComponent, InputComponent } from '../../shared/components';
import { TemplateService, ExerciseService, ToastService } from '../../core/services';
import { WorkoutTemplate, TemplateExercise, TemplateSet, ExerciseTemplate } from '../../core/models';
import { ExercisePickerComponent } from '../workout/components/exercise-picker/exercise-picker.component';
import { format, parseISO } from 'date-fns';

interface EditableTemplateExercise extends TemplateExercise {
  isExpanded?: boolean;
  isFirstInSuperset?: boolean;
  isLastInSuperset?: boolean;
}

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageContainerComponent,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
    EmptyStateComponent,
    ModalComponent,
    InputComponent,
    ExercisePickerComponent
  ],
  template: `
    <app-page-container title="Templates" subtitle="Your saved workout routines">
      <!-- Create Button -->
      <div class="page-actions">
        <app-button (clicked)="openCreateModal()">
          <span class="create-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Template
          </span>
        </app-button>
      </div>

      @if (templateService.templates().length > 0) {
        <div class="templates-list">
          @for (template of templateService.sortedTemplates(); track template.id) {
            <app-card [interactive]="true">
              <div class="template-card">
                <div class="template-card__header">
                  <h3 class="template-card__name">{{ template.name }}</h3>
                  <button class="template-card__menu" (click)="$event.stopPropagation(); showMenu(template)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                </div>

                @if (template.description) {
                  <p class="template-card__description">{{ template.description }}</p>
                }

                <div class="template-card__meta">
                  <span>{{ template.exercises.length }} exercises</span>
                  @if (template.lastUsedAt) {
                    <span>Last used {{ formatDate(template.lastUsedAt) }}</span>
                  }
                </div>

                <div class="template-card__exercises">
                  @for (exercise of template.exercises.slice(0, 4); track exercise.id) {
                    <app-badge [size]="'sm'">{{ exercise.exerciseName }}</app-badge>
                  }
                  @if (template.exercises.length > 4) {
                    <app-badge [size]="'sm'" [variant]="'default'">+{{ template.exercises.length - 4 }}</app-badge>
                  }
                </div>

                <div class="template-card__actions">
                  <app-button [fullWidth]="true" (clicked)="$event.stopPropagation(); startWorkout(template)">
                    <span class="start-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                      Start Workout
                    </span>
                  </app-button>
                </div>
              </div>
            </app-card>
          }
        </div>
      } @else {
        <app-empty-state
          title="No Templates"
          description="Create a template to quickly start workouts with predefined exercises."
        >
          <div empty-icon>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
        </app-empty-state>
      }

      <!-- Create/Edit Template Modal -->
      <app-modal
        [isOpen]="showCreateModal"
        [title]="isEditing ? 'Edit Template' : 'Create Template'"
        [showFooter]="true"
        size="lg"
        (closed)="closeCreateModal()"
      >
        <div class="template-form">
          <div class="form-group">
            <label>Template Name</label>
            <app-input
              placeholder="e.g., Push Day, Leg Day"
              [(ngModel)]="templateName"
            />
          </div>

          <div class="form-group">
            <label>Description (optional)</label>
            <textarea
              class="form-textarea"
              placeholder="Describe this workout..."
              [(ngModel)]="templateDescription"
              rows="2"
            ></textarea>
          </div>

          <div class="exercises-section">
            <div class="exercises-header">
              <h4>Exercises</h4>
              <app-button variant="secondary" size="sm" (clicked)="showExercisePicker = true">
                <span class="add-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Exercise
                </span>
              </app-button>
            </div>

            @if (templateExercises().length > 0) {
              <div class="exercises-list">
                @for (exercise of groupedTemplateExercises(); track exercise.id; let i = $index) {
                  @if (exercise.isFirstInSuperset) {
                    <div class="superset-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 12h16M4 6h16M4 18h16"></path>
                      </svg>
                      Superset
                      <button class="superset-remove" (click)="$event.stopPropagation(); removeSupersetFromExercises(exercise.supersetId!)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  }
                  <div
                    class="exercise-card"
                    [class.in-superset]="exercise.supersetId"
                    [class.superset-first]="exercise.isFirstInSuperset"
                    [class.superset-last]="exercise.isLastInSuperset"
                    [class.selected-for-superset]="selectedForSuperset().includes(exercise.id)"
                  >
                    <div class="exercise-card__header" (click)="toggleExercise(exercise)">
                      <div class="exercise-card__info">
                        <input
                          type="checkbox"
                          class="superset-checkbox"
                          [checked]="selectedForSuperset().includes(exercise.id)"
                          [disabled]="!!exercise.supersetId"
                          (click)="$event.stopPropagation()"
                          (change)="toggleSupersetSelection(exercise.id)"
                        />
                        <span class="exercise-card__number">{{ i + 1 }}</span>
                        <div>
                          <h5 class="exercise-card__name">{{ exercise.exerciseName }}</h5>
                          <span class="exercise-card__sets">{{ exercise.sets.length }} sets</span>
                        </div>
                      </div>
                      <div class="exercise-card__actions">
                        <button
                          class="icon-btn icon-btn--move"
                          [disabled]="i === 0"
                          (click)="$event.stopPropagation(); moveExerciseUp(i)"
                          title="Move up"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="18 15 12 9 6 15"></polyline>
                          </svg>
                        </button>
                        <button
                          class="icon-btn icon-btn--move"
                          [disabled]="i === templateExercises().length - 1"
                          (click)="$event.stopPropagation(); moveExerciseDown(i)"
                          title="Move down"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                        <button class="icon-btn" (click)="$event.stopPropagation(); removeExercise(exercise.id)">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                          </svg>
                        </button>
                        <svg
                          class="chevron"
                          [class.chevron--open]="exercise.isExpanded"
                          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>

                    @if (exercise.isExpanded) {
                      <div class="exercise-card__sets">
                        @for (set of exercise.sets; track set.setNumber; let j = $index) {
                          <div class="set-row">
                            <span class="set-row__number">Set {{ set.setNumber }}</span>
                            <div class="set-row__inputs">
                              <div class="set-input">
                                <input
                                  type="number"
                                  [value]="set.targetReps"
                                  (change)="updateSetReps(exercise.id, j, $event)"
                                  min="1"
                                />
                                <span>reps</span>
                              </div>
                              <div class="set-input">
                                <input
                                  type="number"
                                  [value]="set.targetWeight || ''"
                                  (change)="updateSetWeight(exercise.id, j, $event)"
                                  placeholder="—"
                                  min="0"
                                  step="0.5"
                                />
                                <span>kg</span>
                              </div>
                            </div>
                            <button class="icon-btn icon-btn--sm" (click)="removeSet(exercise.id, j)">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        }
                        <button class="add-set-btn" (click)="addSet(exercise.id)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Add Set
                        </button>
                      </div>
                    }
                  </div>
                }

                @if (selectedForSuperset().length >= 2) {
                  <div class="superset-action">
                    <app-button variant="secondary" size="sm" (clicked)="createSupersetFromSelection()">
                      <span class="superset-btn-content">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M4 12h16M4 6h16M4 18h16"></path>
                        </svg>
                        Link as Superset
                      </span>
                    </app-button>
                    <app-button variant="ghost" size="sm" (clicked)="clearSupersetSelection()">Clear</app-button>
                  </div>
                }
              </div>
            } @else {
              <div class="exercises-empty">
                <p>No exercises added yet</p>
                <span>Click "Add Exercise" to get started</span>
              </div>
            }
          </div>
        </div>

        <div modal-footer>
          <app-button variant="ghost" (clicked)="closeCreateModal()">Cancel</app-button>
          <app-button
            [disabled]="!templateName || templateExercises().length === 0"
            (clicked)="saveTemplate()"
          >
            {{ isEditing ? 'Save Changes' : 'Create Template' }}
          </app-button>
        </div>
      </app-modal>

      <!-- Exercise Picker -->
      <app-exercise-picker
        [isOpen]="showExercisePicker"
        (closed)="showExercisePicker = false"
        (exerciseSelected)="addExerciseToTemplate($event)"
      />

      <!-- Template Menu Modal -->
      <app-modal
        [isOpen]="showMenuModal"
        [title]="selectedTemplate?.name || 'Template'"
        [showFooter]="true"
        size="sm"
        (closed)="closeMenu()"
      >
        <div class="menu-options">
          <button class="menu-option" (click)="editTemplate()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit template
          </button>
          <button class="menu-option" (click)="duplicateTemplate()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Duplicate template
          </button>
          <button class="menu-option menu-option--danger" (click)="showDeleteConfirm = true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
            </svg>
            Delete template
          </button>
        </div>
        <div modal-footer>
          <app-button variant="ghost" (clicked)="closeMenu()">Close</app-button>
        </div>
      </app-modal>

      <!-- Delete Confirmation -->
      <app-modal
        [isOpen]="showDeleteConfirm"
        title="Delete Template?"
        [showFooter]="true"
        size="sm"
        (closed)="showDeleteConfirm = false"
      >
        <p>Are you sure you want to delete "{{ selectedTemplate?.name }}"? This action cannot be undone.</p>
        <div modal-footer>
          <app-button variant="ghost" (clicked)="showDeleteConfirm = false">Cancel</app-button>
          <app-button variant="danger" (clicked)="deleteTemplate()">Delete</app-button>
        </div>
      </app-modal>
    </app-page-container>
  `,
  styles: [`
    .page-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--spacing-lg);
    }

    .create-btn, .start-btn, .add-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .templates-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .template-card {
      &__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: var(--spacing-sm);
      }

      &__name {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
        margin: 0;
      }

      &__menu {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        background: none;
        border: none;
        color: var(--color-text-secondary);
        cursor: pointer;

        &:hover {
          color: var(--color-text);
        }
      }

      &__description {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0 0 var(--spacing-sm);
      }

      &__meta {
        display: flex;
        gap: var(--spacing-md);
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
        margin-bottom: var(--spacing-md);
      }

      &__exercises {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-md);
      }

      &__actions {
        padding-top: var(--spacing-md);
        border-top: 1px solid var(--color-border-light);
      }
    }

    .template-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
      }
    }

    .form-textarea {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-base);
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      resize: vertical;

      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
      }
    }

    .exercises-section {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .exercises-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md);
      background: var(--color-background-secondary);
      border-bottom: 1px solid var(--color-border);

      h4 {
        margin: 0;
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
      }
    }

    .exercises-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .exercises-empty {
      padding: var(--spacing-xl);
      text-align: center;
      color: var(--color-text-secondary);

      p {
        margin: 0 0 var(--spacing-xs);
        font-weight: var(--font-weight-medium);
      }

      span {
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
      }
    }

    .superset-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      margin: var(--spacing-sm) var(--spacing-md) 0;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-primary-600);
      background: var(--color-primary-50);
      border-radius: var(--radius-md);
    }

    .superset-remove {
      margin-left: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--color-primary-600);
      cursor: pointer;
      opacity: 0.6;

      &:hover {
        opacity: 1;
        background: var(--color-primary-100);
      }
    }

    .superset-checkbox {
      width: 16px;
      height: 16px;
      margin-right: var(--spacing-xs);
      accent-color: var(--color-primary-600);
      cursor: pointer;

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }

    .superset-action {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-primary-50);
      border-top: 1px dashed var(--color-primary-200);
    }

    .superset-btn-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .exercise-card {
      border-bottom: 1px solid var(--color-border-light);

      &:last-child {
        border-bottom: none;
      }

      &.in-superset {
        margin-left: var(--spacing-sm);
        border-left: 3px solid var(--color-primary-400);
        background: var(--color-primary-50);

        &.superset-first {
          border-top-left-radius: var(--radius-md);
          margin-top: var(--spacing-xs);
        }

        &.superset-last {
          border-bottom-left-radius: var(--radius-md);
          margin-bottom: var(--spacing-xs);
        }
      }

      &.selected-for-superset {
        background: var(--color-primary-100);
      }

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-md);
        cursor: pointer;

        &:hover {
          background: var(--color-background-secondary);
        }
      }

      &__info {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
      }

      &__number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-primary-600);
        background: var(--color-primary-100);
        border-radius: var(--radius-full);
      }

      &__name {
        margin: 0;
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
      }

      &__sets {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &__actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }
    }

    .exercise-card__sets {
      padding: 0 var(--spacing-md) var(--spacing-md);
      padding-left: calc(var(--spacing-md) + 24px + var(--spacing-md));
    }

    .set-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--color-border-light);

      &:last-of-type {
        border-bottom: none;
      }

      &__number {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        min-width: 50px;
      }

      &__inputs {
        display: flex;
        gap: var(--spacing-md);
        flex: 1;
      }
    }

    .set-input {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);

      input {
        width: 60px;
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: var(--font-size-sm);
        text-align: center;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        color: var(--color-text);

        &:focus {
          outline: none;
          border-color: var(--color-primary-500);
        }
      }

      span {
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
      }
    }

    .add-set-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-top: var(--spacing-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--color-primary-600);
      background: none;
      border: none;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      cursor: pointer;

      &:hover {
        background: var(--color-background-tertiary);
        color: var(--color-danger-600);
      }

      &--sm {
        width: 24px;
        height: 24px;
      }

      &--move {
        width: 28px;
        height: 28px;

        &:hover {
          color: var(--color-primary-600);
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;

          &:hover {
            background: none;
            color: var(--color-text-secondary);
          }
        }
      }
    }

    .chevron {
      transition: transform var(--transition-fast);

      &--open {
        transform: rotate(180deg);
      }
    }

    .menu-options {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .menu-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      width: 100%;
      padding: var(--spacing-md);
      font-size: var(--font-size-base);
      color: var(--color-text);
      background: none;
      border: none;
      border-radius: var(--radius-lg);
      cursor: pointer;
      text-align: left;

      &:hover {
        background: var(--color-background-secondary);
      }

      &--danger {
        color: var(--color-danger-600);
      }
    }
  `]
})
export class TemplatesComponent {
  templateService = inject(TemplateService);
  exerciseService = inject(ExerciseService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  showMenuModal = false;
  showDeleteConfirm = false;
  showCreateModal = false;
  showExercisePicker = false;
  selectedTemplate: WorkoutTemplate | null = null;
  isEditing = false;
  editingTemplateId: string | null = null;

  // Form state
  templateName = '';
  templateDescription = '';
  templateExercises = signal<EditableTemplateExercise[]>([]);
  selectedForSuperset = signal<string[]>([]);

  // Computed property to add superset position info
  groupedTemplateExercises = computed((): EditableTemplateExercise[] => {
    const exercises = this.templateExercises();
    return exercises.map((exercise, index) => {
      if (!exercise.supersetId) {
        return { ...exercise, isFirstInSuperset: false, isLastInSuperset: false };
      }

      const sameSuperset = exercises.filter(e => e.supersetId === exercise.supersetId);
      const indexInSuperset = sameSuperset.findIndex(e => e.id === exercise.id);

      return {
        ...exercise,
        isFirstInSuperset: indexInSuperset === 0,
        isLastInSuperset: indexInSuperset === sameSuperset.length - 1,
      };
    });
  });

  formatDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM d');
  }

  // Menu actions
  showMenu(template: WorkoutTemplate): void {
    this.selectedTemplate = template;
    this.showMenuModal = true;
  }

  closeMenu(): void {
    this.showMenuModal = false;
    this.selectedTemplate = null;
  }

  startWorkout(template: WorkoutTemplate): void {
    this.templateService.startWorkoutFromTemplate(template.id);
    this.router.navigate(['/workout']);
  }

  duplicateTemplate(): void {
    if (this.selectedTemplate) {
      this.templateService.duplicateTemplate(this.selectedTemplate.id).subscribe();
      this.closeMenu();
    }
  }

  deleteTemplate(): void {
    if (this.selectedTemplate) {
      this.templateService.deleteTemplate(this.selectedTemplate.id).subscribe();
      this.showDeleteConfirm = false;
      this.closeMenu();
    }
  }

  // Create/Edit modal
  openCreateModal(): void {
    this.isEditing = false;
    this.templateName = '';
    this.templateDescription = '';
    this.templateExercises.set([]);
    this.showCreateModal = true;
  }

  editTemplate(): void {
    if (!this.selectedTemplate) return;

    this.isEditing = true;
    this.editingTemplateId = this.selectedTemplate.id;
    this.templateName = this.selectedTemplate.name;
    this.templateDescription = this.selectedTemplate.description || '';
    this.templateExercises.set(
      this.selectedTemplate.exercises.map(e => ({ ...e, isExpanded: false }))
    );
    this.closeMenu();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.templateName = '';
    this.templateDescription = '';
    this.templateExercises.set([]);
    this.isEditing = false;
    this.editingTemplateId = null;
  }

  addExerciseToTemplate(exercise: ExerciseTemplate): void {
    const newExercise: EditableTemplateExercise = {
      id: crypto.randomUUID(),
      exerciseTemplateId: exercise.id,
      exerciseName: exercise.name,
      sets: [
        { setNumber: 1, targetReps: 10, isWarmup: false },
        { setNumber: 2, targetReps: 10, isWarmup: false },
        { setNumber: 3, targetReps: 10, isWarmup: false }
      ],
      isExpanded: true
    };

    this.templateExercises.update(exercises => [...exercises, newExercise]);
    this.showExercisePicker = false;
  }

  removeExercise(exerciseId: string): void {
    this.templateExercises.update(exercises =>
      exercises.filter(e => e.id !== exerciseId)
    );
  }

  moveExerciseUp(index: number): void {
    if (index <= 0) return;
    this.templateExercises.update(exercises => {
      const newExercises = [...exercises];
      [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
      return newExercises;
    });
  }

  moveExerciseDown(index: number): void {
    const exercises = this.templateExercises();
    if (index >= exercises.length - 1) return;
    this.templateExercises.update(exercises => {
      const newExercises = [...exercises];
      [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
      return newExercises;
    });
  }

  toggleExercise(exercise: EditableTemplateExercise): void {
    this.templateExercises.update(exercises =>
      exercises.map(e =>
        e.id === exercise.id ? { ...e, isExpanded: !e.isExpanded } : e
      )
    );
  }

  addSet(exerciseId: string): void {
    this.templateExercises.update(exercises =>
      exercises.map(e => {
        if (e.id !== exerciseId) return e;
        const newSetNumber = e.sets.length + 1;
        const lastSet = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              setNumber: newSetNumber,
              targetReps: lastSet?.targetReps || 10,
              targetWeight: lastSet?.targetWeight,
              isWarmup: false
            }
          ]
        };
      })
    );
  }

  removeSet(exerciseId: string, setIndex: number): void {
    this.templateExercises.update(exercises =>
      exercises.map(e => {
        if (e.id !== exerciseId) return e;
        const newSets = e.sets
          .filter((_, i) => i !== setIndex)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...e, sets: newSets };
      })
    );
  }

  updateSetReps(exerciseId: string, setIndex: number, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10) || 10;
    this.templateExercises.update(exercises =>
      exercises.map(e => {
        if (e.id !== exerciseId) return e;
        const newSets = e.sets.map((s, i) =>
          i === setIndex ? { ...s, targetReps: value } : s
        );
        return { ...e, sets: newSets };
      })
    );
  }

  updateSetWeight(exerciseId: string, setIndex: number, event: Event): void {
    const inputValue = (event.target as HTMLInputElement).value;
    const value = inputValue ? parseFloat(inputValue) : undefined;
    this.templateExercises.update(exercises =>
      exercises.map(e => {
        if (e.id !== exerciseId) return e;
        const newSets = e.sets.map((s, i) =>
          i === setIndex ? { ...s, targetWeight: value } : s
        );
        return { ...e, sets: newSets };
      })
    );
  }

  saveTemplate(): void {
    // Map exercises to the format expected by the backend
    const exercises: TemplateExercise[] = this.templateExercises().map(e => ({
      id: e.id,
      exerciseTemplateId: e.exerciseTemplateId,
      exerciseName: e.exerciseName,
      sets: e.sets.map(s => ({
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        targetWeight: s.targetWeight,
        isWarmup: s.isWarmup
      })),
      notes: e.notes,
      supersetId: e.supersetId
    }));

    if (this.isEditing && this.editingTemplateId) {
      this.templateService.updateTemplate(this.editingTemplateId, {
        name: this.templateName,
        description: this.templateDescription || undefined,
        exercises
      }).subscribe({
        next: () => {
          this.toastService.success('Template updated successfully');
          this.closeCreateModal();
        },
        error: (err) => {
          console.error('Failed to update template:', err);
          this.toastService.error('Failed to update template. Please try again.');
        }
      });
    } else {
      this.templateService.createTemplate({
        name: this.templateName,
        description: this.templateDescription || undefined,
        exercises
      }).subscribe({
        next: () => {
          this.toastService.success('Template created successfully');
          this.closeCreateModal();
        },
        error: (err) => {
          console.error('Failed to create template:', err);
          this.toastService.error('Failed to create template. Please try again.');
        }
      });
    }
  }

  // Superset methods
  toggleSupersetSelection(exerciseId: string): void {
    const exercise = this.templateExercises().find(e => e.id === exerciseId);
    // Don't allow selecting exercises already in a superset
    if (exercise?.supersetId) return;

    this.selectedForSuperset.update(selected => {
      if (selected.includes(exerciseId)) {
        return selected.filter(id => id !== exerciseId);
      }
      return [...selected, exerciseId];
    });
  }

  clearSupersetSelection(): void {
    this.selectedForSuperset.set([]);
  }

  createSupersetFromSelection(): void {
    const exerciseIds = this.selectedForSuperset();
    if (exerciseIds.length < 2) return;

    const supersetId = crypto.randomUUID();

    this.templateExercises.update(exercises =>
      exercises.map(e =>
        exerciseIds.includes(e.id) ? { ...e, supersetId } : e
      )
    );

    this.clearSupersetSelection();
  }

  removeSupersetFromExercises(supersetId: string): void {
    this.templateExercises.update(exercises =>
      exercises.map(e =>
        e.supersetId === supersetId ? { ...e, supersetId: undefined } : e
      )
    );
  }
}
