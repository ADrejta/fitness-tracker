import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="input-wrapper" [class.input-wrapper--error]="error" [class.input-wrapper--disabled]="disabled">
      @if (label) {
        <label class="input-label" [for]="inputId">
          {{ label }}
          @if (required) {
            <span class="input-label__required">*</span>
          }
        </label>
      }
      <div class="input-container">
        @if (prefix) {
          <span class="input-prefix">{{ prefix }}</span>
        }
        <input
          [id]="inputId"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readonly"
          [min]="min"
          [max]="max"
          [step]="step"
          [class]="inputClasses"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (keydown.enter)="onEnter($event)"
        />
        @if (suffix) {
          <span class="input-suffix">{{ suffix }}</span>
        }
        @if (clearable && value) {
          <button type="button" class="input-clear" (click)="clear()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        }
      </div>
      @if (error) {
        <span class="input-error">{{ error }}</span>
      }
      @if (hint && !error) {
        <span class="input-hint">{{ hint }}</span>
      }
    </div>
  `,
  styles: [`
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      &--disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    }

    .input-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);

      &__required {
        color: var(--color-danger-500);
        margin-left: 2px;
      }
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-base);
      font-family: var(--font-family);
      line-height: var(--line-height-normal);
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);

      &::placeholder {
        color: var(--color-text-tertiary);
      }

      &:hover:not(:disabled):not(:focus) {
        border-color: var(--color-gray-400);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
      }

      &--sm {
        padding: 0.375rem 0.75rem;
        font-size: var(--font-size-sm);
      }

      &--lg {
        padding: 0.75rem 1rem;
        font-size: var(--font-size-lg);
      }

      &--has-prefix {
        padding-left: 2.5rem;
      }

      &--has-suffix {
        padding-right: 2.5rem;
      }

      &--clearable {
        padding-right: 2.5rem;
      }

      &--error {
        border-color: var(--color-danger-500);

        &:focus {
          box-shadow: 0 0 0 3px var(--color-danger-100);
        }
      }

      // Remove number input spinners
      &[type="number"] {
        -moz-appearance: textfield;

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }
    }

    .input-prefix,
    .input-suffix {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      pointer-events: none;
    }

    .input-prefix {
      left: var(--spacing-md);
    }

    .input-suffix {
      right: var(--spacing-md);
    }

    .input-clear {
      position: absolute;
      right: var(--spacing-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-full);
      color: var(--color-text-tertiary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-background-secondary);
        color: var(--color-text-secondary);
      }
    }

    .input-error {
      font-size: var(--font-size-sm);
      color: var(--color-danger-600);
    }

    .input-hint {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
    }
  `]
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'number' | 'email' | 'password' | 'tel' | 'search' = 'text';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() error = '';
  @Input() hint = '';
  @Input() prefix = '';
  @Input() suffix = '';
  @Input() clearable = false;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number;
  @Input() inputId = `input-${Math.random().toString(36).substring(2, 9)}`;

  @Output() valueChange = new EventEmitter<string | number>();
  @Output() enterPressed = new EventEmitter<void>();

  private _value: string | number = '';

  @Input()
  get value(): string | number {
    return this._value;
  }
  set value(val: string | number) {
    this._value = val ?? '';
  }

  private onChange: (value: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  get inputClasses(): string {
    const classes = ['input'];

    if (this.size !== 'md') classes.push(`input--${this.size}`);
    if (this.prefix) classes.push('input--has-prefix');
    if (this.suffix) classes.push('input--has-suffix');
    if (this.clearable && this.value) classes.push('input--clearable');
    if (this.error) classes.push('input--error');

    return classes.join(' ');
  }

  writeValue(value: string | number): void {
    this._value = value ?? '';
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    let val: string | number = target.value;

    if (this.type === 'number' && val !== '') {
      val = parseFloat(val);
      if (isNaN(val)) val = '';
    }

    this._value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }

  onBlur(): void {
    this.onTouched();
  }

  onEnter(event: Event): void {
    event.preventDefault();
    this.enterPressed.emit();
  }

  clear(): void {
    this._value = '';
    this.onChange('');
    this.valueChange.emit('');
  }
}
