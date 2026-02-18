import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SettingsService } from './settings.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { DEFAULT_SETTINGS } from '../models';

const mockStorage = { get: jest.fn(), set: jest.fn() };
const mockAuthService = { isAuthenticated: jest.fn() };
const mockToastService = { error: jest.fn(), success: jest.fn() };

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    jest.clearAllMocks();
    // Empty storage → service merges with DEFAULT_SETTINGS
    mockStorage.get.mockReturnValue({});
    mockAuthService.isAuthenticated.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SettingsService,
        { provide: StorageService, useValue: mockStorage },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
      ],
    });

    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------------------------------------------------------------------------
  // Initial state (defaults)
  // ---------------------------------------------------------------------------
  describe('initial state', () => {
    it('loads DEFAULT_SETTINGS when storage is empty', () => {
      expect(service.settings()).toEqual(DEFAULT_SETTINGS);
    });

    it('weightUnit defaults to kg', () => {
      expect(service.weightUnit()).toBe('kg');
    });

    it('measurementUnit defaults to cm', () => {
      expect(service.measurementUnit()).toBe('cm');
    });

    it('theme defaults to system', () => {
      expect(service.theme()).toBe('system');
    });

    it('defaultRestTimer defaults to 90 seconds', () => {
      expect(service.defaultRestTimer()).toBe(90);
    });

    it('merges stored partial settings with defaults', () => {
      // Simulate a stored setting that overrides only weightUnit
      mockStorage.get.mockReturnValue({ weightUnit: 'lbs' });

      // Re-create the service to pick up the new mock return value
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          SettingsService,
          { provide: StorageService, useValue: mockStorage },
          { provide: AuthService, useValue: mockAuthService },
          { provide: ToastService, useValue: mockToastService },
        ],
      });
      const svc = TestBed.inject(SettingsService);
      TestBed.inject(HttpTestingController).verify();

      expect(svc.weightUnit()).toBe('lbs');
      expect(svc.measurementUnit()).toBe('cm'); // still default
    });
  });

  // ---------------------------------------------------------------------------
  // convertWeight
  // ---------------------------------------------------------------------------
  describe('convertWeight', () => {
    it('returns the same value when from and to units match (kg)', () => {
      expect(service.convertWeight(100, 'kg', 'kg')).toBe(100);
    });

    it('returns the same value when from and to units match (lbs)', () => {
      expect(service.convertWeight(225, 'lbs', 'lbs')).toBe(225);
    });

    it('converts kg to lbs correctly', () => {
      expect(service.convertWeight(100, 'kg', 'lbs')).toBeCloseTo(220.462, 2);
    });

    it('converts lbs to kg correctly', () => {
      expect(service.convertWeight(220.462, 'lbs', 'kg')).toBeCloseTo(100, 2);
    });

    it('handles zero correctly', () => {
      expect(service.convertWeight(0, 'kg', 'lbs')).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // convertMeasurement
  // ---------------------------------------------------------------------------
  describe('convertMeasurement', () => {
    it('returns the same value when units match', () => {
      expect(service.convertMeasurement(180, 'cm', 'cm')).toBe(180);
    });

    it('converts cm to inches correctly', () => {
      expect(service.convertMeasurement(2.54, 'cm', 'in')).toBeCloseTo(1, 5);
    });

    it('converts inches to cm correctly', () => {
      expect(service.convertMeasurement(1, 'in', 'cm')).toBeCloseTo(2.54, 5);
    });

    it('handles a standard height conversion (180 cm → ~70.9 in)', () => {
      expect(service.convertMeasurement(180, 'cm', 'in')).toBeCloseTo(70.87, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // formatWeight
  // ---------------------------------------------------------------------------
  describe('formatWeight', () => {
    it('formats weight with unit by default (kg)', () => {
      expect(service.formatWeight(100)).toBe('100 kg');
    });

    it('rounds to 1 decimal place', () => {
      expect(service.formatWeight(99.99)).toBe('100 kg');
    });

    it('preserves 1 decimal when not rounded away', () => {
      expect(service.formatWeight(75.5)).toBe('75.5 kg');
    });

    it('omits unit when includeUnit is false', () => {
      expect(service.formatWeight(75.5, false)).toBe('75.5');
    });
  });

  // ---------------------------------------------------------------------------
  // formatMeasurement
  // ---------------------------------------------------------------------------
  describe('formatMeasurement', () => {
    it('formats measurement with unit by default (cm)', () => {
      expect(service.formatMeasurement(180)).toBe('180 cm');
    });

    it('omits unit when includeUnit is false', () => {
      expect(service.formatMeasurement(180, false)).toBe('180');
    });

    it('rounds to 1 decimal place', () => {
      expect(service.formatMeasurement(180.049)).toBe('180 cm');
    });
  });

  // ---------------------------------------------------------------------------
  // setDefaultRestTimer
  // ---------------------------------------------------------------------------
  describe('setDefaultRestTimer', () => {
    it('updates the rest timer to the given value', () => {
      service.setDefaultRestTimer(120);
      expect(service.defaultRestTimer()).toBe(120);
    });

    it('clamps negative values to 0', () => {
      service.setDefaultRestTimer(-30);
      expect(service.defaultRestTimer()).toBe(0);
    });

    it('allows 0 (disabled timer)', () => {
      service.setDefaultRestTimer(0);
      expect(service.defaultRestTimer()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getSelectedBarbellWeight
  // ---------------------------------------------------------------------------
  describe('getSelectedBarbellWeight', () => {
    it('returns 20 kg for olympic barbell with kg unit (default)', () => {
      expect(service.getSelectedBarbellWeight()).toBe(20);
    });

    it("returns 15 kg for women's olympic barbell", () => {
      service.updateSettings({
        plateCalculator: {
          ...DEFAULT_SETTINGS.plateCalculator,
          selectedBarbell: 'womens',
        },
      });
      expect(service.getSelectedBarbellWeight()).toBe(15);
    });

    it('returns the custom kg weight when custom barbell is selected', () => {
      service.updateSettings({
        plateCalculator: {
          ...DEFAULT_SETTINGS.plateCalculator,
          selectedBarbell: 'custom',
          customBarbellWeightKg: 12.5,
        },
      });
      expect(service.getSelectedBarbellWeight()).toBe(12.5);
    });

    it('returns 45 lbs for olympic barbell when unit is lbs', () => {
      service.updateSettings({
        weightUnit: 'lbs',
        plateCalculator: {
          ...DEFAULT_SETTINGS.plateCalculator,
          selectedBarbell: 'olympic',
        },
      });
      expect(service.getSelectedBarbellWeight()).toBe(45);
    });
  });

  // ---------------------------------------------------------------------------
  // getAvailablePlates
  // ---------------------------------------------------------------------------
  describe('getAvailablePlates', () => {
    it('returns only available plates', () => {
      service.updateSettings({
        plateCalculator: {
          ...DEFAULT_SETTINGS.plateCalculator,
          availablePlatesKg: [
            { weight: 20, available: true },
            { weight: 10, available: false },
            { weight: 5, available: true },
          ],
        },
      });
      const plates = service.getAvailablePlates();
      expect(plates).toContain(20);
      expect(plates).toContain(5);
      expect(plates).not.toContain(10);
    });

    it('returns plates sorted in descending order', () => {
      const plates = service.getAvailablePlates();
      for (let i = 0; i < plates.length - 1; i++) {
        expect(plates[i]).toBeGreaterThanOrEqual(plates[i + 1]);
      }
    });

    it('returns an empty array when all plates are unavailable', () => {
      service.updateSettings({
        plateCalculator: {
          ...DEFAULT_SETTINGS.plateCalculator,
          availablePlatesKg: [
            { weight: 20, available: false },
            { weight: 10, available: false },
          ],
        },
      });
      expect(service.getAvailablePlates()).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // resetToDefaults
  // ---------------------------------------------------------------------------
  describe('resetToDefaults', () => {
    it('resets all settings back to DEFAULT_SETTINGS', () => {
      service.updateSettings({ weightUnit: 'lbs', defaultRestTimer: 60 });
      expect(service.weightUnit()).toBe('lbs');

      service.resetToDefaults();

      expect(service.settings()).toEqual(DEFAULT_SETTINGS);
    });
  });
});
