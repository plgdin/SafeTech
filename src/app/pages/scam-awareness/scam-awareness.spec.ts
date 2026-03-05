import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScamAwarenessComponent } from './scam-awareness';
import { SupabaseService } from '../../core/services/supabase';

describe('ScamAwarenessComponent', () => {
  let component: ScamAwarenessComponent;
  let fixture: ComponentFixture<ScamAwarenessComponent>;
  let mockSupabaseService: any;

  beforeEach(async () => {
    // Replaced the Jasmine spy with a standard JS Promise. 
    // This compiles everywhere and prevents DB writes during tests.
    mockSupabaseService = {
      getScams: () => Promise.resolve({ data: [], error: null })
    };

    await TestBed.configureTestingModule({
      imports: [ScamAwarenessComponent], 
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScamAwarenessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});