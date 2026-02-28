import { Component, inject, isDevMode } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { HeaderComponent, NavigationComponent } from './layout';
import { ToastContainerComponent } from './shared/components';

@Component({
    standalone: true,
    selector: 'app-root',
    imports: [RouterOutlet, HeaderComponent, NavigationComponent, ToastContainerComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private swUpdate = inject(SwUpdate, { optional: true });

  constructor() {
    if (!isDevMode() && this.swUpdate?.isEnabled) {
      // When a new version is available, reload immediately so users
      // always get the latest build without a manual cache clear.
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          this.swUpdate!.activateUpdate().then(() => window.location.reload());
        }
      });

      // Also check for an update on every app launch.
      this.swUpdate.checkForUpdate();
    }
  }
}
