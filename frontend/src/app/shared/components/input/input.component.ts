import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
    standalone: true,
    selector: 'app-input',
    imports: [CommonModule, FormsModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => InputComponent),
            multi: true
        }
    ],
    templateUrl: './input.component.html',
    styleUrls: ['./input.component.scss']
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
