import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent, NavigationComponent } from './layout';
import { ToastContainerComponent } from './shared/components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, NavigationComponent, ToastContainerComponent],
  template: `
    <app-header />
    <router-outlet />
    <app-navigation />
    <app-toast-container />
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
    }
  `]
})
export class AppComponent {}
