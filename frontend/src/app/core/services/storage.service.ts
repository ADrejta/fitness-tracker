import { Injectable, signal, computed, effect } from '@angular/core';

const STORAGE_PREFIX = 'fitness_tracker_';

export interface StorageKeys {
  workouts: 'workouts';
  exercises: 'exercises';
  templates: 'templates';
  settings: 'settings';
  bodyMeasurements: 'bodyMeasurements';
  personalRecords: 'personalRecords';
  activeWorkout: 'activeWorkout';
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private getKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }

  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  }

  clear(): boolean {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  exportData(): string {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const cleanKey = key.replace(STORAGE_PREFIX, '');
        try {
          data[cleanKey] = JSON.parse(localStorage.getItem(key) || '');
        } catch {
          data[cleanKey] = localStorage.getItem(key);
        }
      }
    }
    return JSON.stringify(data, null, 2);
  }

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString) as Record<string, unknown>;
      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value);
      });
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  getStorageSize(): { used: number; available: number } {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        used += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16 = 2 bytes per char
      }
    }
    // localStorage typically has a 5MB limit
    const available = 5 * 1024 * 1024;
    return { used, available };
  }
}
