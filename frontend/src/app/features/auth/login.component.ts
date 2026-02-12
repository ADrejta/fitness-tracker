import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Welcome Back</h1>
        <p class="subtitle">Sign in to continue tracking your workouts</p>

        @if (error()) {
          <div class="error-message">{{ error() }}</div>
        }

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              required
              email
              placeholder="Enter your email"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="password"
              required
              minlength="6"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            class="btn-primary"
            [disabled]="isLoading() || !loginForm.valid"
          >
            {{ isLoading() ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Sign up</a></p>
          <p class="guest-link">
            <a (click)="continueAsGuest()">Continue as guest</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: var(--bg-primary);
      }

      .auth-card {
        width: 100%;
        max-width: 400px;
        padding: 2rem;
        background: var(--bg-secondary);
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
        text-align: center;
        color: var(--text-primary);
      }

      .subtitle {
        margin: 0 0 1.5rem;
        text-align: center;
        color: var(--text-secondary);
      }

      .error-message {
        padding: 0.75rem;
        margin-bottom: 1rem;
        background: var(--error-bg, #fee);
        color: var(--error-text, #c00);
        border-radius: 8px;
        text-align: center;
      }

      .form-group {
        margin-bottom: 1rem;
      }

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--text-primary);
      }

      input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 1rem;
        background: var(--bg-primary);
        color: var(--text-primary);
        box-sizing: border-box;
      }

      input:focus {
        outline: none;
        border-color: var(--primary-color);
      }

      .btn-primary {
        width: 100%;
        padding: 0.875rem;
        margin-top: 0.5rem;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }

      .btn-primary:hover:not(:disabled) {
        opacity: 0.9;
      }

      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .auth-footer {
        margin-top: 1.5rem;
        text-align: center;
      }

      .auth-footer p {
        margin: 0.5rem 0;
        color: var(--text-secondary);
      }

      .auth-footer a {
        color: var(--primary-color);
        text-decoration: none;
        cursor: pointer;
      }

      .auth-footer a:hover {
        text-decoration: underline;
      }

      .guest-link {
        margin-top: 1rem !important;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
      }
    `,
  ],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal<string | null>(null);
  isLoading = this.authService.isLoading;

  onSubmit(): void {
    this.error.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Invalid email or password');
      },
    });
  }

  continueAsGuest(): void {
    this.router.navigate(['/']);
  }
}
