import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditingComponent } from './auditing'; // Fix: Match exported class name
import { SupabaseService } from '../../core/services/supabase';
import { ChangeDetectorRef } from '@angular/core';

describe('AuditingComponent', () => {
  let component: AuditingComponent;
  let fixture: ComponentFixture<AuditingComponent>;

  beforeEach(async () => {
    // Mock SupabaseService to prevent real DB calls during testing
    const mockSupabaseService = {
      submitReport: () => Promise.resolve({ error: null }),
      getReportStatus: () => Promise.resolve({ data: { status: 'pending' }, error: null })
    };

    await TestBed.configureTestingModule({
      imports: [AuditingComponent], // Standalone component
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        ChangeDetectorRef
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});