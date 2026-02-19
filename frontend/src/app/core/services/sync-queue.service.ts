import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpBackend, HttpRequest, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';

export interface SyncQueueItem {
  id: string;
  method: string;
  url: string;
  body: unknown;
  queuedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class SyncQueueService {
  private storage = inject(StorageService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private httpBackend = inject(HttpBackend);

  private _items = signal<SyncQueueItem[]>(this.storage.get<SyncQueueItem[]>('syncQueue', []));

  readonly pendingCount = computed(() => this._items().length);
  readonly hasPending = computed(() => this._items().length > 0);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.replay());
      if (navigator.onLine && this.hasPending()) {
        this.replay();
      }
    }
  }

  enqueue(item: Omit<SyncQueueItem, 'id' | 'queuedAt'>): void {
    const entry: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
    };
    this._items.update((current) => [...current, entry]);
    this.persist();
  }

  private remove(id: string): void {
    this._items.update((current) => current.filter((item) => item.id !== id));
    this.persist();
  }

  private persist(): void {
    this.storage.set('syncQueue', this._items());
  }

  async replay(): Promise<void> {
    const snapshot = [...this._items()];
    if (snapshot.length === 0) return;

    const token = this.auth.getAccessToken();
    let successCount = 0;

    for (const item of snapshot) {
      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        });

        const req = new HttpRequest(item.method, item.url, item.body ?? null, { headers });
        await firstValueFrom(this.httpBackend.handle(req));
        this.remove(item.id);
        successCount++;
      } catch (err: unknown) {
        const status = (err as { status?: number }).status ?? 0;
        if (status >= 400 && status < 500) {
          // 4xx: stale / conflict — discard
          this.remove(item.id);
        }
        // 5xx / 0: keep for next attempt
      }
    }

    if (successCount > 0) {
      this.toast.success(`${successCount} action${successCount === 1 ? '' : 's'} synced`);
    }
  }
}
