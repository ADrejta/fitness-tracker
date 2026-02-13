import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent, NavigationComponent } from './layout';
import { ToastContainerComponent } from './shared/components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, NavigationComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {}
