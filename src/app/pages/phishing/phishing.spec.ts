import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhishingComponent } from './phishing';
import { SupabaseService } from '../../core/services/supabase';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PhishingComponent', () => {
  let component: PhishingComponent;
  let fixture: ComponentFixture<PhishingComponent>;
  
  // Using Vitest's superior 'vi' mocking engine
  let mockSupabaseService = {
    checkPhishingUrl: vi.fn(),
    submitReport: vi.fn()
  };

  beforeEach(async () => {
    // Resetting mocks for clean state per test
    mockSupabaseService.checkPhishingUrl.mockResolvedValue({ isSafe: true, details: 'Safe' });
    mockSupabaseService.submitReport.mockResolvedValue({ error: null });

    await TestBed.configureTestingModule({
      imports: [PhishingComponent],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhishingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the URL Safeguard component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with System Idle status', () => {
    expect(component.scanStatus).toBe('System Idle');
  });

  // Demo Specific Test: Verifying the Forensic Audit Trail
  it('should trigger forensic audit logging', async () => {
    component.result = { isSafe: false, details: 'Phishing', score: 98, reasons: ['Typosquatting'] };
    component.generateForensicReport();
    expect(component.scanStatus).toBe('Generating Forensic Audit...');
  });
});